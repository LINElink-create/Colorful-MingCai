from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel


VerificationStatus = Literal["unverified", "pending", "verified"]


class RegisterRequest(CamelModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(max_length=128)


class LoginRequest(CamelModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class RefreshTokenRequest(CamelModel):
    refresh_token: str = Field(min_length=16, max_length=512)


class SendVerificationEmailRequest(CamelModel):
    email: str = Field(min_length=3, max_length=255)


class VerifyEmailTokenRequest(CamelModel):
    token: str = Field(min_length=16, max_length=512)


class AuthUserOut(CamelModel):
    id: int
    user_uuid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    email_verified: bool = False
    verification_status: VerificationStatus = "unverified"


class AuthSessionOut(CamelModel):
    token_type: str = "bearer"
    access_token: str
    refresh_token: str
    expires_in: int
    user: AuthUserOut
    message: Optional[str] = None


class AuthMessageOut(CamelModel):
    message: str


class RegisterPendingOut(CamelModel):
    message: str
    email: str
    requires_verification: bool = True
    verification_status: VerificationStatus = "pending"


class VerificationStatusOut(CamelModel):
    email: str
    email_verified: bool = False
    verification_status: VerificationStatus = "unverified"
