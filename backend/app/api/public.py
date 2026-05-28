from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.entities import LeaderboardVisibility, Room, RoomStatus
from app.schemas.common import PublicRoomLookupRequest, PublicRoomResponse
from app.services.scoring import build_leaderboard

router = APIRouter(prefix="/public", tags=["public"])


def _load_room_by_code(db: Session, room_code: str) -> Room:
    room = db.scalar(
        select(Room)
        .where(Room.room_code == room_code.upper())
        .options(selectinload(Room.tasks), selectinload(Room.students))
    )
    if room is None:
        raise HTTPException(status_code=404, detail="No room was found for this code.")
    return room


def _assert_public_room_access(room: Room) -> None:
    if room.status == RoomStatus.archived:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This room is archived.")
    if (
        not room.public_access_enabled
        or room.leaderboard_visibility == LeaderboardVisibility.hidden
        or room.leaderboard_visibility == LeaderboardVisibility.participants_only
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This room is not available for public viewing.",
        )


@router.post("/rooms/resolve", response_model=PublicRoomResponse)
def resolve_public_room(payload: PublicRoomLookupRequest, db: Session = Depends(get_db)) -> PublicRoomResponse:
    room = _load_room_by_code(db, payload.room_code)
    _assert_public_room_access(room)
    return PublicRoomResponse(
        id=room.id,
        name=room.name,
        description=room.description,
        room_code=room.room_code,
        status=room.status,
        leaderboard=build_leaderboard(db, room),
        tasks=[task for task in room.tasks if task.is_active],
    )


@router.get("/rooms/{room_code}", response_model=PublicRoomResponse)
def get_public_room(room_code: str, db: Session = Depends(get_db)) -> PublicRoomResponse:
    room = _load_room_by_code(db, room_code)
    _assert_public_room_access(room)
    return PublicRoomResponse(
        id=room.id,
        name=room.name,
        description=room.description,
        room_code=room.room_code,
        status=room.status,
        leaderboard=build_leaderboard(db, room),
        tasks=[task for task in room.tasks if task.is_active],
    )
