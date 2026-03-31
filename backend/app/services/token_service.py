from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.config import Settings


@dataclass
class SessionTokenPair:
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime


class TokenService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def issue_session_tokens(self) -> SessionTokenPair:
        now = self.utcnow()
        return SessionTokenPair(
            access_token=secrets.token_urlsafe(32),
            refresh_token=secrets.token_urlsafe(48),
            access_expires_at=now + timedelta(minutes=self.settings.auth_access_token_ttl_minutes),
            refresh_expires_at=now + timedelta(days=self.settings.auth_refresh_token_ttl_days),
        )

    def hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def expires_in_seconds(self) -> int:
        return self.settings.auth_access_token_ttl_minutes * 60

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(timezone.utc)