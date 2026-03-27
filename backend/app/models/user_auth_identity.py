from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class UserAuthIdentity(TimestampMixin, Base):
    __tablename__ = "user_auth_identities"
    __table_args__ = (
        Index("ix_user_auth_identity_type_value", "identity_type", "identity_value", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    identity_type: Mapped[str] = mapped_column(String(32), index=True)
    identity_value: Mapped[str] = mapped_column(String(255))
    credential_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verified_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_used_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
