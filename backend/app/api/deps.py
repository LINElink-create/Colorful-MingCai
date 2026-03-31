from __future__ import annotations

from collections.abc import Generator
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.authentication_service import AuthContext, AuthenticationService


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(db: Session = Depends(get_db_session)) -> AuthenticationService:
    return AuthenticationService(db=db)


def get_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[str]:
    return credentials.credentials if credentials else None


def get_current_auth_context(
    access_token: Optional[str] = Depends(get_bearer_token),
    auth_service: AuthenticationService = Depends(get_auth_service),
) -> AuthContext:
    if not access_token:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")

    return auth_service.get_auth_context_by_access_token(access_token)


def get_current_user(context: AuthContext = Depends(get_current_auth_context)) -> User:
    return context.user
