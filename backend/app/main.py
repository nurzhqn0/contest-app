from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api import auth, bot, dashboard, public, rooms
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.migrations import run_migrations
from app.db.session import SessionLocal
from app.models.entities import Organizer, Room
from app.services.scoring import build_leaderboard
from app.websocket.manager import room_socket_manager

logger = logging.getLogger(__name__)


def _init_db() -> None:
    logger.info("db init: run migrations")
    run_migrations()
    logger.info("db init: migrations complete")
    with SessionLocal() as db:
        logger.info("db init: check admin user")
        admin = db.scalar(select(Organizer).where(Organizer.username == settings.admin_username))
        if admin is None:
            logger.info("db init: create default admin user")
            db.add(Organizer(username=settings.admin_username, password_hash=get_password_hash(settings.admin_password)))
            db.commit()
        logger.info("db init: ready")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _init_db()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(rooms.router, prefix=settings.api_prefix)
app.include_router(public.router, prefix=settings.api_prefix)
app.include_router(bot.router, prefix=settings.api_prefix)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/rooms/{room_id}/leaderboard")
async def room_leaderboard_socket(websocket: WebSocket, room_id: int) -> None:
    await room_socket_manager.connect(room_id, websocket)
    with SessionLocal() as db:
        room = db.scalar(select(Room).where(Room.id == room_id))
        if room:
            leaderboard = build_leaderboard(db, room, respect_visibility=False)
            await websocket.send_json(
                {"type": "leaderboard.snapshot", "roomId": room_id, "payload": [row.model_dump(mode="json") for row in leaderboard]}
            )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        room_socket_manager.disconnect(room_id, websocket)
