from __future__ import annotations

from time import perf_counter
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.integrations.translation.openai_compatible import OpenAICompatibleProviderError
from app.integrations.translation.youdao import YoudaoProviderError, YoudaoTranslationClient
from app.repositories.translation_request_repository import TranslationRequestRepository
from app.schemas.translation import TranslationQuota, TranslationRequestIn, TranslationResultOut
from app.services.access_control_service import AccessControlService
from app.services.provider_credential_service import ProviderCredentialService
from app.services.provider_config_service import ProviderConfigService


class TranslationService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        self.request_repository = TranslationRequestRepository(db)
        self.access_control_service = AccessControlService(settings)
        self.credential_service = ProviderCredentialService(settings)
        self.provider_config_service = ProviderConfigService(db, settings)

    async def translate(self, payload: TranslationRequestIn, current_user_id: Optional[int] = None) -> TranslationResultOut:
        if not self.settings.platform_translation_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="平台翻译服务当前未启用",
            )

        provider_name = payload.provider_hint or self.settings.default_translation_provider
        binding = self.provider_config_service.select_provider_binding(provider_name, current_user_id)
        request_log = self.request_repository.create_request_log(
            user_id=current_user_id,
            actor_type=binding.actor_type,
            provider=binding.provider,
            provider_config_id=binding.provider_config_id,
            source_language=payload.source_language,
            target_language=payload.target_language,
            text=payload.text,
        )

        started_at = perf_counter()

        try:
            translation = await binding.client.translate(
                payload.text,
                payload.source_language,
                payload.target_language,
            )
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_success(request_log, translation["translated_text"], latency_ms)
            self.provider_config_service.mark_provider_success(binding.provider_config_id)
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except (YoudaoProviderError, OpenAICompatibleProviderError) as error:
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_failure(request_log, error.error_code, str(error), latency_ms)
            self.provider_config_service.mark_provider_error(binding.provider_config_id, error.error_code)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error
        except Exception as error:
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_failure(request_log, "provider_error", str(error), latency_ms)
            self.provider_config_service.mark_provider_error(binding.provider_config_id, "provider_error")
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="翻译供应商调用失败",
            ) from error

        quota = self.access_control_service.get_platform_quota()
        return TranslationResultOut(
            translated_text=translation["translated_text"],
            detected_source_language=translation["detected_source_language"],
            target_language=translation["target_language"],
            provider=translation["provider"],
            request_id=request_log.request_id,
            quota=TranslationQuota(mode="user" if binding.mode == "user" else "platform", **quota),
        )
