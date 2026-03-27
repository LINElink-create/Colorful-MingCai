from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AnnotationDocument(TimestampMixin, Base):
    __tablename__ = "annotation_documents"
    __table_args__ = (
        Index("ix_annotation_documents_user_page", "user_id", "page_key", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    page_key: Mapped[str] = mapped_column(String(512))
    page_url: Mapped[str] = mapped_column(String(2048))
    page_title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    snapshot_json: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(default=1)
