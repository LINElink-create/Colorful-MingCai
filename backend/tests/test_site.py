from __future__ import annotations

from app.core.config import get_settings
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_site_homepage_is_available() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "明彩" in response.text
    assert "项目简介与版本规划" in response.text
    assert "未来规划" in response.text
    assert "/static/site.css" in response.text
    assert "footer-beian" not in response.text


def test_site_homepage_renders_beian_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("SITE_ICP_RECORD", "苏ICP备示例号")
    monkeypatch.setenv("SITE_PUBLIC_SECURITY_RECORD", "苏公网安备示例号")
    monkeypatch.setenv("SITE_PUBLIC_SECURITY_URL", "https://beian.mps.gov.cn/#/query/webSearch?code=test")
    get_settings.cache_clear()

    try:
        response = client.get("/")
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    assert "苏ICP备示例号" in response.text
    assert "苏公网安备示例号" in response.text
    assert "/static/icon/备案图标.png" in response.text
    assert "footer-beian" in response.text


def test_beian_alias_redirects_to_homepage() -> None:
    response = client.get("/beian", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/"