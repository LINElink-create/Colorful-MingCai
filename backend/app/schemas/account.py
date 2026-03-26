from __future__ import annotations

from pydantic import BaseModel

from app.schemas.translation import ProviderStatusOut


class ProviderListResponse(BaseModel):
    providers: list[ProviderStatusOut]
