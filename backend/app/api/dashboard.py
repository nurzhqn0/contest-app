from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_organizer
from app.db.session import get_db
from app.models.entities import Completion, Room, RoomStatus, Student
from app.schemas.common import DashboardResponse, RoomResponse
from app.services.scoring import build_leaderboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardResponse)
def overview(
    db: Session = Depends(get_db),
    _current_organizer=Depends(get_current_organizer),
) -> DashboardResponse:
    today = date.today()
    rooms = db.scalars(select(Room).order_by(Room.created_at.desc())).all()
    total_rooms = len(rooms)
    active_rooms = sum(1 for room in rooms if room.status == RoomStatus.active)
    total_students = db.scalar(select(func.count(Student.id))) or 0
    submitted_today = db.scalar(select(func.count(func.distinct(Completion.student_id))).where(Completion.date == today)) or 0
    missed_today = max(total_students - submitted_today, 0)

    top_students = []
    for room in rooms[:3]:
        top_students.extend(build_leaderboard(db, room, respect_visibility=False)[:3])
    top_students.sort(key=lambda entry: (-entry.total_points, entry.display_name.lower()))

    recent_rooms = [
        RoomResponse.model_validate(
            room,
            from_attributes=True,
        ).model_copy(update={"tasks_count": len(room.tasks), "students_count": len(room.students)})
        for room in rooms[:5]
    ]

    return DashboardResponse(
        total_rooms=total_rooms,
        active_rooms=active_rooms,
        total_students=total_students,
        submitted_today=submitted_today,
        missed_today=missed_today,
        top_students=top_students[:5],
        recent_rooms=recent_rooms,
    )
