from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import (
    LeaderboardVisibility,
    NameVisibility,
    PunishmentStatus,
    RoomStatus,
    ScoreVisibility,
    StudentStatus,
    TelegramNotificationStatus,
    TelegramNotificationType,
    TaskType,
)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class OrganizerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class RoomBase(BaseModel):
    name: str
    description: str = ""
    status: RoomStatus = RoomStatus.upcoming
    room_code: str | None = None
    registration_enabled: bool = True
    public_access_enabled: bool = False
    leaderboard_visibility: LeaderboardVisibility = LeaderboardVisibility.public
    name_visibility: NameVisibility = NameVisibility.real_names
    score_visibility: ScoreVisibility = ScoreVisibility.all_scores
    notifications_enabled: bool = False
    first_reminder_time: str | None = None
    second_reminder_time: str | None = None
    daily_deadline: str = "23:59"
    send_daily_summary: bool = False
    all_required_bonus_points: float = 0


class RoomCreate(RoomBase):
    pass


class RoomUpdate(RoomBase):
    pass


class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    tasks_count: int = 0
    students_count: int = 0


class DashboardResponse(BaseModel):
    total_rooms: int
    active_rooms: int
    total_students: int
    submitted_today: int
    missed_today: int
    top_students: list["LeaderboardRow"]
    recent_rooms: list[RoomResponse]


class TaskBase(BaseModel):
    name: str
    type: TaskType
    target: float | None = None
    target_max: float | None = None
    points: float = 0
    bonus_per_unit: float = 0
    is_required: bool = False
    is_active: bool = True
    sort_order: int = 0


class TaskCreate(TaskBase):
    pass


class TaskUpdate(TaskBase):
    pass


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    created_at: datetime
    updated_at: datetime


class StudentBase(BaseModel):
    name: str
    alias: str | None = None
    telegram_id: str | None = None
    telegram_username: str | None = None
    is_registered_in_telegram: bool = False
    status: StudentStatus = StudentStatus.active


class StudentCreate(StudentBase):
    pass


class StudentUpdate(StudentBase):
    pass


class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    created_at: datetime
    updated_at: datetime
    last_submission_at: datetime | None = None
    total_score: float = 0


class CompletionAnswer(BaseModel):
    task_id: int
    value: str


class CompletionSubmitRequest(BaseModel):
    date: dt_date = Field(default_factory=dt_date.today)
    submitted_via: str = "telegram"
    answers: list[CompletionAnswer]


class CompletionEntryResponse(BaseModel):
    task_id: int
    task_name: str
    value: str
    is_completed: bool
    points_earned: float


class DailyResultResponse(BaseModel):
    date: dt_date
    student_id: int
    room_id: int
    items: list[CompletionEntryResponse]
    day_points: float
    total_points: float
    rank: int
    total_students: int
    deadline: str


class ProgressRow(BaseModel):
    student_id: int
    student_name: str
    submitted: bool
    day_points: float
    total_points: float
    answers: dict[str, str]


class LeaderboardRow(BaseModel):
    student_id: int
    position: int
    display_name: str
    total_points: float
    today_points: float
    completed_days: int
    last_submission_at: datetime | None
    score_visible: bool = True


class PunishmentBase(BaseModel):
    student_id: int
    type: str
    reason: str = ""
    status: PunishmentStatus = PunishmentStatus.pending


class PunishmentCreate(PunishmentBase):
    pass


class PunishmentUpdate(PunishmentBase):
    pass


class PunishmentResponse(PunishmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    assigned_at: datetime
    completed_at: datetime | None


class PublicRoomLookupRequest(BaseModel):
    room_code: str


class PublicRoomResponse(BaseModel):
    id: int
    name: str
    description: str
    room_code: str
    status: RoomStatus
    leaderboard: list[LeaderboardRow]
    tasks: list[TaskResponse]


class BotRoomValidateRequest(BaseModel):
    room_code: str


class BotRegistrationRequest(BaseModel):
    room_code: str
    name: str
    alias: str | None = None
    telegram_id: str
    telegram_username: str | None = None


class BotRegistrationResponse(BaseModel):
    student: StudentResponse
    room: RoomResponse
    already_registered: bool = False


class BotRoomSummary(BaseModel):
    room_id: int
    room_name: str
    room_code: str
    status: RoomStatus


class BotTaskPrompt(BaseModel):
    room: BotRoomSummary
    date: dt_date
    deadline: str
    can_edit: bool
    tasks: list[TaskResponse]


class NotificationDispatchResponse(BaseModel):
    notification_id: int
    student_id: int
    room_id: int
    telegram_id: str
    telegram_username: str | None
    type: TelegramNotificationType
    message: str


class NotificationDeliveryUpdate(BaseModel):
    status: TelegramNotificationStatus
    error_message: str | None = None


DashboardResponse.model_rebuild()
