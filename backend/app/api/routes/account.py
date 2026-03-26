from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.account import ProviderListResponse
from app.services.provider_credential_service import ProviderCredentialService
from app.services.provider_selection_service import ProviderSelectionService

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/providers", response_model=ProviderListResponse)
def list_providers() -> ProviderListResponse:
    credential_service = ProviderCredentialService(get_settings())
    selection_service = ProviderSelectionService(credential_service)
    return ProviderListResponse(providers=selection_service.get_provider_statuses())
