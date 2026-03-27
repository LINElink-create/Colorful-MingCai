from __future__ import annotations

from time import perf_counter

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.integrations.translation.youdao import YoudaoProviderError, YoudaoTranslationClient
from app.repositories.translation_request_repository import TranslationRequestRepository
from app.schemas.translation import TranslationQuota, TranslationRequestIn, TranslationResultOut
from app.services.access_control_service import AccessControlService
from app.services.provider_credential_service import ProviderCredentialService


class TranslationService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        self.request_repository = TranslationRequestRepository(db)
        self.access_control_service = AccessControlService(settings)
        self.credential_service = ProviderCredentialService(settings)

    async def translate(self, payload: TranslationRequestIn) -> TranslationResultOut:
        if not self.settings.platform_translation_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="平台翻译服务当前未启用",
            )

        if not self.credential_service.has_platform_youdao_credentials():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="平台翻译服务尚未配置供应商凭据",
            )

        provider_name = payload.provider_hint or self.settings.default_translation_provider
        request_log = self.request_repository.create_request_log(
            user_id=None,
            actor_type="anonymous",
            provider=provider_name,
            provider_config_id=None,
            source_language=payload.source_language,
            target_language=payload.target_language,
            text=payload.text,
        )

        started_at = perf_counter()

        try:
            credentials = self.credential_service.get_platform_youdao_credentials()
            client = YoudaoTranslationClient(
                app_key=credentials["app_key"],
                app_secret=credentials["app_secret"],
            )
            translation = await client.translate(
                payload.text,
                payload.source_language,
                payload.target_language,
            )
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_success(request_log, translation["translated_text"], latency_ms)
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except YoudaoProviderError as error:
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_failure(request_log, error.error_code, str(error), latency_ms)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error
        except Exception as error:
            latency_ms = int((perf_counter() - started_at) * 1000)
            self.request_repository.mark_failure(request_log, "provider_error", str(error), latency_ms)
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
            provider="youdao",
            request_id=request_log.request_id,
            quota=TranslationQuota(mode="platform", **quota),
        )
