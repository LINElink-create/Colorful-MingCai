from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import delete as sa_delete, desc, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User
from app.models.user_auth_identity import UserAuthIdentity
from app.services.token_service import TokenService


@dataclass
class VerificationLinkDraft:
    raw_token: str
    verification_url: str
    expires_in_hours: int


class EmailVerificationService:
    def __init__(
        self,
        db: Session,
        settings: Optional[Settings] = None,
        token_service: Optional[TokenService] = None,
    ):
        self.db = db
        self.settings = settings or get_settings()
        self.token_service = token_service or TokenService(self.settings)

    def has_public_verification_url(self) -> bool:
        return bool(self.settings.server_public_base_url.strip())

    def issue_registration_token(
        self,
        user: User,
        identity: UserAuthIdentity,
    ) -> tuple[EmailVerificationToken, VerificationLinkDraft]:
        self.db.execute(
            sa_delete(EmailVerificationToken).where(
                EmailVerificationToken.identity_id == identity.id,
                EmailVerificationToken.token_type == "register_verify",
                EmailVerificationToken.verified_at.is_(None),
            )
        )
        token, draft = self.build_registration_token(user, identity)
        self.db.add(token)
        self.db.flush()
        return token, draft

    def mark_token_sent(self, token: EmailVerificationToken) -> None:
        token.sent_at = self.token_service.utcnow()
        self.db.flush()

    def ensure_resend_allowed(self, identity: UserAuthIdentity) -> None:
        latest_token = self.get_latest_active_token(identity.id)
        if latest_token is None or latest_token.sent_at is None:
            return

        now = self.token_service.utcnow()
        resend_available_at = self._normalize_utc_datetime(latest_token.sent_at) + timedelta(
            seconds=self.settings.auth_email_verification_resend_cooldown_seconds
        )
        if resend_available_at <= now:
            return

        retry_after = int((resend_available_at - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"验证邮件发送过于频繁，请在 {retry_after} 秒后重试",
        )

    def get_latest_active_token(self, identity_id: int) -> Optional[EmailVerificationToken]:
        return self.db.scalar(
            select(EmailVerificationToken)
            .where(
                EmailVerificationToken.identity_id == identity_id,
                EmailVerificationToken.token_type == "register_verify",
                EmailVerificationToken.verified_at.is_(None),
            )
            .order_by(desc(EmailVerificationToken.sent_at), desc(EmailVerificationToken.created_at))
        )

    def verify_registration_token(self, raw_token: str) -> tuple[User, UserAuthIdentity]:
        token = self.db.scalar(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == self.hash_token(raw_token),
                EmailVerificationToken.token_type == "register_verify",
            )
        )
        if token is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="验证链接无效")

        if token.verified_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="验证链接已使用")

        if self._normalize_utc_datetime(token.expires_at) < self.token_service.utcnow():
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="验证链接已过期")

        user = self.db.get(User, token.user_id)
        identity = self.db.get(UserAuthIdentity, token.identity_id)
        if user is None or identity is None or identity.user_id != user.id or identity.identity_type != "email":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="验证账号不存在")

        now_iso = self.token_service.utcnow().isoformat()
        token.verified_at = self.token_service.utcnow()
        identity.status = "active"
        identity.verified_at = identity.verified_at or now_iso
        self.db.execute(
            sa_delete(EmailVerificationToken).where(
                EmailVerificationToken.identity_id == identity.id,
                EmailVerificationToken.token_type == "register_verify",
                EmailVerificationToken.id != token.id,
            )
        )
        self.db.flush()
        return user, identity

    def build_registration_token(
        self,
        user: User,
        identity: UserAuthIdentity,
    ) -> tuple[EmailVerificationToken, VerificationLinkDraft]:
        raw_token = secrets.token_urlsafe(32)
        token = EmailVerificationToken(
            user_id=user.id,
            identity_id=identity.id,
            token_hash=self.hash_token(raw_token),
            token_type="register_verify",
            expires_at=self.token_service.utcnow() + timedelta(hours=self.settings.auth_email_verification_token_ttl_hours),
        )
        verification_url = self._build_verification_url(raw_token)
        draft = VerificationLinkDraft(
            raw_token=raw_token,
            verification_url=verification_url,
            expires_in_hours=self.settings.auth_email_verification_token_ttl_hours,
        )
        return token, draft

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def _build_verification_url(self, raw_token: str) -> str:
        base_url = self.settings.server_public_base_url.rstrip("/")
        if not base_url:
            return raw_token

        return f"{base_url}/verify-email?token={raw_token}"

    @staticmethod
    def _normalize_utc_datetime(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)
