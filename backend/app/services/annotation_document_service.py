from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.annotation_document import AnnotationDocument
from app.schemas.annotation_sync import AnnotationBundlePayload, AnnotationDocumentListOut, AnnotationDocumentSyncOut


class AnnotationDocumentService:
    def __init__(self, db: Session):
        self.db = db

    def list_bundle(self, user_id: int) -> AnnotationDocumentListOut:
        documents = self.db.scalars(
            select(AnnotationDocument)
            .where(AnnotationDocument.user_id == user_id)
            .order_by(AnnotationDocument.updated_at.desc())
        ).all()
        buckets = []

        for document in documents:
            payload = json.loads(document.snapshot_json)
            bucket = {
                **payload,
                "url": payload.get("url") or document.page_url,
                "page_title": payload.get("page_title") or payload.get("pageTitle") or document.page_title or "",
                "updated_at": payload.get("updated_at") or payload.get("updatedAt") or self._datetime_to_iso(document.updated_at),
                "schema_version": payload.get("schema_version") or payload.get("schemaVersion") or 1,
            }
            buckets.append(bucket)

        return AnnotationDocumentListOut(
            schema_version=1,
            exported_at=self._now_iso(),
            buckets=buckets,
        )

    def replace_bundle(self, user_id: int, bundle: AnnotationBundlePayload) -> AnnotationDocumentSyncOut:
        existing_documents = {
            document.page_key: document
            for document in self.db.scalars(
                select(AnnotationDocument).where(AnnotationDocument.user_id == user_id)
            ).all()
        }
        next_page_keys: set[str] = set()
        saved_count = 0

        for bucket in bundle.buckets:
            page_key = self._get_page_key(bucket.url)
            next_page_keys.add(page_key)
            snapshot_json = json.dumps(bucket.model_dump(mode="json", by_alias=True), ensure_ascii=False)
            document = existing_documents.get(page_key)

            if document is None:
                document = AnnotationDocument(
                    user_id=user_id,
                    page_key=page_key,
                    page_url=bucket.url,
                    page_title=bucket.page_title,
                    snapshot_json=snapshot_json,
                    version=1,
                )
                self.db.add(document)
            else:
                document.page_url = bucket.url
                document.page_title = bucket.page_title
                document.snapshot_json = snapshot_json
                document.version += 1

            saved_count += 1

        for page_key, document in existing_documents.items():
            if page_key not in next_page_keys:
                self.db.delete(document)

        self.db.commit()
        current_bundle = self.list_bundle(user_id)
        return AnnotationDocumentSyncOut(
            schema_version=current_bundle.schema_version,
            exported_at=current_bundle.exported_at,
            buckets=current_bundle.buckets,
            saved_count=saved_count,
        )

    @staticmethod
    def _get_page_key(url: str) -> str:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}" if parsed.scheme and parsed.netloc else url

    @staticmethod
    def _datetime_to_iso(value: Optional[datetime]) -> str:
        if value is None:
            return datetime.now(timezone.utc).isoformat()
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()