from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_organizer
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.entities import Organizer
from app.schemas.common import LoginRequest, OrganizerResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    organizer = db.scalar(select(Organizer).where(Organizer.username == payload.username))
    if organizer is None or not verify_password(payload.password, organizer.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(organizer.username))


@router.get("/me", response_model=OrganizerResponse)
def me(current_organizer: Organizer = Depends(get_current_organizer)) -> Organizer:
    return current_organizer
