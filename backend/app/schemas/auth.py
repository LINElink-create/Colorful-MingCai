from __future__ import annotations

from pydantic import BaseModel


class AuthPlaceholderResponse(BaseModel):
    enabled: bool
    message: str
