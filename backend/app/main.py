from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.account import router as account_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.translation import router as translation_router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)
app = FastAPI(title=settings.app_name, version="0.1.0")

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health_router, prefix="/v1")
app.include_router(translation_router, prefix="/v1")
app.include_router(account_router, prefix="/v1")
app.include_router(auth_router, prefix="/v1")
