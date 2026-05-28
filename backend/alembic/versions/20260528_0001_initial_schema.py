"""Initial schema"""

from alembic import op
import sqlalchemy as sa


revision = "20260528_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_organizers_username", "organizers", ["username"], unique=True)

    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("active", "upcoming", "archived", name="roomstatus", native_enum=False), nullable=False),
        sa.Column("room_code", sa.String(length=32), nullable=False),
        sa.Column("registration_enabled", sa.Boolean(), nullable=False),
        sa.Column("public_access_enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "leaderboard_visibility",
            sa.Enum("public", "participants_only", "hidden", name="leaderboardvisibility", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "name_visibility",
            sa.Enum("real_names", "aliases", "self_only", "anonymous", name="namevisibility", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "score_visibility",
            sa.Enum("all_scores", "places_only", "self_only", "hidden", name="scorevisibility", native_enum=False),
            nullable=False,
        ),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False),
        sa.Column("first_reminder_time", sa.String(length=5), nullable=True),
        sa.Column("second_reminder_time", sa.String(length=5), nullable=True),
        sa.Column("daily_deadline", sa.String(length=5), nullable=False),
        sa.Column("send_daily_summary", sa.Boolean(), nullable=False),
        sa.Column("all_required_bonus_points", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_rooms_room_code", "rooms", ["room_code"], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.Enum("quantity", "range", "yes_no", "text", name="tasktype", native_enum=False), nullable=False),
        sa.Column("target", sa.Numeric(10, 2), nullable=True),
        sa.Column("target_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("points", sa.Float(), nullable=False),
        sa.Column("bonus_per_unit", sa.Float(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_tasks_room_id", "tasks", ["room_id"], unique=False)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("alias", sa.String(length=200), nullable=True),
        sa.Column("telegram_id", sa.String(length=100), nullable=True),
        sa.Column("telegram_username", sa.String(length=100), nullable=True),
        sa.Column("is_registered_in_telegram", sa.Boolean(), nullable=False),
        sa.Column("status", sa.Enum("active", "blocked", name="studentstatus", native_enum=False), nullable=False),
        sa.Column("last_submission_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("room_id", "telegram_id", name="uq_students_room_telegram"),
    )
    op.create_index("ix_students_room_id", "students", ["room_id"], unique=False)
    op.create_index("ix_students_telegram_id", "students", ["telegram_id"], unique=False)

    op.create_table(
        "punishment_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_punishment_types_room_id", "punishment_types", ["room_id"], unique=False)

    op.create_table(
        "punishments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(length=200), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("pending", "completed", name="punishmentstatus", native_enum=False), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_punishments_room_id", "punishments", ["room_id"], unique=False)
    op.create_index("ix_punishments_student_id", "punishments", ["student_id"], unique=False)

    op.create_table(
        "completions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False),
        sa.Column("points_earned", sa.Float(), nullable=False),
        sa.Column("submitted_via", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("student_id", "task_id", "date", name="uq_completion_student_task_date"),
    )
    op.create_index("ix_completions_date", "completions", ["date"], unique=False)
    op.create_index("ix_completions_room_id", "completions", ["room_id"], unique=False)
    op.create_index("ix_completions_student_id", "completions", ["student_id"], unique=False)
    op.create_index("ix_completions_task_id", "completions", ["task_id"], unique=False)

    op.create_table(
        "telegram_notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "type",
            sa.Enum("reminder_1", "reminder_2", "daily_summary", name="telegramnotificationtype", native_enum=False),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(), nullable=False),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "sent", "failed", name="telegramnotificationstatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.UniqueConstraint(
            "student_id",
            "room_id",
            "type",
            "delivery_date",
            name="uq_telegram_notifications_student_room_type_date",
        ),
    )
    op.create_index("ix_telegram_notifications_delivery_date", "telegram_notifications", ["delivery_date"], unique=False)
    op.create_index("ix_telegram_notifications_room_id", "telegram_notifications", ["room_id"], unique=False)
    op.create_index("ix_telegram_notifications_scheduled_for", "telegram_notifications", ["scheduled_for"], unique=False)
    op.create_index("ix_telegram_notifications_student_id", "telegram_notifications", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_telegram_notifications_student_id", table_name="telegram_notifications")
    op.drop_index("ix_telegram_notifications_scheduled_for", table_name="telegram_notifications")
    op.drop_index("ix_telegram_notifications_room_id", table_name="telegram_notifications")
    op.drop_index("ix_telegram_notifications_delivery_date", table_name="telegram_notifications")
    op.drop_table("telegram_notifications")

    op.drop_index("ix_completions_task_id", table_name="completions")
    op.drop_index("ix_completions_student_id", table_name="completions")
    op.drop_index("ix_completions_room_id", table_name="completions")
    op.drop_index("ix_completions_date", table_name="completions")
    op.drop_table("completions")

    op.drop_index("ix_punishments_student_id", table_name="punishments")
    op.drop_index("ix_punishments_room_id", table_name="punishments")
    op.drop_table("punishments")

    op.drop_index("ix_punishment_types_room_id", table_name="punishment_types")
    op.drop_table("punishment_types")

    op.drop_index("ix_students_telegram_id", table_name="students")
    op.drop_index("ix_students_room_id", table_name="students")
    op.drop_table("students")

    op.drop_index("ix_tasks_room_id", table_name="tasks")
    op.drop_table("tasks")

    op.drop_index("ix_rooms_room_code", table_name="rooms")
    op.drop_table("rooms")

    op.drop_index("ix_organizers_username", table_name="organizers")
    op.drop_table("organizers")
