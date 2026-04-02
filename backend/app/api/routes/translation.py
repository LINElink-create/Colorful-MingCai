from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, get_optional_current_user
from app.core.config import get_settings
from app.models.user import User
from app.schemas.translation import (
    ProviderConfigUpdate,
    ProviderStatusOut,
    TranslationPreferenceOut,
    TranslationPreferenceUpdate,
    TranslationRequestIn,
    TranslationResultOut,
)
from app.services.provider_config_service import ProviderConfigService
from app.services.translation_preference_service import TranslationPreferenceService
from app.services.translation_service import TranslationService

router = APIRouter(prefix="/translation", tags=["translation"])


@router.post("/translate", response_model=TranslationResultOut)
async def translate(
    payload: TranslationRequestIn,
    db: Session = Depends(get_db_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> TranslationResultOut:
    service = TranslationService(db=db, settings=get_settings())
    return await service.translate(payload, current_user.id if current_user else None)


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


@router.put("/provider-configs/{provider}", response_model=list[ProviderStatusOut])
async def save_translation_provider_config(
    provider: str,
    payload: ProviderConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[ProviderStatusOut]:
    service = ProviderConfigService(db=db, settings=get_settings())
    return await service.save_user_provider_config(current_user.id, provider, payload)


@router.delete("/provider-configs/{provider}", response_model=list[ProviderStatusOut])
def delete_translation_provider_config(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[ProviderStatusOut]:
    service = ProviderConfigService(db=db, settings=get_settings())
    return service.delete_user_provider_config(current_user.id, provider)
