from __future__ import annotations

from typing import Optional

from pydantic import Field

from app.schemas.common import CamelModel


class AnnotationRecordPayload(CamelModel):
    id: str
    url: str
    page_title: str
    text_quote: str
    prefix_text: str
    suffix_text: str
    start_container_path: str
    start_offset: int
    end_container_path: str
    end_offset: int
    color: str
    note: Optional[str] = None
    created_at: str
    updated_at: str


class PageAnnotationBucketPayload(CamelModel):
    url: str
    page_title: str
    annotations: list[AnnotationRecordPayload]
    updated_at: str
    schema_version: int = Field(default=1)


class AnnotationBundlePayload(CamelModel):
    schema_version: int = Field(default=1)
    exported_at: Optional[str] = None
    buckets: list[PageAnnotationBucketPayload]


class AnnotationDocumentListOut(CamelModel):
    schema_version: int = Field(default=1)
    exported_at: str
    buckets: list[PageAnnotationBucketPayload]


class AnnotationDocumentSyncOut(AnnotationDocumentListOut):
    saved_count: int