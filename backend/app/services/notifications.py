from collections.abc import Iterable
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import (
    Completion,
    Room,
    Student,
    StudentStatus,
    TelegramNotification,
    TelegramNotificationStatus,
    TelegramNotificationType,
)
from app.services.scoring import build_leaderboard, get_student_daily_result


def local_now() -> datetime:
    return datetime.now(ZoneInfo(settings.local_timezone))


def _parse_clock(value: str | None) -> time | None:
    if not value:
        return None
    hours, minutes = (int(chunk) for chunk in value.split(":"))
    return time(hour=hours, minute=minutes)


def _notification_candidate_times(room: Room, today: date) -> list[tuple[TelegramNotificationType, datetime]]:
    timezone = ZoneInfo(settings.local_timezone)
    candidates: list[tuple[TelegramNotificationType, datetime]] = []

    first = _parse_clock(room.first_reminder_time)
    if room.notifications_enabled and first is not None:
        candidates.append(
            (TelegramNotificationType.reminder_1, datetime.combine(today, first, tzinfo=timezone))
        )

    second = _parse_clock(room.second_reminder_time)
    if room.notifications_enabled and second is not None:
        candidates.append(
            (TelegramNotificationType.reminder_2, datetime.combine(today, second, tzinfo=timezone))
        )

    deadline = _parse_clock(room.daily_deadline)
    if room.notifications_enabled and room.send_daily_summary and deadline is not None:
        candidates.append(
            (TelegramNotificationType.daily_summary, datetime.combine(today, deadline, tzinfo=timezone))
        )

    return candidates


def _students_missing_submission(db: Session, room_id: int, today: date) -> set[int]:
    rows = db.execute(
        select(func.distinct(Completion.student_id)).where(
            Completion.room_id == room_id,
            Completion.date == today,
        )
    ).all()
    return {student_id for (student_id,) in rows}


def _build_reminder_message(room: Room) -> str:
    return (
        f'Reminder: you have not submitted today\'s tasks in "{room.name}" yet.\n'
        f'Editing stays open until {room.daily_deadline}.\n'
        "Use /tasks."
    )


def _build_daily_summary_message(db: Session, room: Room, student: Student, today: date) -> str:
    result = get_student_daily_result(db, room, student, today)
    leaderboard = build_leaderboard(db, room, current_student_id=student.id, today=today)
    current_index = next((index for index, row in enumerate(leaderboard) if row.student_id == student.id), None)
    gap_text = ""
    if current_index is not None and current_index > 0:
        higher_row = leaderboard[current_index - 1]
        gap = max(higher_row.total_points - result.total_points, 0)
        if gap > 0:
            gap_text = f"\nPoints to the next place: {gap}"
    return (
        "Daily summary:\n\n"
        f"Points today: {result.day_points}\n"
        f"Total score: {result.total_points}\n"
        f"Your place: {result.rank} of {result.total_students}\n"
        f"Room deadline: {room.daily_deadline}"
        f"{gap_text}"
    )


def _existing_notification_lookup(
    db: Session,
    room_id: int,
    student_ids: Iterable[int],
    notification_type: TelegramNotificationType,
    today: date,
) -> set[int]:
    ids = list(student_ids)
    if not ids:
        return set()
    rows = db.execute(
        select(TelegramNotification.student_id).where(
            TelegramNotification.room_id == room_id,
            TelegramNotification.type == notification_type,
            TelegramNotification.delivery_date == today,
            TelegramNotification.student_id.in_(ids),
        )
    ).all()
    return {student_id for (student_id,) in rows}


def dispatch_due_notifications(db: Session, now: datetime | None = None) -> list[TelegramNotification]:
    now = now or local_now()
    today = now.date()
    rooms = db.scalars(
        select(Room).where(
            or_(
                Room.notifications_enabled.is_(True),
                Room.send_daily_summary.is_(True),
            )
        )
    ).all()

    created: list[TelegramNotification] = []
    for room in rooms:
        candidates = [(kind, scheduled_for) for kind, scheduled_for in _notification_candidate_times(room, today) if scheduled_for <= now]
        if not candidates:
            continue

        students = db.scalars(
            select(Student).where(
                Student.room_id == room.id,
                Student.status == StudentStatus.active,
                Student.telegram_id.is_not(None),
                Student.telegram_id != "",
            )
        ).all()
        if not students:
            continue

        submitted_student_ids = _students_missing_submission(db, room.id, today)
        for notification_type, scheduled_for in candidates:
            target_students = students
            if notification_type in {TelegramNotificationType.reminder_1, TelegramNotificationType.reminder_2}:
                target_students = [student for student in students if student.id not in submitted_student_ids]

            existing = _existing_notification_lookup(
                db,
                room_id=room.id,
                student_ids=[student.id for student in target_students],
                notification_type=notification_type,
                today=today,
            )
            for student in target_students:
                if student.id in existing:
                    continue
                if notification_type == TelegramNotificationType.daily_summary:
                    message = _build_daily_summary_message(db, room, student, today)
                else:
                    message = _build_reminder_message(room)
                notification = TelegramNotification(
                    student_id=student.id,
                    room_id=room.id,
                    type=notification_type,
                    message=message,
                    scheduled_for=scheduled_for.replace(tzinfo=None),
                    delivery_date=today,
                    status=TelegramNotificationStatus.pending,
                )
                db.add(notification)
                created.append(notification)

    if created:
        db.commit()

    return db.scalars(
        select(TelegramNotification).where(
            TelegramNotification.delivery_date == today,
            TelegramNotification.scheduled_for <= now.replace(tzinfo=None),
            TelegramNotification.status.in_(
                [TelegramNotificationStatus.pending, TelegramNotificationStatus.failed]
            ),
        )
    ).all()


def mark_notification_delivery(
    db: Session,
    notification: TelegramNotification,
    status: TelegramNotificationStatus,
    error_message: str | None = None,
) -> TelegramNotification:
    notification.status = status
    notification.error_message = error_message
    notification.sent_at = datetime.utcnow() if status == TelegramNotificationStatus.sent else None
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
