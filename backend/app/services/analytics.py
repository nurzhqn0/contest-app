from collections import defaultdict
from datetime import date, timedelta
from statistics import median as _median

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Completion, Room, Task, TaskType
from app.schemas.common import (
    DailyParticipation,
    MultiRoomAnalyticsResponse,
    MultiRoomSummary,
    RoomAnalyticsBlock,
    RoomAnalyticsResponse,
    StudentAnalytics,
    StudentTaskTotal,
    TaskAnalytics,
)

NUMERIC_TASK_TYPES = {TaskType.quantity, TaskType.range}
BONUS_TASK_NAME = "__bonus_all_required__"


def _parse_numeric(raw: str) -> float | None:
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _longest_streak(days: set[date]) -> int:
    if not days:
        return 0
    ordered = sorted(days)
    longest = 1
    current = 1
    for prev, curr in zip(ordered, ordered[1:]):
        if curr - prev == timedelta(days=1):
            current += 1
        else:
            current = 1
        longest = max(longest, current)
    return longest


def build_room_analytics(db: Session, room: Room) -> RoomAnalyticsResponse:
    tasks = db.scalars(
        select(Task).where(Task.room_id == room.id).order_by(Task.sort_order.asc(), Task.id.asc())
    ).all()
    tasks = [task for task in tasks if task.name != BONUS_TASK_NAME]
    task_map = {task.id: task for task in tasks}
    numeric_task_ids = [task.id for task in tasks if task.type in NUMERIC_TASK_TYPES]
    breakdown_task_ids = [
        task.id for task in tasks if task.type in NUMERIC_TASK_TYPES or task.type == TaskType.yes_no
    ]

    completions = db.scalars(select(Completion).where(Completion.room_id == room.id)).all()
    completions = [c for c in completions if c.task_id in task_map]

    # Per-task aggregation
    submissions_by_task: dict[int, int] = defaultdict(int)
    completed_by_task: dict[int, int] = defaultdict(int)
    values_by_task: dict[int, list[float]] = defaultdict(list)
    # Per-student aggregation
    days_by_student: dict[int, set[date]] = defaultdict(set)
    totals_by_student_task: dict[int, dict[int, float]] = defaultdict(lambda: defaultdict(float))
    best_entry_by_student: dict[int, float] = {}
    # Room-wide participation
    students_by_day: dict[date, set[int]] = defaultdict(set)

    for completion in completions:
        submissions_by_task[completion.task_id] += 1
        if completion.is_completed:
            completed_by_task[completion.task_id] += 1
        days_by_student[completion.student_id].add(completion.date)
        students_by_day[completion.date].add(completion.student_id)

        task = task_map[completion.task_id]
        if task.type in NUMERIC_TASK_TYPES:
            value = _parse_numeric(completion.value)
            if value is not None:
                values_by_task[completion.task_id].append(value)
                totals_by_student_task[completion.student_id][completion.task_id] += value
                prev = best_entry_by_student.get(completion.student_id)
                if prev is None or value > prev:
                    best_entry_by_student[completion.student_id] = value
        elif task.type == TaskType.yes_no and completion.is_completed:
            totals_by_student_task[completion.student_id][completion.task_id] += 1

    task_analytics: list[TaskAnalytics] = []
    for task in tasks:
        submissions = submissions_by_task.get(task.id, 0)
        completion_rate = (completed_by_task.get(task.id, 0) / submissions) if submissions else 0.0
        is_numeric = task.type in NUMERIC_TASK_TYPES
        yes_count = completed_by_task.get(task.id, 0) if task.type == TaskType.yes_no else None
        values = values_by_task.get(task.id, [])
        if is_numeric and values:
            total = sum(values)
            stats = {
                "total": total,
                "average": total / len(values),
                "maximum": max(values),
                "minimum": min(values),
                "median": float(_median(values)),
            }
        else:
            stats = {"total": None, "average": None, "maximum": None, "minimum": None, "median": None}
        task_analytics.append(
            TaskAnalytics(
                task_id=task.id,
                task_name=task.name,
                task_type=task.type,
                is_numeric=is_numeric,
                submissions=submissions,
                completion_rate=completion_rate,
                yes_count=yes_count,
                **stats,
            )
        )

    students = sorted(room.students, key=lambda student: student.name.lower())
    student_analytics: list[StudentAnalytics] = []
    for student in students:
        days = days_by_student.get(student.id, set())
        per_task = totals_by_student_task.get(student.id, {})
        student_analytics.append(
            StudentAnalytics(
                student_id=student.id,
                student_name=student.name,
                days_participated=len(days),
                longest_streak=_longest_streak(days),
                best_entry=best_entry_by_student.get(student.id),
                per_task_totals=[
                    StudentTaskTotal(task_id=task_id, total=per_task.get(task_id, 0.0))
                    for task_id in breakdown_task_ids
                ],
            )
        )

    daily_participation = [
        DailyParticipation(date=day, active_students=len(student_ids))
        for day, student_ids in sorted(students_by_day.items())
    ]

    return RoomAnalyticsResponse(
        total_distinct_days=len(students_by_day),
        numeric_task_ids=numeric_task_ids,
        breakdown_task_ids=breakdown_task_ids,
        tasks=task_analytics,
        students=student_analytics,
        daily_participation=daily_participation,
    )


def build_multi_room_analytics(db: Session, rooms: list[Room]) -> MultiRoomAnalyticsResponse:
    blocks = []
    all_days = set()
    total_students = 0
    for room in rooms:
        analytics = build_room_analytics(db, room)
        blocks.append(RoomAnalyticsBlock(room_id=room.id, room_name=room.name, analytics=analytics))
        total_students += len(room.students)
        for dp in analytics.daily_participation:
            all_days.add(dp.date)
    summary = MultiRoomSummary(room_count=len(rooms), total_students=total_students,
                               total_distinct_days=len(all_days))
    return MultiRoomAnalyticsResponse(summary=summary, rooms=blocks)
