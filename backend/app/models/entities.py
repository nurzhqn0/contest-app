import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RoomStatus(str, enum.Enum):
    active = "active"
    upcoming = "upcoming"
    archived = "archived"


class TaskType(str, enum.Enum):
    quantity = "quantity"
    range = "range"
    yes_no = "yes_no"
    text = "text"


class StudentStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"


class NameVisibility(str, enum.Enum):
    real_names = "real_names"
    aliases = "aliases"
    self_only = "self_only"
    anonymous = "anonymous"


class ScoreVisibility(str, enum.Enum):
    all_scores = "all_scores"
    places_only = "places_only"
    self_only = "self_only"
    hidden = "hidden"


class LeaderboardVisibility(str, enum.Enum):
    public = "public"
    participants_only = "participants_only"
    hidden = "hidden"


class PunishmentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"


class TelegramNotificationType(str, enum.Enum):
    reminder_1 = "reminder_1"
    reminder_2 = "reminder_2"
    daily_summary = "daily_summary"


class TelegramNotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Organizer(TimestampMixin, Base):
    __tablename__ = "organizers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Room(TimestampMixin, Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[RoomStatus] = mapped_column(Enum(RoomStatus, native_enum=False), default=RoomStatus.upcoming)
    room_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    public_access_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    leaderboard_visibility: Mapped[LeaderboardVisibility] = mapped_column(
        Enum(LeaderboardVisibility, native_enum=False), default=LeaderboardVisibility.public
    )
    name_visibility: Mapped[NameVisibility] = mapped_column(
        Enum(NameVisibility, native_enum=False), default=NameVisibility.real_names
    )
    score_visibility: Mapped[ScoreVisibility] = mapped_column(
        Enum(ScoreVisibility, native_enum=False), default=ScoreVisibility.all_scores
    )
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    first_reminder_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    second_reminder_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    daily_deadline: Mapped[str] = mapped_column(String(5), default="23:59")
    send_daily_summary: Mapped[bool] = mapped_column(Boolean, default=False)
    all_required_bonus_points: Mapped[float] = mapped_column(Float, default=0)

    tasks: Mapped[list["Task"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    students: Mapped[list["Student"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    completions: Mapped[list["Completion"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    punishments: Mapped[list["Punishment"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    punishment_types: Mapped[list["PunishmentType"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[TaskType] = mapped_column(Enum(TaskType, native_enum=False))
    target: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    target_max: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    points: Mapped[float] = mapped_column(Float, default=0)
    bonus_per_unit: Mapped[float] = mapped_column(Float, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    room: Mapped["Room"] = relationship(back_populates="tasks")
    completions: Mapped[list["Completion"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class Student(TimestampMixin, Base):
    __tablename__ = "students"
    __table_args__ = (UniqueConstraint("room_id", "telegram_id", name="uq_students_room_telegram"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    alias: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telegram_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_registered_in_telegram: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[StudentStatus] = mapped_column(Enum(StudentStatus, native_enum=False), default=StudentStatus.active)
    last_submission_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    room: Mapped["Room"] = relationship(back_populates="students")
    completions: Mapped[list["Completion"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    punishments: Mapped[list["Punishment"]] = relationship(back_populates="student", cascade="all, delete-orphan")


class Completion(TimestampMixin, Base):
    __tablename__ = "completions"
    __table_args__ = (UniqueConstraint("student_id", "task_id", "date", name="uq_completion_student_task_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    value: Mapped[str] = mapped_column(String(255))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    points_earned: Mapped[float] = mapped_column(Float, default=0)
    submitted_via: Mapped[str] = mapped_column(String(50), default="telegram")

    student: Mapped["Student"] = relationship(back_populates="completions")
    room: Mapped["Room"] = relationship(back_populates="completions")
    task: Mapped["Task"] = relationship(back_populates="completions")


class PunishmentType(Base):
    __tablename__ = "punishment_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    room: Mapped["Room"] = relationship(back_populates="punishment_types")


class Punishment(TimestampMixin, Base):
    __tablename__ = "punishments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[PunishmentStatus] = mapped_column(
        Enum(PunishmentStatus, native_enum=False), default=PunishmentStatus.pending
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="punishments")
    room: Mapped["Room"] = relationship(back_populates="punishments")


class TelegramNotification(Base):
    __tablename__ = "telegram_notifications"
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "room_id",
            "type",
            "delivery_date",
            name="uq_telegram_notifications_student_room_type_date",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    type: Mapped[TelegramNotificationType] = mapped_column(Enum(TelegramNotificationType, native_enum=False))
    message: Mapped[str] = mapped_column(Text)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime, index=True)
    delivery_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[TelegramNotificationStatus] = mapped_column(
        Enum(TelegramNotificationStatus, native_enum=False), default=TelegramNotificationStatus.pending
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
