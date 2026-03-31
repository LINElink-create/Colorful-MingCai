from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.core.config import get_settings
from app.models.user import User
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
def get_translation_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> TranslationPreferenceOut:
    service = TranslationPreferenceService(db=db)
    return service.get_preferences(current_user.id)


@router.put("/preferences", response_model=TranslationPreferenceOut)
def update_translation_preferences(
    payload: TranslationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> TranslationPreferenceOut:
    service = TranslationPreferenceService(db=db)
    return service.update_preferences(current_user.id, payload)
