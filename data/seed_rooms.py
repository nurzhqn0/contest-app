"""Seed 3 example rooms with tasks, students and ~2 weeks of completions.

Run inside the backend container:
    docker exec game-app-backend-1 python /app/data/seed_rooms.py

Idempotent-ish: aborts if any of the seeded room names already exist.
"""
import random
from datetime import date, datetime, timedelta

from app.db.session import SessionLocal
from app.models.entities import (
    Completion,
    Room,
    RoomStatus,
    Student,
    StudentStatus,
    Task,
    TaskType,
    LeaderboardVisibility,
    NameVisibility,
    ScoreVisibility,
)
from app.services.codegen import generate_room_code

random.seed(42)

ROOMS = [
    {
        "name": "Fitness Challenge — Cohort A",
        "description": "Daily fitness habits, morning group.",
        "students": ["Aigerim", "Bekzat", "Dana", "Yerlan", "Zhanel", "Timur"],
    },
    {
        "name": "Fitness Challenge — Cohort B",
        "description": "Daily fitness habits, evening group.",
        "students": ["Alua", "Nurlan", "Saltanat", "Daniyar", "Madina"],
    },
    {
        "name": "Fitness Challenge — Cohort C",
        "description": "Daily fitness habits, weekend group.",
        "students": ["Askar", "Gulnara", "Ruslan", "Aizhan", "Sanzhar", "Kamila"],
    },
]

# Same task structure across rooms so combined analytics is meaningful.
TASKS = [
    {"name": "Pushups", "type": TaskType.quantity, "target": 50, "target_max": None,
     "points": 10, "bonus_per_unit": 0.2, "is_required": True, "sort_order": 1},
    {"name": "Reading (min)", "type": TaskType.range, "target": 20, "target_max": 60,
     "points": 8, "bonus_per_unit": 0.0, "is_required": True, "sort_order": 2},
    {"name": "Water (glasses)", "type": TaskType.quantity, "target": 8, "target_max": None,
     "points": 5, "bonus_per_unit": 0.0, "is_required": False, "sort_order": 3},
    {"name": "Meditation", "type": TaskType.yes_no, "target": None, "target_max": None,
     "points": 5, "bonus_per_unit": 0.0, "is_required": False, "sort_order": 4},
]

DAYS = 12  # ending today


def unique_code(db) -> str:
    while True:
        code = generate_room_code()
        if not db.query(Room).filter(Room.room_code == code).first():
            return code


def make_numeric(task) -> float:
    if task["name"] == "Pushups":
        return max(0, round(random.gauss(48, 15)))
    if task["name"] == "Reading (min)":
        return max(0, round(random.gauss(35, 18)))
    if task["name"] == "Water (glasses)":
        return max(0, round(random.gauss(7, 2)))
    return 0


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Room).filter(Room.name.in_([r["name"] for r in ROOMS])).all()
        if existing:
            print("ABORT: these room names already exist:",
                  ", ".join(r.name for r in existing))
            return

        today = date.today()
        created = []

        for spec in ROOMS:
            room = Room(
                name=spec["name"],
                description=spec["description"],
                status=RoomStatus.active,
                room_code=unique_code(db),
                registration_enabled=True,
                public_access_enabled=True,
                leaderboard_visibility=LeaderboardVisibility.public,
                name_visibility=NameVisibility.real_names,
                score_visibility=ScoreVisibility.all_scores,
                all_required_bonus_points=5,
            )
            db.add(room)
            db.flush()  # room.id

            tasks = []
            for t in TASKS:
                task = Task(
                    room_id=room.id,
                    name=t["name"],
                    type=t["type"],
                    target=t["target"],
                    target_max=t["target_max"],
                    points=t["points"],
                    bonus_per_unit=t["bonus_per_unit"],
                    is_required=t["is_required"],
                    is_active=True,
                    sort_order=t["sort_order"],
                )
                db.add(task)
                tasks.append((task, t))
            db.flush()

            students = []
            for i, name in enumerate(spec["students"]):
                st = Student(
                    room_id=room.id,
                    name=name,
                    alias=f"{name.lower()}{i+1}",
                    status=StudentStatus.active,
                )
                db.add(st)
                students.append(st)
            db.flush()

            n_completions = 0
            for st in students:
                last_sub = None
                for d in range(DAYS):
                    day = today - timedelta(days=DAYS - 1 - d)
                    if random.random() > 0.82:  # ~18% of days skipped entirely
                        continue
                    for task, meta in tasks:
                        if random.random() > 0.9 and not meta["is_required"]:
                            continue  # sometimes skip optional tasks
                        if task.type == TaskType.yes_no:
                            done = random.random() < 0.72
                            value = "yes" if done else "no"
                            is_completed = done
                            pts = task.points if done else 0
                        else:
                            num = make_numeric(meta)
                            value = str(num)
                            target = float(meta["target"] or 0)
                            is_completed = num >= target
                            pts = 0.0
                            if is_completed:
                                pts = task.points
                                if meta["bonus_per_unit"]:
                                    pts += max(0.0, (num - target) * meta["bonus_per_unit"])
                        db.add(Completion(
                            student_id=st.id,
                            room_id=room.id,
                            task_id=task.id,
                            date=day,
                            value=value,
                            is_completed=is_completed,
                            points_earned=round(pts, 2),
                            submitted_via="seed",
                        ))
                        n_completions += 1
                        last_sub = datetime.utcnow()
                if last_sub:
                    st.last_submission_at = last_sub

            created.append((room, len(students), n_completions))

        db.commit()
        print("Seed complete:")
        for room, ns, nc in created:
            print(f"  #{room.id} {room.name}  code={room.room_code}  "
                  f"students={ns}  completions={nc}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
