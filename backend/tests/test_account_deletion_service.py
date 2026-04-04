from __future__ import annotations

from typing import Any, List, Optional, cast

import pytest
from fastapi import HTTPException

from app.core.config import get_settings
from app.models.user import User
from app.services.authentication_service import AuthenticationService


class FakeScalarResult:
    def __init__(self, values: List[int]) -> None:
        self.values = values

    def all(self) -> List[int]:
        return list(self.values)


class FakeDb:
    def __init__(self, provider_config_ids: List[int], user: Optional[object]) -> None:
        self.provider_config_ids = provider_config_ids
        self.user = user
        self.executed_tables: List[str] = []
        self.deleted_instances: List[object] = []
        self.committed = False
        self.rolled_back = False

    def scalars(self, *_args: Any, **_kwargs: Any) -> FakeScalarResult:
        return FakeScalarResult(self.provider_config_ids)

    def execute(self, statement: Any) -> None:
        self.executed_tables.append(statement.table.name)

    def get(self, *_args: Any, **_kwargs: Any) -> Optional[object]:
        return self.user

    def delete(self, instance: object) -> None:
        self.deleted_instances.append(instance)

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


def build_user() -> User:
    return User(
        id=1,
        user_uuid="user-1",
        status="active",
        display_name="测试用户",
        email="user@example.com",
        last_login_at="2026-04-04T00:00:00+00:00",
    )


def test_delete_account_removes_user_and_related_records() -> None:
    user = build_user()
    db = FakeDb(provider_config_ids=[1], user=user)
    service = AuthenticationService(db=cast(Any, db), settings=get_settings())

    service.delete_account(user, "user@example.com")

    assert db.executed_tables == [
        "email_verification_tokens",
        "user_sessions",
        "annotation_sync_jobs",
        "annotation_documents",
        "translation_preferences",
        "translation_requests",
        "translation_provider_configs",
        "user_auth_identities",
    ]
    assert db.deleted_instances == [user]
    assert db.committed is True
    assert db.rolled_back is False


def test_delete_account_rejects_mismatched_email() -> None:
    user = build_user()
    db = FakeDb(provider_config_ids=[1], user=user)
    service = AuthenticationService(db=cast(Any, db), settings=get_settings())

    with pytest.raises(HTTPException) as error_info:
        service.delete_account(user, "other@example.com")

    assert error_info.value.status_code == 422
    assert error_info.value.detail == "确认邮箱不匹配"
    assert db.executed_tables == []
    assert db.deleted_instances == []
    assert db.committed is False
