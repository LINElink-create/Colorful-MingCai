from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class EmailVerificationToken(TimestampMixin, Base):
    __tablename__ = "email_verification_tokens"
    __table_args__ = (
        Index("ix_email_verification_tokens_user_id", "user_id"),
        Index("ix_email_verification_tokens_identity_id", "identity_id"),
        Index("ix_email_verification_tokens_token_hash", "token_hash", unique=True),
        Index("ix_email_verification_tokens_expires_at", "expires_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    identity_id: Mapped[int] = mapped_column(ForeignKey("user_auth_identities.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    token_type: Mapped[str] = mapped_column(String(32), default="register_verify")
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
