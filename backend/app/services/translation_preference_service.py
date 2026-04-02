from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.translation_preference import TranslationPreference
from app.schemas.translation import TranslationPreferenceOut, TranslationPreferenceUpdate


class TranslationPreferenceService:
    def __init__(self, db: Session):
        self.db = db

    def get_preferences(self, user_id: int) -> TranslationPreferenceOut:
        preference = self.db.scalar(
            select(TranslationPreference).where(TranslationPreference.user_id == user_id)
        )

        if preference is None:
            preference = TranslationPreference(user_id=user_id)
            self.db.add(preference)
            self.db.commit()
            self.db.refresh(preference)

        return TranslationPreferenceOut(
            default_provider=preference.default_provider,
            source_language=preference.source_language,
            target_language=preference.target_language,
            auto_translate_enabled=preference.auto_translate_enabled,
            updated_at=preference.updated_at.isoformat(),
        )

    def update_preferences(self, user_id: int, payload: TranslationPreferenceUpdate) -> TranslationPreferenceOut:
        preference = self.db.scalar(
            select(TranslationPreference).where(TranslationPreference.user_id == user_id)
        )

        if preference is None:
            preference = TranslationPreference(user_id=user_id)
            self.db.add(preference)

        preference.default_provider = payload.default_provider
        preference.source_language = payload.source_language
        preference.target_language = payload.target_language
        preference.auto_translate_enabled = payload.auto_translate_enabled
        preference.updated_by = "user"

        self.db.commit()
        self.db.refresh(preference)
        return TranslationPreferenceOut(
            default_provider=preference.default_provider,
            source_language=preference.source_language,
            target_language=preference.target_language,
            auto_translate_enabled=preference.auto_translate_enabled,
            updated_at=preference.updated_at.isoformat(),
        )
