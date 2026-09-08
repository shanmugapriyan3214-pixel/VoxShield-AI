"""VoxShield AI — Voice Profile Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.common import ApiResponse
from app.schemas.voice import VoiceProfileCreate, VoiceProfileResponse, VoiceProfileUpdate
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voices", tags=["Voice Profiles"])


@router.post(
    "",
    response_model=ApiResponse[VoiceProfileResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new voice profile metadata entry",
)
async def create_voice_profile(
    data: VoiceProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[VoiceProfileResponse]:
    profile = await VoiceService.create_profile(db, current_user.id, data)
    return ApiResponse.ok(
        data=VoiceProfileResponse.model_validate(profile),
        request_id=req_id,
    )


@router.get(
    "",
    response_model=ApiResponse[List[VoiceProfileResponse]],
    summary="List registered voice profiles for the authenticated user",
)
async def list_voice_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[VoiceProfileResponse]]:
    profiles = await VoiceService.list_profiles(db, current_user.id)
    return ApiResponse.ok(
        data=[VoiceProfileResponse.model_validate(p) for p in profiles],
        request_id=req_id,
    )


@router.get(
    "/{profile_id}",
    response_model=ApiResponse[VoiceProfileResponse],
    summary="Get voice profile metadata (strictly NO raw embeddings)",
)
async def get_voice_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[VoiceProfileResponse]:
    profile = await VoiceService.get_profile(db, profile_id, current_user.id)
    return ApiResponse.ok(
        data=VoiceProfileResponse.model_validate(profile),
        request_id=req_id,
    )


@router.patch(
    "/{profile_id}",
    response_model=ApiResponse[VoiceProfileResponse],
    summary="Update voice profile label or status",
)
async def update_voice_profile(
    profile_id: str,
    data: VoiceProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[VoiceProfileResponse]:
    updated = await VoiceService.update_profile(db, profile_id, current_user.id, data)
    return ApiResponse.ok(
        data=VoiceProfileResponse.model_validate(updated),
        request_id=req_id,
    )


@router.delete(
    "/{profile_id}",
    response_model=ApiResponse[MessageResponse],
    summary="Delete a registered voice profile",
)
async def delete_voice_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[MessageResponse]:
    await VoiceService.delete_profile(db, profile_id, current_user.id)
    return ApiResponse.ok(
        data=MessageResponse(message="Voice profile deleted successfully."),
        request_id=req_id,
    )
