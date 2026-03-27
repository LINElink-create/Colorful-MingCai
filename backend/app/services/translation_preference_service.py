from __future__ import annotations

from app.schemas.translation import TranslationPreferenceOut, TranslationPreferenceUpdate


class TranslationPreferenceService:
    def get_preferences(self) -> TranslationPreferenceOut:
        return TranslationPreferenceOut(
            default_provider="youdao",
            source_language="auto",
            target_language="zh-CHS",
            auto_translate_enabled=False,
        )

    def update_preferences(self, payload: TranslationPreferenceUpdate) -> TranslationPreferenceOut:
        return TranslationPreferenceOut(**payload.model_dump())
