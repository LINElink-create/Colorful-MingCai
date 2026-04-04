from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.orm import Session

from app.models.annotation_document import AnnotationDocument
from app.models.annotation_sync_job import AnnotationSyncJob
from app.models.email_verification_token import EmailVerificationToken
from app.core.config import Settings, get_settings
from app.models.translation_preference import TranslationPreference
from app.models.translation_provider_config import TranslationProviderConfig
from app.models.translation_request import TranslationRequest
from app.models.user import User
from app.models.user_auth_identity import UserAuthIdentity
from app.models.user_session import UserSession
from app.schemas.auth import (
    AuthMessageOut,
    AuthSessionOut,
    AuthUserOut,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    VerificationStatusOut,
)
from app.services.email_service import EmailMessage, EmailService
from app.services.email_verification_service import EmailVerificationService, VerificationLinkDraft
from app.services.password_hash_service import PasswordHashService
from app.services.token_service import SessionTokenPair, TokenService


@dataclass
class AuthContext:
    user: User
    session: UserSession


class AuthenticationService:
    def __init__(
        self,
        db: Session,
        settings: Optional[Settings] = None,
        password_hash_service: Optional[PasswordHashService] = None,
        token_service: Optional[TokenService] = None,
        email_service: Optional[EmailService] = None,
        email_verification_service: Optional[EmailVerificationService] = None,
    ):
        self.db = db
        self.settings = settings or get_settings()
        self.password_hash_service = password_hash_service or PasswordHashService()
        self.token_service = token_service or TokenService(self.settings)
        self.email_service = email_service or EmailService(self.settings)
        self.email_verification_service = email_verification_service or EmailVerificationService(
            db=db,
            settings=self.settings,
            token_service=self.token_service,
        )

    def register(self, payload: RegisterRequest) -> AuthSessionOut:
        email = self._normalize_email(payload.email)
        self._validate_email(email)

        existing_identity = self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.identity_type == "email",
                UserAuthIdentity.identity_value == email,
            )
        )
        if existing_identity is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该邮箱已注册")

        display_name = payload.display_name
        now_iso = self.token_service.utcnow().isoformat()
        user = User(
            user_uuid=secrets.token_hex(16),
            status="active",
            display_name=display_name,
            email=email,
            last_login_at=now_iso,
        )
        self.db.add(user)
        self.db.flush()

        identity = UserAuthIdentity(
            user_id=user.id,
            identity_type="email",
            identity_value=email,
            credential_hash=self.password_hash_service.hash_password(payload.password),
            verified_at=None,
            last_used_at=now_iso,
            status="pending",
        )
        self.db.add(identity)
        self.db.add(TranslationPreference(user_id=user.id))
        self.db.flush()

        session_tokens = self.token_service.issue_session_tokens()
        user_session = self._create_user_session(user.id, session_tokens)
        self.db.add(user_session)
        verification_token, verification_draft = self.email_verification_service.issue_registration_token(user, identity)
        self.db.commit()
        self.db.refresh(user_session)
        self.db.refresh(user)

        response = self._build_auth_session_out(user, session_tokens)
        response.message = self._deliver_verification_email(
            user,
            verification_token,
            verification_draft,
            is_retry=False,
        )
        return response

    def login(self, payload: LoginRequest) -> AuthSessionOut:
        email = self._normalize_email(payload.email)
        identity = self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.identity_type == "email",
                UserAuthIdentity.identity_value == email,
            )
        )
        if identity is None or not self.password_hash_service.verify_password(payload.password, identity.credential_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")

        user = self.db.get(User, identity.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        now_iso = self.token_service.utcnow().isoformat()
        identity.last_used_at = now_iso
        user.last_login_at = now_iso

        session_tokens = self.token_service.issue_session_tokens()
        user_session = self._create_user_session(user.id, session_tokens)
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_session_out(user, session_tokens)

    def refresh(self, payload: RefreshTokenRequest) -> AuthSessionOut:
        refresh_token_hash = self.token_service.hash_token(payload.refresh_token)
        session = self.db.scalar(
            select(UserSession).where(UserSession.refresh_token_hash == refresh_token_hash)
        )
        if session is None or session.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新令牌无效")

        now = self.token_service.utcnow()
        if self._normalize_utc_datetime(session.refresh_expires_at) < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新令牌已过期")

        user = self.db.get(User, session.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        tokens = self.token_service.issue_session_tokens()
        session.access_token_hash = self.token_service.hash_token(tokens.access_token)
        session.refresh_token_hash = self.token_service.hash_token(tokens.refresh_token)
        session.access_expires_at = tokens.access_expires_at
        session.refresh_expires_at = tokens.refresh_expires_at
        session.last_seen_at = now
        user.last_login_at = now.isoformat()
        self.db.commit()
        self.db.refresh(user)
        return self._build_auth_session_out(user, tokens)

    def logout(self, session: UserSession) -> None:
        session.revoked_at = self.token_service.utcnow()
        self.db.commit()

    def send_verification_email(self, user: User, email: str) -> str:
        account_email = self._normalize_email(user.email or "")
        if not account_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前账号未绑定邮箱")

        if self._normalize_email(email) != account_email:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="确认邮箱不匹配")

        identity = self._get_email_identity_by_user_id(user.id)
        if identity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前邮箱身份不存在")

        if identity.verified_at:
            return "当前邮箱已验证，无需重复发送"

        self.email_verification_service.ensure_resend_allowed(identity)
        verification_token, verification_draft = self.email_verification_service.issue_registration_token(user, identity)
        self.db.commit()
        return self._deliver_verification_email(user, verification_token, verification_draft, is_retry=True)

    def verify_email_token(self, raw_token: str) -> str:
        try:
            self.email_verification_service.verify_registration_token(raw_token)
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

        return "邮箱验证成功，当前账号已完成验证"

    def delete_account(self, user: User, confirm_email: str) -> None:
        account_email = self._normalize_email(user.email or "")
        if not account_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前账号未绑定邮箱，暂不支持注销")

        if self._normalize_email(confirm_email) != account_email:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="确认邮箱不匹配")

        provider_config_ids = self.db.scalars(
            select(TranslationProviderConfig.id).where(
                TranslationProviderConfig.owner_type == "user",
                TranslationProviderConfig.owner_id == user.id,
            )
        ).all()

        translation_request_delete = sa_delete(TranslationRequest).where(TranslationRequest.user_id == user.id)
        if provider_config_ids:
            translation_request_delete = sa_delete(TranslationRequest).where(
                (TranslationRequest.user_id == user.id)
                | (TranslationRequest.provider_config_id.in_(provider_config_ids))
            )

        try:
            self.db.execute(sa_delete(EmailVerificationToken).where(EmailVerificationToken.user_id == user.id))
            self.db.execute(sa_delete(UserSession).where(UserSession.user_id == user.id))
            self.db.execute(sa_delete(AnnotationSyncJob).where(AnnotationSyncJob.user_id == user.id))
            self.db.execute(sa_delete(AnnotationDocument).where(AnnotationDocument.user_id == user.id))
            self.db.execute(sa_delete(TranslationPreference).where(TranslationPreference.user_id == user.id))
            self.db.execute(translation_request_delete)
            self.db.execute(
                sa_delete(TranslationProviderConfig).where(
                    TranslationProviderConfig.owner_type == "user",
                    TranslationProviderConfig.owner_id == user.id,
                )
            )
            self.db.execute(sa_delete(UserAuthIdentity).where(UserAuthIdentity.user_id == user.id))

            persistent_user = self.db.get(User, user.id)
            if persistent_user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前账号不存在")

            self.db.delete(persistent_user)
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

    def get_auth_context_by_access_token(self, access_token: str) -> AuthContext:
        access_token_hash = self.token_service.hash_token(access_token)
        session = self.db.scalar(
            select(UserSession).where(UserSession.access_token_hash == access_token_hash)
        )
        if session is None or session.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录状态已失效")

        now = self.token_service.utcnow()
        if self._normalize_utc_datetime(session.access_expires_at) < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="访问令牌已过期")

        user = self.db.get(User, session.user_id)
        if user is None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")

        session.last_seen_at = now
        self.db.commit()
        return AuthContext(user=user, session=session)

    @staticmethod
    def build_user_out(
        user: User,
        email_verified: bool = False,
        verification_status: str = "unverified",
    ) -> AuthUserOut:
        return AuthUserOut(
            id=user.id,
            user_uuid=user.user_uuid,
            email=user.email,
            display_name=user.display_name,
            email_verified=email_verified,
            verification_status=verification_status,
        )

    def build_verification_status_out(self, user: User) -> VerificationStatusOut:
        verification_status = self.get_email_verification_status(user.id)
        return VerificationStatusOut(
            email=user.email or "",
            email_verified=verification_status == "verified",
            verification_status=verification_status,
        )

    def get_email_verification_status(self, user_id: int) -> str:
        identity = self._get_email_identity_by_user_id(user_id)
        if identity is None:
            return "unverified"

        if identity.verified_at:
            return "verified"

        if identity.status == "pending":
            return "pending"

        return "unverified"

    def _build_auth_session_out(self, user: User, tokens: SessionTokenPair) -> AuthSessionOut:
        verification_status = self.get_email_verification_status(user.id)
        return AuthSessionOut(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            expires_in=self.token_service.expires_in_seconds(),
            user=self.build_user_out(
                user,
                email_verified=verification_status == "verified",
                verification_status=verification_status,
            ),
        )

    def _create_user_session(self, user_id: int, tokens: SessionTokenPair) -> UserSession:
        return UserSession(
            user_id=user_id,
            access_token_hash=self.token_service.hash_token(tokens.access_token),
            refresh_token_hash=self.token_service.hash_token(tokens.refresh_token),
            access_expires_at=tokens.access_expires_at,
            refresh_expires_at=tokens.refresh_expires_at,
            last_seen_at=self.token_service.utcnow(),
        )

    @staticmethod
    def _normalize_utc_datetime(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    def _get_email_identity_by_user_id(self, user_id: int) -> Optional[UserAuthIdentity]:
        return self.db.scalar(
            select(UserAuthIdentity).where(
                UserAuthIdentity.user_id == user_id,
                UserAuthIdentity.identity_type == "email",
            )
        )

    def _deliver_verification_email(
        self,
        user: User,
        verification_token: EmailVerificationToken,
        verification_draft: VerificationLinkDraft,
        is_retry: bool,
    ) -> str:
        if not user.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前账号未绑定邮箱")

        if not self.email_service.is_configured():
            return (
                "验证邮件服务暂未配置，请稍后在设置页重发"
                if is_retry
                else "账号已创建，但验证邮件服务暂未配置，请稍后在设置页重发"
            )

        if not self.email_verification_service.has_public_verification_url():
            return (
                "当前环境未配置公开验证地址，请稍后重发验证邮件"
                if is_retry
                else "账号已创建，但当前环境未配置公开验证地址，请稍后在设置页重发"
            )

        message = self._build_verification_email_message(user, verification_draft)
        try:
            self.email_service.send(message)
            self.email_verification_service.mark_token_sent(verification_token)
            self.db.commit()
        except Exception:
            self.db.rollback()
            return (
                "验证邮件发送失败，请稍后重试"
                if is_retry
                else "账号已创建，但验证邮件发送失败，请稍后在设置页重发"
            )

        return "验证邮件已发送，请前往邮箱完成验证"

    def _build_verification_email_message(
        self,
        user: User,
        verification_draft: VerificationLinkDraft,
    ) -> EmailMessage:
        display_name = user.display_name or user.email or "明彩用户"
        text_body = (
            f"你好，{display_name}：\n\n"
            "欢迎使用明彩。请点击下方链接完成邮箱验证：\n"
            f"{verification_draft.verification_url}\n\n"
            f"该链接将在 {verification_draft.expires_in_hours} 小时后失效。\n"
            "如果这不是你的操作，请忽略这封邮件。"
        )
        html_body = (
            "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">"
            f"<p>你好，{display_name}：</p>"
            "<p>欢迎使用明彩。请点击下面的按钮完成邮箱验证：</p>"
            f"<p><a href=\"{verification_draft.verification_url}\" "
            "style=\"display:inline-block;padding:10px 18px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none\">"
            "验证邮箱</a></p>"
            f"<p>如果按钮无法点击，请复制以下链接到浏览器打开：<br>{verification_draft.verification_url}</p>"
            f"<p>该链接将在 {verification_draft.expires_in_hours} 小时后失效。</p>"
            "<p>如果这不是你的操作，请忽略这封邮件。</p>"
            "</div>"
        )
        return EmailMessage(
            to_email=user.email,
            subject="请验证你的明彩账号邮箱",
            text_body=text_body,
            html_body=html_body,
        )

    @staticmethod
    def _validate_email(email: str) -> None:
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="邮箱格式无效")