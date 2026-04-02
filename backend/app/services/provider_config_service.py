from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.integrations.translation.openai_compatible import (
    OpenAICompatibleProviderError,
    OpenAICompatibleTranslationClient,
)
from app.integrations.translation.youdao import YoudaoProviderError, YoudaoTranslationClient
from app.models.translation_provider_config import TranslationProviderConfig
from app.schemas.translation import ProviderConfigSummaryOut, ProviderConfigUpdate, ProviderStatusOut
from app.services.provider_credential_service import ProviderCredentialService


@dataclass
class ProviderBinding:
    provider: str
    mode: str
    actor_type: str
    provider_config_id: Optional[int]
    client: object


class ProviderConfigService:
    SUPPORTED_PROVIDERS = ("youdao", "openai_compatible")

    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        self.credential_service = ProviderCredentialService(settings)

    def list_provider_statuses(self, user_id: Optional[int] = None) -> list[ProviderStatusOut]:
        return [self._build_provider_status(provider, user_id) for provider in self.SUPPORTED_PROVIDERS]

    async def save_user_provider_config(
        self,
        user_id: int,
        provider: str,
        payload: ProviderConfigUpdate,
    ) -> list[ProviderStatusOut]:
        normalized_provider = self._normalize_provider(provider)
        credential_payload = self._build_credential_payload(normalized_provider, payload)
        await self._validate_credentials(normalized_provider, credential_payload)

        encrypted_payload, fingerprint = self.credential_service.encrypt_provider_payload(credential_payload)
        config = self._get_user_provider_config(user_id, normalized_provider)
        if config is None:
            config = TranslationProviderConfig(
                owner_type="user",
                owner_id=user_id,
                provider=normalized_provider,
            )
            self.db.add(config)

        now_iso = datetime.now(timezone.utc).isoformat()
        config.config_mode = "byo_key"
        config.credential_payload_encrypted = encrypted_payload
        config.credential_fingerprint = fingerprint
        config.status = "active"
        config.last_checked_at = now_iso
        config.last_error_code = None
        self.db.commit()

        return self.list_provider_statuses(user_id)

    def delete_user_provider_config(self, user_id: int, provider: str) -> list[ProviderStatusOut]:
        normalized_provider = self._normalize_provider(provider)
        config = self._get_user_provider_config(user_id, normalized_provider)
        if config is not None:
            self.db.delete(config)
            self.db.commit()

        return self.list_provider_statuses(user_id)

    def select_provider_binding(self, provider: str, user_id: Optional[int] = None) -> ProviderBinding:
        normalized_provider = self._normalize_provider(provider)
        user_config = self._get_user_provider_config(user_id, normalized_provider) if user_id else None
        if user_config and user_config.credential_payload_encrypted:
            credentials = self.credential_service.decrypt_provider_payload(user_config.credential_payload_encrypted)
            return ProviderBinding(
                provider=normalized_provider,
                mode="user",
                actor_type="user",
                provider_config_id=user_config.id,
                client=self._build_client(normalized_provider, credentials),
            )

        if self.credential_service.has_platform_credentials(normalized_provider):
            credentials = self.credential_service.get_platform_credentials(normalized_provider)
            return ProviderBinding(
                provider=normalized_provider,
                mode="platform",
                actor_type="authenticated" if user_id else "anonymous",
                provider_config_id=None,
                client=self._build_client(normalized_provider, credentials),
            )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{self._provider_display_name(normalized_provider)}尚未配置，请先在设置中填写 API 信息",
        )

    def mark_provider_error(self, provider_config_id: Optional[int], error_code: str) -> None:
        if provider_config_id is None:
            return

        config = self.db.get(TranslationProviderConfig, provider_config_id)
        if config is None:
            return

        config.status = "error"
        config.last_error_code = error_code
        config.last_checked_at = datetime.now(timezone.utc).isoformat()

    def mark_provider_success(self, provider_config_id: Optional[int]) -> None:
        if provider_config_id is None:
            return

        config = self.db.get(TranslationProviderConfig, provider_config_id)
        if config is None:
            return

        config.status = "active"
        config.last_error_code = None
        config.last_checked_at = datetime.now(timezone.utc).isoformat()

    def _get_user_provider_config(self, user_id: Optional[int], provider: str) -> Optional[TranslationProviderConfig]:
        if user_id is None:
            return None

        return self.db.scalar(
            select(TranslationProviderConfig).where(
                TranslationProviderConfig.owner_type == "user",
                TranslationProviderConfig.owner_id == user_id,
                TranslationProviderConfig.provider == provider,
            )
        )

    def _build_provider_status(self, provider: str, user_id: Optional[int]) -> ProviderStatusOut:
        platform_available = self.credential_service.has_platform_credentials(provider)
        user_config = self._get_user_provider_config(user_id, provider)

        if user_config is not None:
            config_summary = self._build_config_summary(provider, user_config)
            if user_config.status == "active":
                return ProviderStatusOut(
                    provider=provider,
                    platform_available=platform_available,
                    user_configured=True,
                    config_mode="byo_key",
                    status="available",
                    last_error_code=user_config.last_error_code,
                    config_summary=config_summary,
                )

            return ProviderStatusOut(
                provider=provider,
                platform_available=platform_available,
                user_configured=True,
                config_mode="byo_key",
                status="unavailable",
                last_error_code=user_config.last_error_code,
                config_summary=config_summary,
            )

        if platform_available:
            return ProviderStatusOut(
                provider=provider,
                platform_available=True,
                user_configured=False,
                config_mode="managed",
                status="available",
                last_error_code=None,
                config_summary=None,
            )

        return ProviderStatusOut(
            provider=provider,
            platform_available=False,
            user_configured=False,
            config_mode=None,
            status="not_configured",
            last_error_code=None,
            config_summary=None,
        )

    def _build_config_summary(
        self,
        provider: str,
        config: TranslationProviderConfig,
    ) -> Optional[ProviderConfigSummaryOut]:
        if not config.credential_payload_encrypted:
            return None

        payload = self.credential_service.decrypt_provider_payload(config.credential_payload_encrypted)
        if provider == "youdao":
            return ProviderConfigSummaryOut(
                credential_hint=f"App Key {self.credential_service.mask_secret(payload.get('app_key', ''))}",
            )

        return ProviderConfigSummaryOut(
            credential_hint=f"API Key {self.credential_service.mask_secret(payload.get('api_key', ''))}",
            endpoint_url=payload.get("base_url"),
            model=payload.get("model"),
        )

    def _build_credential_payload(self, provider: str, payload: ProviderConfigUpdate) -> dict[str, str]:
        if provider == "youdao":
            app_key = (payload.youdao_app_key or "").strip()
            app_secret = (payload.youdao_app_secret or "").strip()
            if not app_key or not app_secret:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请填写完整的有道 App Key 与 App Secret")

            return {
                "app_key": app_key,
                "app_secret": app_secret,
            }

        base_url = (payload.openai_base_url or "").strip().rstrip("/")
        api_key = (payload.openai_api_key or "").strip()
        model = (payload.openai_model or "").strip()
        if not base_url or not api_key or not model:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请填写完整的 OpenAI 兼容接口 Base URL、API Key 与 Model")

        return {
            "base_url": base_url,
            "api_key": api_key,
            "model": model,
        }

    async def _validate_credentials(self, provider: str, credential_payload: dict[str, str]) -> None:
        client = self._build_client(provider, credential_payload)
        try:
            await client.translate("Hello", "en", "zh-CHS")
        except (YoudaoProviderError, OpenAICompatibleProviderError) as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    @staticmethod
    def _normalize_provider(provider: str) -> str:
        normalized_provider = provider.strip().lower()
        if normalized_provider not in ProviderConfigService.SUPPORTED_PROVIDERS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="不支持的翻译服务商")

        return normalized_provider

    def _build_client(self, provider: str, credentials: dict[str, str]):
        if provider == "youdao":
            return YoudaoTranslationClient(
                app_key=credentials.get("app_key", ""),
                app_secret=credentials.get("app_secret", ""),
            )

        return OpenAICompatibleTranslationClient(
            base_url=credentials.get("base_url", ""),
            api_key=credentials.get("api_key", ""),
            model=credentials.get("model", ""),
        )

    @staticmethod
    def _provider_display_name(provider: str) -> str:
        return "有道翻译" if provider == "youdao" else "OpenAI 兼容接口"
