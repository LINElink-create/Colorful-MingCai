from __future__ import annotations

"""initial schema

Revision ID: 20260326_0001
Revises: None
Create Date: 2026-03-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260326_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_uuid", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("display_name", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("last_login_at", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_user_uuid", "users", ["user_uuid"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_auth_identities",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("identity_type", sa.String(length=32), nullable=False),
        sa.Column("identity_value", sa.String(length=255), nullable=False),
        sa.Column("credential_hash", sa.String(length=255), nullable=True),
        sa.Column("verified_at", sa.String(length=64), nullable=True),
        sa.Column("last_used_at", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_auth_identities_user_id", "user_auth_identities", ["user_id"], unique=False)
    op.create_index("ix_user_auth_identities_identity_type", "user_auth_identities", ["identity_type"], unique=False)
    op.create_index(
        "ix_user_auth_identity_type_value",
        "user_auth_identities",
        ["identity_type", "identity_value"],
        unique=True,
    )

    op.create_table(
        "translation_preferences",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("default_provider", sa.String(length=32), nullable=False, server_default="youdao"),
        sa.Column("source_language", sa.String(length=32), nullable=False, server_default="auto"),
        sa.Column("target_language", sa.String(length=32), nullable=False, server_default="zh-CHS"),
        sa.Column("auto_translate_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_by", sa.String(length=32), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_translation_preferences_user_id"),
    )
    op.create_index(
        "ix_translation_preferences_default_provider",
        "translation_preferences",
        ["default_provider"],
        unique=False,
    )
    op.create_index("ix_translation_preferences_user_id", "translation_preferences", ["user_id"], unique=False)

    op.create_table(
        "translation_provider_configs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("owner_type", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.BigInteger(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("config_mode", sa.String(length=32), nullable=False, server_default="managed"),
        sa.Column("credential_payload_encrypted", sa.Text(), nullable=True),
        sa.Column("credential_fingerprint", sa.String(length=128), nullable=True),
        sa.Column("quota_policy_json", sa.JSON(), nullable=True),
        sa.Column("daily_limit", sa.Integer(), nullable=True),
        sa.Column("rate_limit_per_minute", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="inactive"),
        sa.Column("last_checked_at", sa.String(length=64), nullable=True),
        sa.Column("last_error_code", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_translation_provider_owner",
        "translation_provider_configs",
        ["owner_type", "owner_id", "provider"],
        unique=True,
    )
    op.create_index(
        "ix_translation_provider_configs_owner_type",
        "translation_provider_configs",
        ["owner_type"],
        unique=False,
    )
    op.create_index(
        "ix_translation_provider_configs_owner_id",
        "translation_provider_configs",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        "ix_translation_provider_configs_provider",
        "translation_provider_configs",
        ["provider"],
        unique=False,
    )

    op.create_table(
        "translation_requests",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "provider_config_id",
            sa.BigInteger(),
            sa.ForeignKey("translation_provider_configs.id"),
            nullable=True,
        ),
        sa.Column("actor_type", sa.String(length=32), nullable=False, server_default="anonymous"),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("source_language", sa.String(length=32), nullable=False),
        sa.Column("target_language", sa.String(length=32), nullable=False),
        sa.Column("query_hash", sa.String(length=128), nullable=False),
        sa.Column("query_char_count", sa.Integer(), nullable=False),
        sa.Column("response_char_count", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message_short", sa.String(length=255), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("ip_hash", sa.String(length=128), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.String(length=64), nullable=False),
    )
    op.create_index("ix_translation_requests_request_id", "translation_requests", ["request_id"], unique=True)
    op.create_index("ix_translation_requests_user_id", "translation_requests", ["user_id"], unique=False)
    op.create_index(
        "ix_translation_requests_provider_config_id",
        "translation_requests",
        ["provider_config_id"],
        unique=False,
    )
    op.create_index("ix_translation_requests_provider", "translation_requests", ["provider"], unique=False)
    op.create_index("ix_translation_requests_query_hash", "translation_requests", ["query_hash"], unique=False)
    op.create_index(
        "ix_translation_requests_user_created",
        "translation_requests",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "annotation_documents",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("page_key", sa.String(length=512), nullable=False),
        sa.Column("page_url", sa.String(length=2048), nullable=False),
        sa.Column("page_title", sa.String(length=512), nullable=True),
        sa.Column("snapshot_json", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_annotation_documents_user_id", "annotation_documents", ["user_id"], unique=False)
    op.create_index(
        "ix_annotation_documents_user_page",
        "annotation_documents",
        ["user_id", "page_key"],
        unique=True,
    )

    op.create_table(
        "annotation_sync_jobs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_type", sa.String(length=64), nullable=False, server_default="sync_annotations"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("last_error_message", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_annotation_sync_jobs_user_id", "annotation_sync_jobs", ["user_id"], unique=False)
    op.create_index(
        "ix_annotation_sync_jobs_user_status",
        "annotation_sync_jobs",
        ["user_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_annotation_sync_jobs_user_status", table_name="annotation_sync_jobs")
    op.drop_index("ix_annotation_sync_jobs_user_id", table_name="annotation_sync_jobs")
    op.drop_table("annotation_sync_jobs")

    op.drop_index("ix_annotation_documents_user_page", table_name="annotation_documents")
    op.drop_index("ix_annotation_documents_user_id", table_name="annotation_documents")
    op.drop_table("annotation_documents")

    op.drop_index("ix_translation_requests_user_created", table_name="translation_requests")
    op.drop_index("ix_translation_requests_query_hash", table_name="translation_requests")
    op.drop_index("ix_translation_requests_provider", table_name="translation_requests")
    op.drop_index("ix_translation_requests_provider_config_id", table_name="translation_requests")
    op.drop_index("ix_translation_requests_user_id", table_name="translation_requests")
    op.drop_index("ix_translation_requests_request_id", table_name="translation_requests")
    op.drop_table("translation_requests")

    op.drop_index("ix_translation_provider_configs_provider", table_name="translation_provider_configs")
    op.drop_index("ix_translation_provider_configs_owner_id", table_name="translation_provider_configs")
    op.drop_index("ix_translation_provider_configs_owner_type", table_name="translation_provider_configs")
    op.drop_index("ix_translation_provider_owner", table_name="translation_provider_configs")
    op.drop_table("translation_provider_configs")

    op.drop_index("ix_translation_preferences_user_id", table_name="translation_preferences")
    op.drop_index("ix_translation_preferences_default_provider", table_name="translation_preferences")
    op.drop_table("translation_preferences")

    op.drop_index("ix_user_auth_identity_type_value", table_name="user_auth_identities")
    op.drop_index("ix_user_auth_identities_identity_type", table_name="user_auth_identities")
    op.drop_index("ix_user_auth_identities_user_id", table_name="user_auth_identities")
    op.drop_table("user_auth_identities")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_user_uuid", table_name="users")
    op.drop_table("users")
