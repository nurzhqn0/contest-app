from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.entities import (
    Completion,
    Room,
    RoomStatus,
    Student,
    StudentStatus,
    TelegramNotification,
)
from app.schemas.common import (
    BotRegistrationRequest,
    BotRegistrationResponse,
    BotRoomSummary,
    BotRoomValidateRequest,
    BotTaskPrompt,
    CompletionSubmitRequest,
    DailyResultResponse,
    NotificationDeliveryUpdate,
    NotificationDispatchResponse,
)
from app.services.notifications import dispatch_due_notifications, mark_notification_delivery
from app.services.scoring import build_leaderboard, calculate_task_score, get_student_daily_result
from app.websocket.manager import room_socket_manager

router = APIRouter(prefix="/bot", tags=["bot"])


def _get_room_by_code(db: Session, room_code: str) -> Room:
    room = db.scalar(select(Room).where(Room.room_code == room_code.upper()).options(selectinload(Room.tasks)))
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def _assert_bot_registration_allowed(room: Room) -> None:
    if room.status == RoomStatus.archived:
        raise HTTPException(status_code=400, detail="Registration is disabled for archived rooms")
    if not room.registration_enabled:
        raise HTTPException(status_code=400, detail="Registration is disabled for this room")


def _get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.scalar(select(Student).where(Student.id == student_id).options(selectinload(Student.room)))
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _deadline_passed(room: Room, result_date: date) -> bool:
    hours, minutes = (int(chunk) for chunk in room.daily_deadline.split(":"))
    deadline_dt = datetime.combine(result_date, datetime.min.time()).replace(hour=hours, minute=minutes)
    return datetime.now() > deadline_dt


async def _broadcast_room(db: Session, room_id: int) -> None:
    room = db.scalar(select(Room).where(Room.id == room_id).options(selectinload(Room.students)))
    if room is None:
        return
    leaderboard = build_leaderboard(db, room)
    await room_socket_manager.broadcast(
        room_id,
        {"type": "leaderboard.updated", "roomId": room_id, "payload": [row.model_dump(mode="json") for row in leaderboard]},
    )


@router.post("/rooms/validate", response_model=BotRoomSummary)
def validate_room(payload: BotRoomValidateRequest, db: Session = Depends(get_db)) -> BotRoomSummary:
    room = _get_room_by_code(db, payload.room_code)
    _assert_bot_registration_allowed(room)
    return BotRoomSummary(room_id=room.id, room_name=room.name, room_code=room.room_code, status=room.status)


@router.post("/register", response_model=BotRegistrationResponse)
def register(payload: BotRegistrationRequest, db: Session = Depends(get_db)) -> BotRegistrationResponse:
    room = _get_room_by_code(db, payload.room_code)
    _assert_bot_registration_allowed(room)

    existing = db.scalar(
        select(Student).where(Student.room_id == room.id, Student.telegram_id == payload.telegram_id)
    )
    if existing:
        return BotRegistrationResponse(
            student=existing,
            room=room,
            already_registered=True,
        )

    student = Student(
        room_id=room.id,
        name=payload.name,
        alias=payload.alias,
        telegram_id=payload.telegram_id,
        telegram_username=payload.telegram_username,
        is_registered_in_telegram=True,
        status=StudentStatus.active,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return BotRegistrationResponse(student=student, room=room)


@router.get("/telegram/{telegram_id}/rooms", response_model=list[BotRoomSummary])
def get_student_rooms(telegram_id: str, db: Session = Depends(get_db)) -> list[BotRoomSummary]:
    students = db.scalars(select(Student).where(Student.telegram_id == telegram_id).options(selectinload(Student.room))).all()
    return [
        BotRoomSummary(
            room_id=student.room.id,
            room_name=student.room.name,
            room_code=student.room.room_code,
            status=student.room.status,
        )
        for student in students
    ]


@router.get("/telegram/{telegram_id}/room/{room_id}/student")
def get_room_student(telegram_id: str, room_id: int, db: Session = Depends(get_db)):
    student = db.scalar(
        select(Student).where(Student.telegram_id == telegram_id, Student.room_id == room_id).options(selectinload(Student.room))
    )
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"student_id": student.id, "name": student.name, "room_name": student.room.name}


@router.get("/students/{student_id}/tasks/today", response_model=BotTaskPrompt)
def today_tasks(student_id: int, db: Session = Depends(get_db)) -> BotTaskPrompt:
    student = _get_student_or_404(db, student_id)
    room = db.scalar(select(Room).where(Room.id == student.room_id).options(selectinload(Room.tasks)))
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    active_tasks = [item for item in sorted(room.tasks, key=lambda task: (task.sort_order, task.id)) if item.is_active]
    return BotTaskPrompt(
        room=BotRoomSummary(room_id=room.id, room_name=room.name, room_code=room.room_code, status=room.status),
        date=date.today(),
        deadline=room.daily_deadline,
        can_edit=not _deadline_passed(room, date.today()),
        tasks=active_tasks,
    )


@router.post("/students/{student_id}/submissions", response_model=DailyResultResponse)
async def submit_today(
    student_id: int,
    payload: CompletionSubmitRequest,
    db: Session = Depends(get_db),
) -> DailyResultResponse:
    student = _get_student_or_404(db, student_id)
    room = db.scalar(select(Room).where(Room.id == student.room_id).options(selectinload(Room.tasks)))
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    if _deadline_passed(room, payload.date):
        raise HTTPException(status_code=400, detail=f"Editing is available until {room.daily_deadline}")

    task_map = {task.id: task for task in room.tasks if task.is_active}
    for answer in payload.answers:
        task = task_map.get(answer.task_id)
        if task is None:
            raise HTTPException(status_code=400, detail=f"Task {answer.task_id} is not available in this room")
        completion = db.scalar(
            select(Completion).where(
                Completion.student_id == student.id,
                Completion.task_id == task.id,
                Completion.date == payload.date,
            )
        )
        is_completed, points_earned = calculate_task_score(task, answer.value)
        if completion is None:
            completion = Completion(
                student_id=student.id,
                room_id=room.id,
                task_id=task.id,
                date=payload.date,
                value=answer.value,
                is_completed=is_completed,
                points_earned=points_earned,
                submitted_via=payload.submitted_via,
            )
        else:
            completion.value = answer.value
            completion.is_completed = is_completed
            completion.points_earned = points_earned
            completion.submitted_via = payload.submitted_via
        db.add(completion)

    student.last_submission_at = datetime.utcnow()
    db.add(student)
    db.commit()

    await _broadcast_room(db, room.id)
    return get_student_daily_result(db, room, student, payload.date)


@router.get("/students/{student_id}/result/today", response_model=DailyResultResponse)
def result_today(student_id: int, db: Session = Depends(get_db)) -> DailyResultResponse:
    student = _get_student_or_404(db, student_id)
    room = db.scalar(select(Room).where(Room.id == student.room_id))
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return get_student_daily_result(db, room, student, date.today())


@router.get("/students/{student_id}/rank")
def rank(student_id: int, db: Session = Depends(get_db)) -> dict:
    student = _get_student_or_404(db, student_id)
    room = db.scalar(select(Room).where(Room.id == student.room_id))
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    leaderboard = build_leaderboard(db, room, current_student_id=student.id)
    entry = next((row for row in leaderboard if row.student_id == student.id), None)
    if entry is None:
        raise HTTPException(status_code=404, detail="Student not found in leaderboard")
    return {
        "position": entry.position,
        "total_students": len(leaderboard),
        "total_points": entry.total_points,
        "today_points": entry.today_points,
        "display_name": entry.display_name,
    }


@router.post("/notifications/dispatch", response_model=list[NotificationDispatchResponse])
def dispatch_notifications(db: Session = Depends(get_db)) -> list[NotificationDispatchResponse]:
    notifications = dispatch_due_notifications(db)
    if not notifications:
        return []

    student_ids = {notification.student_id for notification in notifications}
    students = db.scalars(select(Student).where(Student.id.in_(student_ids))).all()
    student_map = {student.id: student for student in students}
    return [
        NotificationDispatchResponse(
            notification_id=notification.id,
            student_id=notification.student_id,
            room_id=notification.room_id,
            telegram_id=student_map[notification.student_id].telegram_id or "",
            telegram_username=student_map[notification.student_id].telegram_username,
            type=notification.type,
            message=notification.message,
        )
        for notification in notifications
        if notification.student_id in student_map and student_map[notification.student_id].telegram_id
    ]


@router.post("/notifications/{notification_id}/delivery")
def update_notification_delivery(
    notification_id: int,
    payload: NotificationDeliveryUpdate,
    db: Session = Depends(get_db),
) -> dict:
    notification = db.scalar(select(TelegramNotification).where(TelegramNotification.id == notification_id))
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    updated = mark_notification_delivery(db, notification, payload.status, payload.error_message)
    return {"notification_id": updated.id, "status": updated.status.value}
