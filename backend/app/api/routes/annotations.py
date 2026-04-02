from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.annotation_sync import AnnotationBundlePayload, AnnotationDocumentListOut, AnnotationDocumentSyncOut
from app.services.annotation_document_service import AnnotationDocumentService

router = APIRouter(prefix="/annotations", tags=["annotations"])


def get_annotation_document_service(db: Session = Depends(get_db_session)) -> AnnotationDocumentService:
    return AnnotationDocumentService(db=db)


@router.get("/documents", response_model=AnnotationDocumentListOut)
def list_documents(
    current_user: User = Depends(get_current_user),
    service: AnnotationDocumentService = Depends(get_annotation_document_service),
) -> AnnotationDocumentListOut:
    return service.list_bundle(current_user.id)


@router.put("/documents/bulk", response_model=AnnotationDocumentSyncOut)
def replace_documents(
    payload: AnnotationBundlePayload,
    current_user: User = Depends(get_current_user),
    service: AnnotationDocumentService = Depends(get_annotation_document_service),
) -> AnnotationDocumentSyncOut:
    return service.replace_bundle(current_user.id, payload)