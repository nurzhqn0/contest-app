import secrets

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_organizer
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.entities import Organizer
from app.schemas.common import LoginRequest, OrganizerResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def _set_csrf_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=token,
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )


def _clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        path="/",
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )


@router.post("/login", response_model=OrganizerResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> Organizer:
    organizer = db.scalar(select(Organizer).where(Organizer.username == payload.username))
    if organizer is None or not verify_password(payload.password, organizer.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    _set_auth_cookie(response, create_access_token(organizer.username))
    _set_csrf_cookie(response, secrets.token_urlsafe(32))
    return organizer


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    _current_organizer: Organizer = Depends(get_current_organizer),
) -> Response:
    _clear_auth_cookie(response)
    _clear_csrf_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=OrganizerResponse)
def me(
    response: Response,
    current_organizer: Organizer = Depends(get_current_organizer),
    csrf_cookie: str | None = Cookie(default=None, alias=settings.csrf_cookie_name),
) -> Organizer:
    if not csrf_cookie:
        _set_csrf_cookie(response, secrets.token_urlsafe(32))
    return current_organizer
