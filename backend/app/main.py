from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.account import router as account_router
from app.api.routes.annotations import router as annotations_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.site import router as site_router
from app.api.routes.translation import router as translation_router
from app.core.config import get_settings

settings = get_settings()
static_dir = Path(__file__).resolve().parent / "static"

app = FastAPI(title=settings.app_name, version=settings.app_version)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(site_router)
app.include_router(health_router, prefix="/v1")
app.include_router(translation_router, prefix="/v1")
app.include_router(account_router, prefix="/v1")
app.include_router(auth_router, prefix="/v1")
app.include_router(annotations_router, prefix="/v1")
