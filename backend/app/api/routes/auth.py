from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import AuthContext, get_auth_service, get_current_auth_context, get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthMessageOut,
    AuthSessionOut,
    AuthUserOut,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    SendVerificationEmailRequest,
    VerificationStatusOut,
    VerifyEmailTokenRequest,
)
from app.services.authentication_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthSessionOut, status_code=status.HTTP_201_CREATED)
def register_account(
    payload: RegisterRequest,
    service: AuthenticationService = Depends(get_auth_service),
) -> AuthSessionOut:
    return service.register(payload)


@router.post("/login", response_model=AuthSessionOut)
def login_account(
    payload: LoginRequest,
    service: AuthenticationService = Depends(get_auth_service),
) -> AuthSessionOut:
    return service.login(payload)


@router.post("/refresh", response_model=AuthSessionOut)
def refresh_token(
    payload: RefreshTokenRequest,
    service: AuthenticationService = Depends(get_auth_service),
) -> AuthSessionOut:
    return service.refresh(payload)


@router.post("/logout", response_model=AuthMessageOut)
def logout_account(
    context: AuthContext = Depends(get_current_auth_context),
    service: AuthenticationService = Depends(get_auth_service),
) -> AuthMessageOut:
    service.logout(context.session)
    return AuthMessageOut(message="已退出登录")


@router.get("/me", response_model=AuthUserOut)
def get_current_account(
    current_user: User = Depends(get_current_user),
    service: AuthenticationService = Depends(get_auth_service),
) -> AuthUserOut:
    verification_status_getter = getattr(service, "get_email_verification_status", None)
    verification_status = (
        verification_status_getter(current_user.id)
        if callable(verification_status_getter)
        else "unverified"
    )
    return AuthenticationService.build_user_out(
        current_user,
        email_verified=verification_status == "verified",
        verification_status=verification_status,
    )


@router.get("/verification/status", response_model=VerificationStatusOut)
def get_verification_status(
    current_user: User = Depends(get_current_user),
    service: AuthenticationService = Depends(get_auth_service),
) -> VerificationStatusOut:
    return service.build_verification_status_out(current_user)


@router.post("/verification/send", response_model=AuthMessageOut, status_code=status.HTTP_202_ACCEPTED)
def send_verification_email(
    payload: SendVerificationEmailRequest,
) -> AuthMessageOut:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"邮箱验证发信框架已预留，待接入 SMTP 服务: {payload.email}",
    )


@router.post("/verification/verify", response_model=AuthMessageOut)
def verify_email_token(
    payload: VerifyEmailTokenRequest,
) -> AuthMessageOut:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"邮箱验证确认框架已预留，待接入令牌核验: {payload.token[:8]}...",
    )

