from __future__ import annotations

from sqlalchemy import BigInteger, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TranslationPreference(TimestampMixin, Base):
    __tablename__ = "translation_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_translation_preferences_user_id"),
        Index("ix_translation_preferences_default_provider", "default_provider"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    default_provider: Mapped[str] = mapped_column(String(32), default="youdao")
    source_language: Mapped[str] = mapped_column(String(32), default="auto")
    target_language: Mapped[str] = mapped_column(String(32), default="zh-CHS")
    auto_translate_enabled: Mapped[bool] = mapped_column(default=False)
    updated_by: Mapped[str] = mapped_column(String(32), default="user")
