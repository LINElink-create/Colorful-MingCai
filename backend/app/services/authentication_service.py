from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.translation_preference import TranslationPreference
from app.models.user import User
from app.models.user_auth_identity import UserAuthIdentity
from app.models.user_session import UserSession
from app.schemas.auth import (
    AuthSessionOut,
    AuthUserOut,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    VerificationStatusOut,
)
from app.services.password_hash_service import PasswordHashService
from app.services.token_service import SessionTokenPair, TokenService


@dataclass
class AuthContext:
    user: User
    session: UserSession


class AuthenticationService:
    def __init__(
        self,
        db: Session,
        settings: Optional[Settings] = None,
        password_hash_service: Optional[PasswordHashService] = None,
        token_service: Optional[TokenService] = None,
    ):
        self.db = db
        self.settings = settings or get_settings()
        self.password_hash_service = password_hash_service or PasswordHashService()
        self.token_service = token_service or TokenService(self.settings)

    def register(self, payload: RegisterRequest) -> AuthSessionOut:
        email = self._normalize_email(payload.email)
        self._validate_email(email)

        existing_identity = self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.identity_type == "email",
                UserAuthIdentity.identity_value == email,
            )
        )
        if existing_identity is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该邮箱已注册")

        display_name = (payload.display_name or email.split("@", 1)[0]).strip() or email.split("@", 1)[0]
        now_iso = self.token_service.utcnow().isoformat()
        user = User(
            user_uuid=secrets.token_hex(16),
            status="active",
            display_name=display_name,
            email=email,
            last_login_at=now_iso,
        )
        self.db.add(user)
        self.db.flush()

        identity = UserAuthIdentity(
            user_id=user.id,
            identity_type="email",
            identity_value=email,
            credential_hash=self.password_hash_service.hash_password(payload.password),
            verified_at=now_iso,
            last_used_at=now_iso,
            status="active",
        )
        self.db.add(identity)
        self.db.add(TranslationPreference(user_id=user.id))

        session_tokens = self.token_service.issue_session_tokens()
        user_session = self._create_user_session(user.id, session_tokens)
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user_session)
        self.db.refresh(user)
        return self._build_auth_session_out(user, session_tokens)

    def login(self, payload: LoginRequest) -> AuthSessionOut:
        email = self._normalize_email(payload.email)
        identity = self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.identity_type == "email",
                UserAuthIdentity.identity_value == email,
            )
        )
        if identity is None or not self.password_hash_service.verify_password(payload.password, identity.credential_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")

        user = self.db.get(User, identity.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        now_iso = self.token_service.utcnow().isoformat()
        identity.last_used_at = now_iso
        user.last_login_at = now_iso

        session_tokens = self.token_service.issue_session_tokens()
        user_session = self._create_user_session(user.id, session_tokens)
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_session_out(user, session_tokens)

    def refresh(self, payload: RefreshTokenRequest) -> AuthSessionOut:
        refresh_token_hash = self.token_service.hash_token(payload.refresh_token)
        session = self.db.scalar(
            select(UserSession).where(UserSession.refresh_token_hash == refresh_token_hash)
        )
        if session is None or session.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新令牌无效")

        now = self.token_service.utcnow()
        if session.refresh_expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新令牌已过期")

        user = self.db.get(User, session.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        tokens = self.token_service.issue_session_tokens()
        session.access_token_hash = self.token_service.hash_token(tokens.access_token)
        session.refresh_token_hash = self.token_service.hash_token(tokens.refresh_token)
        session.access_expires_at = tokens.access_expires_at
        session.refresh_expires_at = tokens.refresh_expires_at
        session.last_seen_at = now
        user.last_login_at = now.isoformat()
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_session_out(user, tokens)

    def logout(self, session: UserSession) -> None:
        session.revoked_at = self.token_service.utcnow()
        self.db.commit()

    def get_auth_context_by_access_token(self, access_token: str) -> AuthContext:
        access_token_hash = self.token_service.hash_token(access_token)
        session = self.db.scalar(
            select(UserSession).where(UserSession.access_token_hash == access_token_hash)
        )
        if session is None or session.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录状态已失效")

        now = self.token_service.utcnow()
        if session.access_expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="访问令牌已过期")

        user = self.db.get(User, session.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        session.last_seen_at = now
        self.db.commit()
        return AuthContext(user=user, session=session)

    @staticmethod
    def build_user_out(
        user: User,
        email_verified: bool = False,
        verification_status: str = "unverified",
    ) -> AuthUserOut:
        return AuthUserOut(
            id=user.id,
            user_uuid=user.user_uuid,
            email=user.email,
            display_name=user.display_name,
            email_verified=email_verified,
            verification_status=verification_status,
        )

    def build_verification_status_out(self, user: User) -> VerificationStatusOut:
        verification_status = self.get_email_verification_status(user.id)
        return VerificationStatusOut(
            email=user.email or "",
            email_verified=verification_status == "verified",
            verification_status=verification_status,
        )

    def get_email_verification_status(self, user_id: int) -> str:
        identity = self._get_email_identity_by_user_id(user_id)
        if identity is None:
            return "unverified"

        if identity.verified_at:
            return "verified"

        if identity.status == "pending":
            return "pending"

        return "unverified"

    def _build_auth_session_out(self, user: User, tokens: SessionTokenPair) -> AuthSessionOut:
        verification_status = self.get_email_verification_status(user.id)
        return AuthSessionOut(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            expires_in=self.token_service.expires_in_seconds(),
            user=self.build_user_out(
                user,
                email_verified=verification_status == "verified",
                verification_status=verification_status,
            ),
        )

    def _create_user_session(self, user_id: int, tokens: SessionTokenPair) -> UserSession:
        return UserSession(
            user_id=user_id,
            access_token_hash=self.token_service.hash_token(tokens.access_token),
            refresh_token_hash=self.token_service.hash_token(tokens.refresh_token),
            access_expires_at=tokens.access_expires_at,
            refresh_expires_at=tokens.refresh_expires_at,
            last_seen_at=self.token_service.utcnow(),
        )

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    def _get_email_identity_by_user_id(self, user_id: int) -> Optional[UserAuthIdentity]:
        return self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.user_id == user_id,
                UserAuthIdentity.identity_type == "email",
            )
        )

    @staticmethod
    def _validate_email(email: str) -> None:
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="邮箱格式无效")