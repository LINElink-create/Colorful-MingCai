from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.routes.annotations import get_annotation_document_service
from app.main import app
from app.schemas.annotation_sync import AnnotationDocumentListOut, AnnotationDocumentSyncOut, PageAnnotationBucketPayload

client = TestClient(app)


class FakeAnnotationDocumentService:
    def list_bundle(self, user_id: int) -> AnnotationDocumentListOut:
        return AnnotationDocumentListOut(
            schema_version=1,
            exported_at="2026-03-29T00:00:00Z",
            buckets=[
                PageAnnotationBucketPayload(
                    url="https://example.com/article",
                    page_title="示例页面",
                    annotations=[],
                    updated_at="2026-03-29T00:00:00Z",
                    schema_version=1,
                )
            ],
        )

    def replace_bundle(self, user_id: int, bundle) -> AnnotationDocumentSyncOut:
        return AnnotationDocumentSyncOut(
            schema_version=bundle.schema_version,
            exported_at="2026-03-29T00:00:00Z",
            buckets=bundle.buckets,
            saved_count=len(bundle.buckets),
        )


def override_current_user():
    return SimpleNamespace(id=1)


def override_annotation_service():
    return FakeAnnotationDocumentService()


def setup_module():
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_annotation_document_service] = override_annotation_service


def teardown_module():
    app.dependency_overrides.clear()


def test_list_documents_returns_bundle() -> None:
    response = client.get("/v1/annotations/documents")

    assert response.status_code == 200
    assert response.json()["buckets"][0]["pageTitle"] == "示例页面"


def test_replace_documents_returns_saved_count() -> None:
    response = client.put(
        "/v1/annotations/documents/bulk",
        json={
            "schemaVersion": 1,
            "exportedAt": "2026-03-29T00:00:00Z",
            "buckets": [
                {
                    "url": "https://example.com/article",
                    "pageTitle": "示例页面",
                    "annotations": [],
                    "updatedAt": "2026-03-29T00:00:00Z",
                    "schemaVersion": 1,
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["savedCount"] == 1
