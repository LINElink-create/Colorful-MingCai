from __future__ import annotations

from app.schemas.translation import ProviderStatusOut
from app.services.provider_credential_service import ProviderCredentialService


class ProviderSelectionService:
    def __init__(self, credential_service: ProviderCredentialService):
        self.credential_service = credential_service

    def get_provider_statuses(self) -> list[ProviderStatusOut]:
        platform_available = self.credential_service.has_platform_youdao_credentials()
        return [
            ProviderStatusOut(
                provider="youdao",
                platform_available=platform_available,
                user_configured=False,
                config_mode="managed" if platform_available else None,
                status="available" if platform_available else "not_configured",
                last_error_code=None,
            )
        ]
