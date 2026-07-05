import math
from collections import defaultdict
from datetime import date
from decimal import Decimal

# Largest quantity a single submission may contribute. Anything above this is a
# junk/overflow entry (e.g. a thousand-digit number) and is rejected outright so
# it can never overflow to inf and break JSON serialization of scores.
MAX_QUANTITY = 1e9

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Completion, NameVisibility, Room, ScoreVisibility, Student, Task, TaskType
from app.schemas.common import CompletionEntryResponse, DailyResultResponse, LeaderboardRow, ProgressRow


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def _boolish(raw: str) -> bool:
    return raw.strip().lower() in {"yes", "y", "да", "д", "true", "1", "выполнено", "ok"}


def _round2(value: float) -> float:
    return round(float(value), 2)


def _parse_quantity(raw_value: str) -> float | None:
    try:
        value = float(raw_value)
    except (ValueError, OverflowError):
        return None
    if not math.isfinite(value) or abs(value) > MAX_QUANTITY:
        return None
    return value


def calculate_task_score(task: Task, raw_value: str) -> tuple[bool, float]:
    if task.type == TaskType.quantity:
        value = _parse_quantity(raw_value)
        if value is None:
            return False, 0.0
        target = _to_float(task.target)
        if value < target:
            return False, 0.0
        bonus_units = max(0.0, value - target)
        return True, _round2(task.points + bonus_units * task.bonus_per_unit)

    if task.type == TaskType.range:
        try:
            value = float(raw_value)
        except ValueError:
            return False, 0.0
        min_target = _to_float(task.target)
        max_target = _to_float(task.target_max)
        is_completed = min_target <= value <= max_target
        return is_completed, task.points if is_completed else 0.0

    if task.type == TaskType.yes_no:
        is_completed = _boolish(raw_value)
        return is_completed, task.points if is_completed else 0.0

    is_completed = bool(raw_value.strip())
    return is_completed, task.points if is_completed else 0.0


def display_name_for_student(student: Student, room: Room, current_student_id: int | None = None, position: int | None = None) -> str:
    if room.name_visibility == NameVisibility.real_names:
        return student.name
    if room.name_visibility == NameVisibility.aliases:
        return student.alias or student.name
    if room.name_visibility == NameVisibility.self_only and current_student_id == student.id:
        return student.name
    if room.name_visibility == NameVisibility.self_only:
        return f"Participant {position or student.id}"
    return f"Participant {position or student.id}"


def build_bonus_maps(db: Session, room: Room, today: date | None = None) -> tuple[dict[int, float], dict[int, float]]:
    today = today or date.today()
    required_task_ids = [task.id for task in room.tasks if task.is_active and task.is_required]
    if not required_task_ids or room.all_required_bonus_points <= 0:
        return {}, {}

    completions = db.scalars(
        select(Completion).where(Completion.room_id == room.id, Completion.task_id.in_(required_task_ids))
    ).all()
    grouped: dict[tuple[int, date], set[int]] = defaultdict(set)
    for completion in completions:
        if completion.is_completed:
            grouped[(completion.student_id, completion.date)].add(completion.task_id)

    total_bonus_by_student: dict[int, float] = defaultdict(float)
    today_bonus_by_student: dict[int, float] = defaultdict(float)
    required_count = len(required_task_ids)
    for (student_id, completion_date), completed_tasks in grouped.items():
        if len(completed_tasks) == required_count:
            total_bonus_by_student[student_id] += room.all_required_bonus_points
            if completion_date == today:
                today_bonus_by_student[student_id] += room.all_required_bonus_points

    return dict(total_bonus_by_student), dict(today_bonus_by_student)


def build_leaderboard(
    db: Session,
    room: Room,
    current_student_id: int | None = None,
    today: date | None = None,
    respect_visibility: bool = True,
) -> list[LeaderboardRow]:
    today = today or date.today()
    students = db.scalars(select(Student).where(Student.room_id == room.id).order_by(Student.name.asc())).all()
    if not students:
        return []

    total_rows = db.execute(
        select(Completion.student_id, func.coalesce(func.sum(Completion.points_earned), 0))
        .where(Completion.room_id == room.id)
        .group_by(Completion.student_id)
    ).all()
    totals = {student_id: float(total) for student_id, total in total_rows}

    today_rows = db.execute(
        select(Completion.student_id, func.coalesce(func.sum(Completion.points_earned), 0))
        .where(Completion.room_id == room.id, Completion.date == today)
        .group_by(Completion.student_id)
    ).all()
    today_totals = {student_id: float(total) for student_id, total in today_rows}

    completed_days_rows = db.execute(
        select(Completion.student_id, func.count(func.distinct(Completion.date)))
        .where(Completion.room_id == room.id)
        .group_by(Completion.student_id)
    ).all()
    completed_days = {student_id: int(days) for student_id, days in completed_days_rows}

    total_bonus_by_student, today_bonus_by_student = build_bonus_maps(db, room, today=today)
    rows: list[tuple[Student, float, float, int]] = [
        (
            student,
            totals.get(student.id, 0.0) + total_bonus_by_student.get(student.id, 0.0),
            today_totals.get(student.id, 0.0) + today_bonus_by_student.get(student.id, 0.0),
            completed_days.get(student.id, 0),
        )
        for student in students
    ]
    rows.sort(
        key=lambda item: (
            -item[1],
            item[0].last_submission_at.timestamp() if item[0].last_submission_at else float("inf"),
            -item[3],
            item[0].name.lower(),
        )
    )

    leaderboard: list[LeaderboardRow] = []
    for index, (student, total_points, today_points, days) in enumerate(rows, start=1):
        if not respect_visibility:
            exact_score_visible = True
        else:
            exact_score_visible = room.score_visibility == ScoreVisibility.all_scores
            if room.score_visibility == ScoreVisibility.hidden:
                exact_score_visible = current_student_id == student.id
            elif room.score_visibility == ScoreVisibility.self_only:
                exact_score_visible = current_student_id == student.id
            elif room.score_visibility == ScoreVisibility.places_only:
                exact_score_visible = False

        leaderboard.append(
            LeaderboardRow(
                student_id=student.id,
                position=index,
                display_name=display_name_for_student(student, room, current_student_id=current_student_id, position=index),
                total_points=_round2(total_points) if exact_score_visible else 0.0,
                today_points=_round2(today_points) if exact_score_visible else 0.0,
                completed_days=days,
                last_submission_at=student.last_submission_at,
                score_visible=exact_score_visible,
            )
        )

    return leaderboard


def get_student_daily_result(db: Session, room: Room, student: Student, result_date: date) -> DailyResultResponse:
    completions = db.scalars(
        select(Completion).where(
            Completion.room_id == room.id,
            Completion.student_id == student.id,
            Completion.date == result_date,
        )
    ).all()
    _, today_bonus_by_student = build_bonus_maps(db, room, today=result_date)
    bonus_points = today_bonus_by_student.get(student.id, 0.0)
    items = [
        CompletionEntryResponse(
            task_id=completion.task_id,
            task_name=completion.task.name,
            value=completion.value,
            is_completed=completion.is_completed,
            points_earned=completion.points_earned,
        )
        for completion in sorted(completions, key=lambda item: item.task.sort_order)
    ]
    if bonus_points > 0:
        items.append(
            CompletionEntryResponse(
                task_id=0,
                task_name="All required tasks bonus",
                value="AUTO",
                is_completed=True,
                points_earned=bonus_points,
            )
        )

    leaderboard = build_leaderboard(db, room, current_student_id=student.id, today=result_date, respect_visibility=False)
    rank = next((entry.position for entry in leaderboard if entry.student_id == student.id), 0)
    total_students = len(leaderboard)
    day_points = sum(item.points_earned for item in items)
    total_points = next((entry.total_points for entry in leaderboard if entry.student_id == student.id), 0.0)

    return DailyResultResponse(
        date=result_date,
        student_id=student.id,
        room_id=room.id,
        items=items,
        day_points=day_points,
        total_points=total_points,
        rank=rank,
        total_students=total_students,
        deadline=room.daily_deadline,
    )


def build_progress_rows(db: Session, room: Room, result_date: date, respect_visibility: bool = False) -> list[ProgressRow]:
    leaderboard = {
        item.student_id: item for item in build_leaderboard(db, room, today=result_date, respect_visibility=respect_visibility)
    }
    _, today_bonus_by_student = build_bonus_maps(db, room, today=result_date)
    completions = db.scalars(select(Completion).where(Completion.room_id == room.id, Completion.date == result_date)).all()
    grouped_answers: dict[int, dict[str, str]] = defaultdict(dict)
    grouped_points: dict[int, float] = defaultdict(float)

    for completion in completions:
        grouped_answers[completion.student_id][completion.task.name] = completion.value
        grouped_points[completion.student_id] += completion.points_earned

    rows: list[ProgressRow] = []
    for student in room.students:
        board_row = leaderboard.get(student.id)
        rows.append(
            ProgressRow(
                student_id=student.id,
                student_name=student.name,
                submitted=student.id in grouped_answers,
                day_points=grouped_points.get(student.id, 0.0) + today_bonus_by_student.get(student.id, 0.0),
                total_points=board_row.total_points if board_row else 0.0,
                answers=grouped_answers.get(student.id, {}),
            )
        )
    rows.sort(key=lambda row: (-row.day_points, row.student_name.lower()))
    return rows
