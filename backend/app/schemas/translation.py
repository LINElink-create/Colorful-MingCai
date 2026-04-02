from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel

TranslationProvider = Literal["youdao", "openai_compatible"]
TranslationLanguageCode = Literal["auto", "zh-CHS", "en", "ja", "ko", "fr", "de", "es", "ru"]


class ClientContext(CamelModel):
    extension_version: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None


class TranslationRequestIn(CamelModel):
    text: str = Field(min_length=1, max_length=5000)
    source_language: TranslationLanguageCode = "auto"
    target_language: TranslationLanguageCode = "zh-CHS"
    provider_hint: Optional[TranslationProvider] = None
    client_context: Optional[ClientContext] = None


class TranslationQuota(CamelModel):
    mode: Literal["platform", "user"]
    requests_per_minute: Optional[int] = None
    daily_limit: Optional[int] = None


class TranslationResultOut(CamelModel):
    translated_text: str
    detected_source_language: str
    target_language: str
    provider: TranslationProvider
    request_id: str
    quota: TranslationQuota


class TranslationPreferenceOut(CamelModel):
    default_provider: TranslationProvider
    source_language: TranslationLanguageCode
    target_language: TranslationLanguageCode
    auto_translate_enabled: bool
    updated_at: str


class TranslationPreferenceUpdate(CamelModel):
    default_provider: TranslationProvider = "youdao"
    source_language: TranslationLanguageCode = "auto"
    target_language: TranslationLanguageCode = "zh-CHS"
    auto_translate_enabled: bool = False


class ProviderStatusOut(CamelModel):
    provider: TranslationProvider
    platform_available: bool
    user_configured: bool
    config_mode: Optional[Literal["managed", "byo_key"]] = None
    status: Literal["available", "unavailable", "not_configured"]
    last_error_code: Optional[str] = None
    config_summary: Optional["ProviderConfigSummaryOut"] = None


class ProviderConfigSummaryOut(CamelModel):
    credential_hint: Optional[str] = None
    endpoint_url: Optional[str] = None
    model: Optional[str] = None


class ProviderConfigUpdate(CamelModel):
    youdao_app_key: Optional[str] = Field(default=None, max_length=255)
    youdao_app_secret: Optional[str] = Field(default=None, max_length=255)
    openai_base_url: Optional[str] = Field(default=None, max_length=512)
    openai_api_key: Optional[str] = Field(default=None, max_length=512)
    openai_model: Optional[str] = Field(default=None, max_length=255)
