from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.deps import get_auth_service, get_current_auth_context, get_current_user
from app.main import app
from app.schemas.auth import AuthMessageOut, AuthSessionOut, AuthUserOut
from app.services.authentication_service import AuthContext

client = TestClient(app)


class FakeAuthService:
    def __init__(self) -> None:
        self.logged_out = False

    def register(self, payload):
        return AuthSessionOut(
            access_token="access-token",
            refresh_token="refresh-token",
            expires_in=3600,
            user=AuthUserOut(id=1, user_uuid="user-1", email=payload.email, display_name=payload.display_name),
        )

    def login(self, payload):
        return AuthSessionOut(
            access_token="access-token",
            refresh_token="refresh-token",
            expires_in=3600,
            user=AuthUserOut(id=1, user_uuid="user-1", email=payload.email, display_name="明彩用户"),
        )

    def refresh(self, payload):
        return AuthSessionOut(
            access_token="new-access-token",
            refresh_token=payload.refresh_token,
            expires_in=3600,
            user=AuthUserOut(id=1, user_uuid="user-1", email="user@example.com", display_name="明彩用户"),
        )

    def logout(self, session):
        self.logged_out = True


fake_auth_service = FakeAuthService()


def override_auth_service():
    return fake_auth_service


def override_current_user():
    return SimpleNamespace(id=1, user_uuid="user-1", email="user@example.com", display_name="明彩用户")


def override_auth_context():
    return AuthContext(user=override_current_user(), session=SimpleNamespace(id=1))


def setup_module():
    app.dependency_overrides[get_auth_service] = override_auth_service
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_current_auth_context] = override_auth_context


def teardown_module():
    app.dependency_overrides.clear()


def test_register_route_returns_auth_session() -> None:
    response = client.post(
        "/v1/auth/register",
        json={"email": "user@example.com", "password": "password123", "displayName": "测试用户"},
    )

    assert response.status_code == 201
    assert response.json()["accessToken"] == "access-token"
    assert response.json()["user"]["displayName"] == "测试用户"


def test_login_route_returns_auth_session() -> None:
    response = client.post(
        "/v1/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json()["refreshToken"] == "refresh-token"


def test_refresh_route_rotates_access_token() -> None:
    response = client.post("/v1/auth/refresh", json={"refreshToken": "refresh-token-0123456789"})

    assert response.status_code == 200
    assert response.json()["accessToken"] == "new-access-token"


def test_me_route_returns_current_account() -> None:
    response = client.get("/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"


def test_logout_route_returns_message() -> None:
    response = client.post("/v1/auth/logout")

    assert response.status_code == 200
    assert response.json() == AuthMessageOut(message="已退出登录").model_dump(by_alias=True)
