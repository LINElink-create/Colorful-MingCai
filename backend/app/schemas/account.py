from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import CamelModel
from app.schemas.translation import ProviderStatusOut


class ProviderListResponse(BaseModel):
    providers: list[ProviderStatusOut]


class DeleteAccountRequest(CamelModel):
    confirm_email: str = Field(min_length=3, max_length=255)


class DeleteAccountResponse(CamelModel):
    success: bool
    message: str
