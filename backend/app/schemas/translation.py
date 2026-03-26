from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

TranslationProvider = Literal["youdao"]
TranslationLanguageCode = Literal["auto", "zh-CHS", "en", "ja", "ko", "fr", "de", "es", "ru"]


class ClientContext(BaseModel):
    extension_version: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None


class TranslationRequestIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_language: TranslationLanguageCode = "auto"
    target_language: TranslationLanguageCode = "zh-CHS"
    provider_hint: Optional[TranslationProvider] = None
    client_context: Optional[ClientContext] = None


class TranslationQuota(BaseModel):
    mode: Literal["platform", "user"]
    requests_per_minute: Optional[int] = None
    daily_limit: Optional[int] = None


class TranslationResultOut(BaseModel):
    translated_text: str
    detected_source_language: str
    target_language: str
    provider: TranslationProvider
    request_id: str
    quota: TranslationQuota


class TranslationPreferenceOut(BaseModel):
    default_provider: TranslationProvider
    source_language: TranslationLanguageCode
    target_language: TranslationLanguageCode
    auto_translate_enabled: bool


class TranslationPreferenceUpdate(BaseModel):
    default_provider: TranslationProvider = "youdao"
    source_language: TranslationLanguageCode = "auto"
    target_language: TranslationLanguageCode = "zh-CHS"
    auto_translate_enabled: bool = False


class ProviderStatusOut(BaseModel):
    provider: TranslationProvider
    platform_available: bool
    user_configured: bool
    config_mode: Optional[Literal["managed", "byo_key"]] = None
    status: Literal["available", "unavailable", "not_configured"]
    last_error_code: Optional[str] = None
