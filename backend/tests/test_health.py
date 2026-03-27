from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes import health
from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "0.1.0"
    assert response.json()["database_status"] == "ok"


def test_health_endpoint_reports_degraded_when_database_is_unavailable(monkeypatch):
    monkeypatch.setattr(health, "get_database_status", lambda: "error")

    response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["database_status"] == "error"


def test_version_endpoint_returns_application_metadata():
    response = client.get("/v1/health/version")

    assert response.status_code == 200
    assert response.json()["app_name"] == "Mingcai Backend"
    assert response.json()["version"] == "0.1.0"
