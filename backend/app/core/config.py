from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_ROOT / '.env'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding='utf-8', extra='ignore')

    app_name: str = Field(default="Mingcai Backend", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="127.0.0.1", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    deploy_env: str = Field(default="local", alias="DEPLOY_ENV")
    server_public_base_url: str = Field(default="", alias="SERVER_PUBLIC_BASE_URL")
    trusted_proxies_raw: str = Field(default="", alias="TRUSTED_PROXIES")
    app_port: int = Field(default=8000, alias="APP_PORT")

    mysql_host: str = Field(default="127.0.0.1", alias="MYSQL_HOST")
    mysql_port: int = Field(default=3306, alias="MYSQL_PORT")
    mysql_user: str = Field(default="mingcai", alias="MYSQL_USER")
    mysql_password: str = Field(default="mingcai_dev", alias="MYSQL_PASSWORD")
    mysql_database: str = Field(default="mingcai", alias="MYSQL_DATABASE")
    database_echo: bool = Field(default=False, alias="DATABASE_ECHO")

    default_translation_provider: str = Field(default="youdao", alias="DEFAULT_TRANSLATION_PROVIDER")
    platform_translation_enabled: bool = Field(default=True, alias="PLATFORM_TRANSLATION_ENABLED")
    platform_youdao_app_key: str = Field(default="", alias="PLATFORM_YOUDAO_APP_KEY")
    platform_youdao_app_secret: str = Field(default="", alias="PLATFORM_YOUDAO_APP_SECRET")
    platform_requests_per_minute: int = Field(default=30, alias="PLATFORM_REQUESTS_PER_MINUTE")
    platform_daily_limit: int = Field(default=5000, alias="PLATFORM_DAILY_LIMIT")
    cors_origins_raw: str = Field(default="", alias="CORS_ORIGINS")
    auth_access_token_ttl_minutes: int = Field(default=60, alias="AUTH_ACCESS_TOKEN_TTL_MINUTES")
    auth_refresh_token_ttl_days: int = Field(default=30, alias="AUTH_REFRESH_TOKEN_TTL_DAYS")
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    smtp_from_name: str = Field(default="明彩", alias="SMTP_FROM_NAME")
    auth_email_verification_token_ttl_hours: int = Field(default=24, alias="AUTH_EMAIL_VERIFICATION_TOKEN_TTL_HOURS")
    auth_email_verification_resend_cooldown_seconds: int = Field(default=300, alias="AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS")
    auth_email_verification_success_path: str = Field(default="/verify-email/success", alias="AUTH_EMAIL_VERIFICATION_SUCCESS_PATH")

    @property
    def sqlalchemy_database_uri(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def trusted_proxies(self) -> list[str]:
        return [proxy.strip() for proxy in self.trusted_proxies_raw.split(",") if proxy.strip()]

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def email_verification_success_url(self) -> str:
        base_url = self.server_public_base_url.rstrip("/")
        path = self.auth_email_verification_success_path.strip()
        if not base_url or not path:
            return ""

        return f"{base_url}/{path.lstrip('/')}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
