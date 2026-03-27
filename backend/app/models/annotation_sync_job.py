from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AnnotationSyncJob(TimestampMixin, Base):
    __tablename__ = "annotation_sync_jobs"
    __table_args__ = (
        Index("ix_annotation_sync_jobs_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    job_type: Mapped[str] = mapped_column(String(64), default="sync_annotations")
    status: Mapped[str] = mapped_column(String(32), default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_error_message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
