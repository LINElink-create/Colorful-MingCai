from __future__ import annotations

from pydantic import BaseModel


class ApiMessage(BaseModel):
    code: str
    message: str
