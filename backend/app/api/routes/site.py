from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse, Response

from app.api.deps import get_auth_service
from app.core.config import Settings, get_settings
from app.services.authentication_service import AuthenticationService

router = APIRouter(include_in_schema=False)

static_dir = Path(__file__).resolve().parents[2] / "static"
index_file = static_dir / "index.html"
index_template = index_file.read_text(encoding="utf-8")


@router.get("/", response_class=HTMLResponse)
def get_site_homepage() -> HTMLResponse:
    return HTMLResponse(content=_build_site_homepage(get_settings()))


@router.get("/beian")
def get_beian_alias() -> RedirectResponse:
    return RedirectResponse(url="/", status_code=307)


@router.get("/verify-email", response_model=None)
def verify_email_from_link(
    token: str = Query(min_length=16, max_length=512),
    service: AuthenticationService = Depends(get_auth_service),
) -> Response:
    try:
        service.verify_email_token(token)
    except HTTPException as exc:
        return HTMLResponse(content=_build_verification_page(False, str(exc.detail)), status_code=exc.status_code)

    success_path = get_settings().auth_email_verification_success_path.strip() or "/"
    return RedirectResponse(url=success_path, status_code=303)


@router.get("/verify-email/success", response_class=HTMLResponse)
def get_verify_email_success_page() -> HTMLResponse:
    return HTMLResponse(content=_build_verification_page(True, "邮箱验证成功，现在可以返回扩展继续使用云同步。"))


def _build_site_homepage(settings: Settings) -> str:
    return index_template.replace("{{SITE_BEIAN_SECTION}}", _build_beian_section(settings))


def _build_beian_section(settings: Settings) -> str:
    links: list[str] = []

    icp_record = settings.site_icp_record.strip()
    if icp_record:
        links.append(_build_beian_link(icp_record, settings.site_icp_url.strip()))

    public_security_record = settings.site_public_security_record.strip()
    if public_security_record:
        icon_markup = ""
        icon_path = settings.site_public_security_icon_path.strip()
        if icon_path:
            icon_markup = (
                f'<img src="{escape(icon_path, quote=True)}" alt="" width="18" height="18">'
            )

        links.append(
            _build_beian_link(
                public_security_record,
                settings.site_public_security_url.strip(),
                prefix_html=icon_markup,
            )
        )

    if not links:
        return ""

    links_markup = "\n          ".join(links)
    return f"""
        <div class=\"footer-beian\">
          {links_markup}
        </div>"""


def _build_beian_link(text: str, href: str, prefix_html: str = "") -> str:
    content = f"{prefix_html}<span>{escape(text)}</span>" if prefix_html else escape(text)
    if not href:
        return f"<span>{content}</span>"

    safe_href = escape(href, quote=True)
    return f'<a href="{safe_href}" target="_blank" rel="noreferrer">{content}</a>'


def _build_verification_page(success: bool, message: str) -> str:
    title = "邮箱验证成功" if success else "邮箱验证失败"
    accent = "#16a34a" if success else "#dc2626"
    return f"""
<!doctype html>
<html lang="zh-CN">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>
            body {{
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font-family: "Segoe UI", "PingFang SC", sans-serif;
                background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(15,118,110,0.08)), #f8fafc;
                color: #0f172a;
            }}
            .card {{
                width: min(92vw, 520px);
                padding: 32px;
                border-radius: 20px;
                background: rgba(255,255,255,0.96);
                box-shadow: 0 20px 48px rgba(15,23,42,0.12);
            }}
            .badge {{
                display: inline-block;
                margin-bottom: 12px;
                padding: 6px 10px;
                border-radius: 999px;
                background: {accent};
                color: #fff;
                font-size: 13px;
            }}
            h1 {{ margin: 0 0 10px; font-size: 28px; }}
            p {{ margin: 0; line-height: 1.7; color: #334155; }}
            a {{ color: #2563eb; }}
        </style>
    </head>
    <body>
        <main class="card">
            <span class="badge">明彩</span>
            <h1>{title}</h1>
            <p>{message}</p>
        </main>
    </body>
</html>
"""