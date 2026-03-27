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

    @property
    def sqlalchemy_database_uri(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
