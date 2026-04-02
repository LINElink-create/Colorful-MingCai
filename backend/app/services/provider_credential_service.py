from __future__ import annotations

import base64
import hashlib
import json

from cryptography.fernet import Fernet

from app.core.config import Settings


class ProviderCredentialService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def has_platform_youdao_credentials(self) -> bool:
        return bool(self.settings.platform_youdao_app_key and self.settings.platform_youdao_app_secret)

    def has_platform_credentials(self, provider: str) -> bool:
        if provider == "youdao":
            return self.has_platform_youdao_credentials()

        return False

    def get_platform_youdao_credentials(self) -> dict[str, str]:
        return {
            "app_key": self.settings.platform_youdao_app_key,
            "app_secret": self.settings.platform_youdao_app_secret,
        }

    def get_platform_credentials(self, provider: str) -> dict[str, str]:
        if provider == "youdao":
            return self.get_platform_youdao_credentials()

        raise ValueError("unsupported provider")

    def encrypt_provider_payload(self, payload: dict[str, str]) -> tuple[str, str]:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        encrypted_payload = self._get_fernet().encrypt(serialized).decode("utf-8")
        fingerprint = hashlib.sha256(serialized).hexdigest()
        return encrypted_payload, fingerprint

    def decrypt_provider_payload(self, encrypted_payload: str) -> dict[str, str]:
        serialized = self._get_fernet().decrypt(encrypted_payload.encode("utf-8"))
        payload = json.loads(serialized.decode("utf-8"))
        return {str(key): str(value) for key, value in payload.items()}

    @staticmethod
    def mask_secret(secret_value: str) -> str:
        text = secret_value.strip()
        if len(text) <= 6:
            return "***"

        return f"{text[:3]}***{text[-3:]}"

    def _get_fernet(self) -> Fernet:
        seed = self.settings.provider_credential_encryption_key.strip()
        if not seed:
            if self.settings.app_env == "production":
                raise RuntimeError("生产环境缺少 PROVIDER_CREDENTIAL_ENCRYPTION_KEY 配置")
            seed = f"{self.settings.app_name}:development-provider-config"

        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))
