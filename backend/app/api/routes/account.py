from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_optional_current_user
from app.core.config import get_settings
from app.models.user import User
from app.schemas.account import ProviderListResponse
from app.services.provider_config_service import ProviderConfigService

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/providers", response_model=ProviderListResponse)
def list_providers(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db_session),
) -> ProviderListResponse:
    selection_service = ProviderConfigService(db=db, settings=get_settings())
    return ProviderListResponse(
        providers=selection_service.list_provider_statuses(current_user.id if current_user else None)
    )
