from __future__ import annotations

from types import SimpleNamespace
from typing import Optional

from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.deps import get_auth_service, get_current_auth_context
from app.main import app
from app.services.authentication_service import AuthContext

client = TestClient(app)


class FakeAuthService:
    def __init__(self) -> None:
        self.deleted_email: Optional[str] = None
        self.deleted_user_id: Optional[int] = None

    def delete_account(self, current_user, confirm_email: str) -> None:
        if confirm_email != "user@example.com":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="确认邮箱不匹配")

        self.deleted_email = confirm_email
        self.deleted_user_id = current_user.id


fake_auth_service = FakeAuthService()


def override_auth_service():
    return fake_auth_service


def override_current_user():
    return SimpleNamespace(id=1, email="user@example.com")


def override_auth_context():
    return AuthContext(user=override_current_user(), session=SimpleNamespace(id=1))


def setup_module():
    app.dependency_overrides[get_auth_service] = override_auth_service
    app.dependency_overrides[get_current_auth_context] = override_auth_context


def teardown_module():
    app.dependency_overrides.clear()


def test_delete_account_route_returns_success_message() -> None:
    response = client.post("/v1/account/delete", json={"confirmEmail": "user@example.com"})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["message"] == "账号已注销，已退出登录"
    assert fake_auth_service.deleted_email == "user@example.com"
    assert fake_auth_service.deleted_user_id == 1


def test_delete_account_route_rejects_mismatched_email() -> None:
    response = client.post("/v1/account/delete", json={"confirmEmail": "other@example.com"})

    assert response.status_code == 422
    assert response.json()["detail"] == "确认邮箱不匹配"


def test_delete_account_route_requires_confirm_email() -> None:
    response = client.post("/v1/account/delete", json={})

    assert response.status_code == 422