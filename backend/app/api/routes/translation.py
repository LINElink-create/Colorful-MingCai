from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.config import get_settings
from app.schemas.translation import (
    TranslationPreferenceOut,
    TranslationPreferenceUpdate,
    TranslationRequestIn,
    TranslationResultOut,
)
from app.services.translation_preference_service import TranslationPreferenceService
from app.services.translation_service import TranslationService

router = APIRouter(prefix="/translation", tags=["translation"])


@router.post("/translate", response_model=TranslationResultOut)
async def translate(
    payload: TranslationRequestIn,
    db: Session = Depends(get_db_session),
) -> TranslationResultOut:
    service = TranslationService(db=db, settings=get_settings())
    return await service.translate(payload)


@router.get("/preferences", response_model=TranslationPreferenceOut)
def get_translation_preferences() -> TranslationPreferenceOut:
    service = TranslationPreferenceService()
    return service.get_preferences()


@router.put("/preferences", response_model=TranslationPreferenceOut)
def update_translation_preferences(payload: TranslationPreferenceUpdate) -> TranslationPreferenceOut:
    service = TranslationPreferenceService()
    return service.update_preferences(payload)
