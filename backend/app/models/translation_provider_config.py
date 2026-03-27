from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import JSON, BigInteger, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TranslationProviderConfig(TimestampMixin, Base):
    __tablename__ = "translation_provider_configs"
    __table_args__ = (
        Index("ix_translation_provider_owner", "owner_type", "owner_id", "provider", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_type: Mapped[str] = mapped_column(String(32), index=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    config_mode: Mapped[str] = mapped_column(String(32), default="managed")
    credential_payload_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    credential_fingerprint: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    quota_policy_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    daily_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rate_limit_per_minute: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="inactive")
    last_checked_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
