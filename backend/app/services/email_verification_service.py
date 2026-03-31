from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

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
