from __future__ import annotations

from fastapi import APIRouter

from app.schemas.auth import AuthPlaceholderResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/device/start", response_model=AuthPlaceholderResponse)
def start_device_auth() -> AuthPlaceholderResponse:
    return AuthPlaceholderResponse(enabled=False, message="设备码登录尚未实现")


@router.post("/refresh", response_model=AuthPlaceholderResponse)
def refresh_token() -> AuthPlaceholderResponse:
    return AuthPlaceholderResponse(enabled=False, message="刷新令牌尚未实现")


@router.get("/me", response_model=AuthPlaceholderResponse)
def get_current_account() -> AuthPlaceholderResponse:
    return AuthPlaceholderResponse(enabled=False, message="当前未接入用户体系")
