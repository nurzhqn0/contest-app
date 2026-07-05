from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_organizer
from app.db.session import get_db
from app.models.entities import Completion, Punishment, Room, Student, Task
from app.schemas.common import (
    LeaderboardRow,
    MultiRoomAnalyticsResponse,
    ProgressRow,
    RoomAnalyticsResponse,
    PunishmentCreate,
    PunishmentResponse,
    PunishmentUpdate,
    RoomCreate,
    RoomResponse,
    RoomUpdate,
    StudentCreate,
    StudentResponse,
    StudentUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services.analytics import build_multi_room_analytics, build_room_analytics
from app.services.codegen import generate_room_code
from app.services.exporter import export_multi_room_to_workbook, export_room_to_workbook
from app.services.scoring import build_bonus_maps, build_leaderboard, build_progress_rows
from app.websocket.manager import room_socket_manager

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _room_response(room: Room) -> RoomResponse:
    return RoomResponse.model_validate(room, from_attributes=True).model_copy(
        update={"tasks_count": len(room.tasks), "students_count": len(room.students)}
    )


def _ensure_unique_room_code(db: Session, room_code: str) -> None:
    exists = db.scalar(select(Room.id).where(Room.room_code == room_code.upper()))
    if exists:
        raise HTTPException(status_code=400, detail="Room code already exists")


def _get_room_or_404(db: Session, room_id: int) -> Room:
    room = db.scalar(
        select(Room)
        .where(Room.id == room_id)
        .options(
            selectinload(Room.tasks),
            selectinload(Room.students),
            selectinload(Room.punishments),
        )
    )
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


async def _broadcast_leaderboard(db: Session, room_id: int) -> None:
    room = _get_room_or_404(db, room_id)
    leaderboard = build_leaderboard(db, room, respect_visibility=False)
    await room_socket_manager.broadcast(
        room_id,
        {"type": "leaderboard.updated", "roomId": room_id, "payload": [row.model_dump(mode="json") for row in leaderboard]},
    )


@router.get("", response_model=list[RoomResponse])
def list_rooms(db: Session = Depends(get_db), _current_organizer=Depends(get_current_organizer)) -> list[RoomResponse]:
    rooms = db.scalars(
        select(Room)
        .options(selectinload(Room.tasks), selectinload(Room.students))
        .order_by(Room.created_at.desc())
    ).all()
    return [_room_response(room) for room in rooms]


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> RoomResponse:
    room_code = (payload.room_code or generate_room_code()).upper()
    while db.scalar(select(Room.id).where(Room.room_code == room_code)):
        room_code = generate_room_code()
    room = Room(**payload.model_dump(exclude={"room_code"}), room_code=room_code)
    db.add(room)
    db.commit()
    db.refresh(room)
    return _room_response(room)


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db), _current_organizer=Depends(get_current_organizer)) -> RoomResponse:
    return _room_response(_get_room_or_404(db, room_id))


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> RoomResponse:
    room = _get_room_or_404(db, room_id)
    data = payload.model_dump()
    requested_code = (data.get("room_code") or room.room_code).upper()
    if requested_code != room.room_code:
        _ensure_unique_room_code(db, requested_code)
    data["room_code"] = requested_code
    for field, value in data.items():
        setattr(room, field, value)
    db.add(room)
    db.commit()
    db.refresh(room)
    return _room_response(room)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    room = _get_room_or_404(db, room_id)
    db.delete(room)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{room_id}/tasks", response_model=list[TaskResponse])
def list_tasks(room_id: int, db: Session = Depends(get_db), _current_organizer=Depends(get_current_organizer)) -> list[Task]:
    _get_room_or_404(db, room_id)
    return db.scalars(select(Task).where(Task.room_id == room_id).order_by(Task.sort_order.asc(), Task.id.asc())).all()


@router.post("/{room_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    room_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Task:
    _get_room_or_404(db, room_id)
    task = Task(room_id=room_id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    await _broadcast_leaderboard(db, room_id)
    return task


@router.put("/{room_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    room_id: int,
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Task:
    _get_room_or_404(db, room_id)
    task = db.scalar(select(Task).where(Task.id == task_id, Task.room_id == room_id))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in payload.model_dump().items():
        setattr(task, field, value)
    db.add(task)
    db.commit()
    db.refresh(task)
    await _broadcast_leaderboard(db, room_id)
    return task


@router.delete("/{room_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    room_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    _get_room_or_404(db, room_id)
    task = db.scalar(select(Task).where(Task.id == task_id, Task.room_id == room_id))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    await _broadcast_leaderboard(db, room_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{room_id}/students", response_model=list[StudentResponse])
def list_students(room_id: int, db: Session = Depends(get_db), _current_organizer=Depends(get_current_organizer)) -> list[StudentResponse]:
    room = _get_room_or_404(db, room_id)
    students = db.scalars(select(Student).where(Student.room_id == room_id).order_by(Student.created_at.desc())).all()
    totals = dict(
        db.execute(
            select(Completion.student_id, func.coalesce(func.sum(Completion.points_earned), 0))
            .where(Completion.room_id == room_id)
            .group_by(Completion.student_id)
        ).all()
    )
    total_bonus_by_student, _ = build_bonus_maps(db, room)
    return [
        StudentResponse.model_validate(student, from_attributes=True).model_copy(
            update={"total_score": round(float(totals.get(student.id, 0)) + total_bonus_by_student.get(student.id, 0.0), 2)}
        )
        for student in students
    ]


@router.post("/{room_id}/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    room_id: int,
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> StudentResponse:
    _get_room_or_404(db, room_id)
    student = Student(room_id=room_id, **payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student, from_attributes=True)


@router.put("/{room_id}/students/{student_id}", response_model=StudentResponse)
def update_student(
    room_id: int,
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> StudentResponse:
    _get_room_or_404(db, room_id)
    student = db.scalar(select(Student).where(Student.room_id == room_id, Student.id == student_id))
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in payload.model_dump().items():
        setattr(student, field, value)
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student, from_attributes=True)


@router.delete("/{room_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    room_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    _get_room_or_404(db, room_id)
    student = db.scalar(select(Student).where(Student.room_id == room_id, Student.id == student_id))
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{room_id}/leaderboard", response_model=list[LeaderboardRow])
def room_leaderboard(
    room_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> list[LeaderboardRow]:
    room = _get_room_or_404(db, room_id)
    return build_leaderboard(db, room, respect_visibility=False)


@router.get("/{room_id}/progress", response_model=list[ProgressRow])
def room_progress(
    room_id: int,
    progress_date: date | None = None,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> list[ProgressRow]:
    room = _get_room_or_404(db, room_id)
    return build_progress_rows(db, room, progress_date or date.today(), respect_visibility=False)


@router.get("/analytics/aggregate", response_model=MultiRoomAnalyticsResponse)
def multi_room_analytics(
    room_ids: list[int] = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> MultiRoomAnalyticsResponse:
    rooms = [_get_room_or_404(db, rid) for rid in room_ids]
    return build_multi_room_analytics(db, rooms)


@router.get("/analytics/aggregate/export")
def multi_room_export(
    room_ids: list[int] = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    rooms = [_get_room_or_404(db, rid) for rid in room_ids]
    buf = export_multi_room_to_workbook(db, rooms)
    filename = "combined-analytics.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/{room_id}/analytics", response_model=RoomAnalyticsResponse)
def room_analytics(
    room_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> RoomAnalyticsResponse:
    room = _get_room_or_404(db, room_id)
    return build_room_analytics(db, room)


@router.get("/{room_id}/punishments", response_model=list[PunishmentResponse])
def list_punishments(
    room_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> list[Punishment]:
    _get_room_or_404(db, room_id)
    return db.scalars(select(Punishment).where(Punishment.room_id == room_id).order_by(Punishment.assigned_at.desc())).all()


@router.post("/{room_id}/punishments", response_model=PunishmentResponse, status_code=status.HTTP_201_CREATED)
async def create_punishment(
    room_id: int,
    payload: PunishmentCreate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Punishment:
    _get_room_or_404(db, room_id)
    student = db.scalar(select(Student).where(Student.id == payload.student_id, Student.room_id == room_id))
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    punishment = Punishment(room_id=room_id, **payload.model_dump())
    if punishment.status.value == "completed":
        punishment.completed_at = datetime.utcnow()
    db.add(punishment)
    db.commit()
    db.refresh(punishment)
    await _broadcast_leaderboard(db, room_id)
    return punishment


@router.put("/{room_id}/punishments/{punishment_id}", response_model=PunishmentResponse)
async def update_punishment(
    room_id: int,
    punishment_id: int,
    payload: PunishmentUpdate,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Punishment:
    _get_room_or_404(db, room_id)
    punishment = db.scalar(select(Punishment).where(Punishment.id == punishment_id, Punishment.room_id == room_id))
    if punishment is None:
        raise HTTPException(status_code=404, detail="Punishment not found")
    for field, value in payload.model_dump().items():
        setattr(punishment, field, value)
    punishment.completed_at = datetime.utcnow() if punishment.status.value == "completed" else None
    db.add(punishment)
    db.commit()
    db.refresh(punishment)
    await _broadcast_leaderboard(db, room_id)
    return punishment


@router.delete("/{room_id}/punishments/{punishment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_punishment(
    room_id: int,
    punishment_id: int,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    _get_room_or_404(db, room_id)
    punishment = db.scalar(select(Punishment).where(Punishment.id == punishment_id, Punishment.room_id == room_id))
    if punishment is None:
        raise HTTPException(status_code=404, detail="Punishment not found")
    db.delete(punishment)
    db.commit()
    await _broadcast_leaderboard(db, room_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{room_id}/export")
def export_room(
    room_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
    student_id: int | None = None,
    leaderboard_only: bool = False,
    progress_only: bool = False,
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> Response:
    room = _get_room_or_404(db, room_id)
    workbook = export_room_to_workbook(
        db=db,
        room=room,
        from_date=from_date,
        to_date=to_date,
        student_id=student_id,
        leaderboard_only=leaderboard_only,
        progress_only=progress_only,
    )
    filename = f"room_{room.room_code}_results_{date.today().isoformat()}.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(
        content=workbook.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
