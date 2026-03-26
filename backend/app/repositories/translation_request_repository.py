from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.translation_request import TranslationRequest


class TranslationRequestRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_request_log(
        self,
        *,
        user_id: int | None,
        actor_type: str,
        provider: str,
        provider_config_id: int | None,
        source_language: str,
        target_language: str,
        text: str,
    ) -> TranslationRequest:
        request_log = TranslationRequest(
            request_id=uuid4().hex,
            user_id=user_id,
            actor_type=actor_type,
            provider_config_id=provider_config_id,
            provider=provider,
            source_language=source_language,
            target_language=target_language,
            query_hash=sha256(text.encode("utf-8")).hexdigest(),
            query_char_count=len(text),
            status="pending",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.db.add(request_log)
        self.db.flush()
        return request_log

    def mark_success(self, request_log: TranslationRequest, translated_text: str, latency_ms: int) -> TranslationRequest:
        request_log.status = "succeeded"
        request_log.response_char_count = len(translated_text)
        request_log.latency_ms = latency_ms
        return request_log

    def mark_failure(self, request_log: TranslationRequest, error_code: str, error_message: str, latency_ms: int) -> TranslationRequest:
        request_log.status = "failed"
        request_log.error_code = error_code
        request_log.error_message_short = error_message[:255]
        request_log.latency_ms = latency_ms
        return request_log
