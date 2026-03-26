from __future__ import annotations

from app.core.config import Settings


class ProviderCredentialService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def has_platform_youdao_credentials(self) -> bool:
        return bool(self.settings.platform_youdao_app_key and self.settings.platform_youdao_app_secret)

    def get_platform_youdao_credentials(self) -> dict[str, str]:
        return {
            "app_key": self.settings.platform_youdao_app_key,
            "app_secret": self.settings.platform_youdao_app_secret,
        }
