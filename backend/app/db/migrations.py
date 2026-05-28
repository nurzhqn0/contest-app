from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import settings
from app.db.session import engine
from app.models.entities import Base


def run_migrations() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    alembic_config = Config(str(backend_dir / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_config.set_main_option("sqlalchemy.url", settings.database_url)

    table_names = inspect(engine).get_table_names()
    if not table_names:
        command.upgrade(alembic_config, "head")
        return

    if "alembic_version" not in table_names:
        # Adopt pre-migration bootstrap databases and create any newly added tables.
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_config, "head")
        return

    command.upgrade(alembic_config, "head")
