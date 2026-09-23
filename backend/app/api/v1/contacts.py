"""VoxShield AI — Contacts API-First Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.common import ApiResponse
from app.schemas.trusted_voice import (
    TrustedVoiceCreate,
    TrustedVoiceResponse,
    TrustedVoiceUpdate,
)
from app.services.trusted_voice_service import TrustedVoiceService

router = APIRouter(prefix="/contacts", tags=["Contacts & Trusted Voices"])


@router.post(
    "",
    response_model=ApiResponse[TrustedVoiceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create or register a contact for voice security verification",
)
async def create_contact(
    data: TrustedVoiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[TrustedVoiceResponse]:
    contact = await TrustedVoiceService.create_contact(db, current_user.id, data)
    return ApiResponse.ok(
        data=TrustedVoiceResponse.model_validate(contact),
        request_id=req_id,
    )


@router.get(
    "",
    response_model=ApiResponse[List[TrustedVoiceResponse]],
    summary="List all phone contacts registered for authenticated user",
)
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[TrustedVoiceResponse]]:
    contacts = await TrustedVoiceService.list_contacts(db, current_user.id)
    return ApiResponse.ok(
        data=[TrustedVoiceResponse.model_validate(c) for c in contacts],
        request_id=req_id,
    )


@router.get(
    "/{contact_id}",
    response_model=ApiResponse[TrustedVoiceResponse],
    summary="Get details and trust status of a specific contact",
)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[TrustedVoiceResponse]:
    contact = await TrustedVoiceService.get_contact(db, contact_id, current_user.id)
    return ApiResponse.ok(
        data=TrustedVoiceResponse.model_validate(contact),
        request_id=req_id,
    )


@router.patch(
    "/{contact_id}",
    response_model=ApiResponse[TrustedVoiceResponse],
    summary="Update relationship, display name, or status of a contact",
)
async def update_contact(
    contact_id: str,
    data: TrustedVoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[TrustedVoiceResponse]:
    updated = await TrustedVoiceService.update_contact(db, contact_id, current_user.id, data)
    return ApiResponse.ok(
        data=TrustedVoiceResponse.model_validate(updated),
        request_id=req_id,
    )


@router.delete(
    "/{contact_id}",
    response_model=ApiResponse[MessageResponse],
    summary="Delete a contact entry",
)
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[MessageResponse]:
    await TrustedVoiceService.delete_contact(db, contact_id, current_user.id)
    return ApiResponse.ok(
        data=MessageResponse(message="Contact entry deleted successfully."),
        request_id=req_id,
    )
