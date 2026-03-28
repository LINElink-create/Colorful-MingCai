from __future__ import annotations

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


def test_beian_alias_redirects_to_homepage() -> None:
    response = client.get("/beian", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/"