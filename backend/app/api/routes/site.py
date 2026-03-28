from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, RedirectResponse

router = APIRouter(include_in_schema=False)

static_dir = Path(__file__).resolve().parents[2] / "static"
index_file = static_dir / "index.html"


@router.get("/", response_class=FileResponse)
def get_site_homepage() -> FileResponse:
    return FileResponse(index_file)


@router.get("/beian")
def get_beian_alias() -> RedirectResponse:
    return RedirectResponse(url="/", status_code=307)