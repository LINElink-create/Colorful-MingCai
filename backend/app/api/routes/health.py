from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import engine
from app.schemas.health import HealthResponse
from app.schemas.health import VersionResponse

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


def get_database_status() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except SQLAlchemyError:
        return "error"


@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    settings = get_settings()
    database_status = get_database_status()

    return HealthResponse(
        status="ok" if database_status == "ok" else "degraded",
        app_name=settings.app_name,
        environment=settings.app_env,
        deploy_env=settings.deploy_env,
        version=settings.app_version,
        database_status=database_status,
    )


@router.get("/version", response_model=VersionResponse)
def get_version() -> VersionResponse:
    settings = get_settings()
    return VersionResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        deploy_env=settings.deploy_env,
        public_base_url=settings.server_public_base_url,
@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.app_env,
    )
