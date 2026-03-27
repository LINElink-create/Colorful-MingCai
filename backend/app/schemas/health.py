from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    environment: str
    deploy_env: str
    version: str
    database_status: str


class VersionResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    deploy_env: str
    public_base_url: str
