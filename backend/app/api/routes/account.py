from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import (
    AuthContext,
    get_auth_service,
    get_current_auth_context,
    get_db_session,
    get_optional_current_user,
)
from app.core.config import get_settings
from app.models.user import User
from app.schemas.account import DeleteAccountRequest, DeleteAccountResponse, ProviderListResponse
from app.services.authentication_service import AuthenticationService
from app.services.provider_config_service import ProviderConfigService

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/providers", response_model=ProviderListResponse)
def list_providers(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db_session),
) -> ProviderListResponse:
    selection_service = ProviderConfigService(db=db, settings=get_settings())
    return ProviderListResponse(
        providers=selection_service.list_provider_statuses(current_user.id if current_user else None)
    )


@router.post("/delete", response_model=DeleteAccountResponse)
def delete_account(
    payload: DeleteAccountRequest,
    context: AuthContext = Depends(get_current_auth_context),
    service: AuthenticationService = Depends(get_auth_service),
) -> DeleteAccountResponse:
    service.delete_account(context.user, payload.confirm_email)
    return DeleteAccountResponse(success=True, message="账号已注销，已退出登录")
