from typing import Annotated
import secrets

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.entities import Organizer

def _resolve_token(
    cookie_token: Annotated[str | None, Cookie(alias=settings.auth_cookie_name)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[str, bool]:
    if cookie_token:
        return cookie_token, True
    if authorization and authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip(), False
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_organizer(
    request: Request,
    token_data: tuple[str, bool] = Depends(_resolve_token),
    csrf_cookie: Annotated[str | None, Cookie(alias=settings.csrf_cookie_name)] = None,
    csrf_header: Annotated[str | None, Header(alias=settings.csrf_header_name)] = None,
    db: Session = Depends(get_db),
) -> Organizer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token, using_cookie_auth = token_data

    if using_cookie_auth and request.method.upper() not in {"GET", "HEAD", "OPTIONS"}:
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")

    try:
        username = decode_access_token(token)
    except JWTError as exc:
        raise credentials_exception from exc

    organizer = db.scalar(select(Organizer).where(Organizer.username == username))
    if organizer is None:
        raise credentials_exception
    return organizer
