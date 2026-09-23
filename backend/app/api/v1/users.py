from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.core.exceptions import ResourceNotFoundException
from app.db.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserPrivate, UserPublic, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/lookup",
    response_model=ApiResponse[List[UserPublic]],
    summary="Search users by VoxShield ID, username, or display name for dialing",
)
async def lookup_users(
    q: str = Query(..., min_length=1, max_length=50, description="Query string"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[UserPublic]]:
    query_str = q.strip()
    conditions = [
        User.voxshield_id.ilike(f"%{query_str}%"),
        User.username.ilike(f"%{query_str}%"),
        User.display_name.ilike(f"%{query_str}%"),
        User.id == query_str,
    ]
    if query_str.upper().startswith("VS-"):
        clean_part = query_str[3:].replace("-", "").lower()
        conditions.append(User.id.like(f"{clean_part}%"))

    stmt = (
        select(User)
        .where(
            User.is_active == True,
            User.id != current_user.id,
            or_(*conditions),
        )
        .limit(limit)
    )
    results = (await db.execute(stmt)).scalars().all()
    return ApiResponse.ok(
        data=[UserPublic.model_validate(u) for u in results],
        request_id=req_id,
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserPrivate],
    summary="Get detailed profile of currently authenticated user",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[UserPrivate]:
    return ApiResponse.ok(
        data=UserPrivate.model_validate(current_user),
        request_id=req_id,
    )


@router.patch(
    "/me",
    response_model=ApiResponse[UserPrivate],
    summary="Update display name or avatar URL for authenticated user",
)
async def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[UserPrivate]:
    updated_user = await UserService.update_profile(db, current_user, data)
    return ApiResponse.ok(
        data=UserPrivate.model_validate(updated_user),
        request_id=req_id,
    )


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserPublic],
    summary="Get public profile of any active platform user",
)
async def get_user_public_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[UserPublic]:
    user = await UserService.get_by_id(db, user_id)
    if not user or not user.is_active:
        raise ResourceNotFoundException(f"User with ID '{user_id}' not found.")

    return ApiResponse.ok(
        data=UserPublic.model_validate(user),
        request_id=req_id,
    )
