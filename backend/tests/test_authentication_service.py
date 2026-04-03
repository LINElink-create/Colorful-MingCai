from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.core.config import get_settings
from app.schemas.auth import RefreshTokenRequest
from app.services.authentication_service import AuthenticationService
from app.services.token_service import SessionTokenPair


class FakeTokenService:
    def __init__(self) -> None:
        self._now = datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc)

    def hash_token(self, token: str) -> str:
        return f"hash:{token}"

    def issue_session_tokens(self) -> SessionTokenPair:
        return SessionTokenPair(
            access_token="new-access-token",
            refresh_token="new-refresh-token",
            access_expires_at=self._now + timedelta(hours=1),
            refresh_expires_at=self._now + timedelta(days=30),
        )

    def expires_in_seconds(self) -> int:
        return 3600

    def utcnow(self) -> datetime:
        return self._now


class FakeDb:
    def __init__(self, scalar_results: list[object], user: object) -> None:
        self.scalar_results = list(scalar_results)
        self.user = user
        self.committed = False
        self.refreshed: list[object] = []

    def scalar(self, *_args, **_kwargs):
        return self.scalar_results.pop(0) if self.scalar_results else None

    def get(self, *_args, **_kwargs):
        return self.user

    def commit(self) -> None:
        self.committed = True

    def refresh(self, instance: object) -> None:
        self.refreshed.append(instance)


def test_get_auth_context_accepts_naive_session_expiry() -> None:
    token_service = FakeTokenService()
    session = SimpleNamespace(
        access_token_hash="hash:access-token",
        access_expires_at=datetime(2026, 4, 3, 13, 0),
        revoked_at=None,
        user_id=2,
        last_seen_at=None,
    )
    user = SimpleNamespace(id=2, status="active")
    db = FakeDb([session], user)
    service = AuthenticationService(db=db, settings=get_settings(), token_service=token_service)

    context = service.get_auth_context_by_access_token("access-token")

    assert context.user is user
    assert context.session is session
    assert session.last_seen_at == token_service.utcnow()
    assert db.committed is True


def test_refresh_accepts_naive_session_expiry() -> None:
    token_service = FakeTokenService()
    refresh_token = "refresh-token-0123456789"
    session = SimpleNamespace(
        refresh_token_hash=f"hash:{refresh_token}",
        refresh_expires_at=datetime(2026, 5, 3, 12, 0),
        revoked_at=None,
        user_id=2,
        access_token_hash="old-access-hash",
        access_expires_at=datetime(2026, 4, 3, 13, 0),
        last_seen_at=None,
    )
    identity = SimpleNamespace(verified_at="2026-04-03T12:00:00+00:00", status="active")
    user = SimpleNamespace(
        id=2,
        status="active",
        user_uuid="user-2",
        email="user@example.com",
        display_name="测试用户",
        last_login_at=None,
    )
    db = FakeDb([session, identity], user)
    service = AuthenticationService(db=db, settings=get_settings(), token_service=token_service)

    result = service.refresh(RefreshTokenRequest(refresh_token=refresh_token))

    assert result.access_token == "new-access-token"
    assert result.refresh_token == "new-refresh-token"
    assert session.access_token_hash == "hash:new-access-token"
    assert session.refresh_token_hash == "hash:new-refresh-token"
    assert session.last_seen_at == token_service.utcnow()
    assert user.last_login_at == token_service.utcnow().isoformat()
    assert db.committed is True