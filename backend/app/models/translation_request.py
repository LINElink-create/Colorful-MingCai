from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TranslationRequest(Base):
    __tablename__ = "translation_requests"
    __table_args__ = (
        Index("ix_translation_requests_user_created", "user_id", "created_at"),
        Index("ix_translation_requests_request_id", "request_id", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    actor_type: Mapped[str] = mapped_column(String(32), default="anonymous")
    provider_config_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("translation_provider_configs.id"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(32), index=True)
    source_language: Mapped[str] = mapped_column(String(32))
    target_language: Mapped[str] = mapped_column(String(32))
    query_hash: Mapped[str] = mapped_column(String(128), index=True)
    query_char_count: Mapped[int] = mapped_column(Integer)
    response_char_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_message_short: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    user_agent_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[str] = mapped_column(String(64))
