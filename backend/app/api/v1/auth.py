"""VoxShield AI — Authentication Endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.auth import (
    AuthResponseData,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
)
from app.schemas.common import ApiResponse
from app.schemas.user import UserPrivate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponseData],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AuthResponseData]:
    user = await AuthService.register_user(db, data)
    tokens = await AuthService.create_tokens_for_user(db, user)
    return ApiResponse.ok(
        data=AuthResponseData(user=UserPrivate.model_validate(user), tokens=tokens),
        request_id=req_id,
    )


@router.post(
    "/login",
    response_model=ApiResponse[AuthResponseData],
    summary="Authenticate user and obtain JWT tokens",
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AuthResponseData]:
    user = await AuthService.authenticate_user(db, data.email, data.password)
    tokens = await AuthService.create_tokens_for_user(db, user)
    return ApiResponse.ok(
        data=AuthResponseData(user=UserPrivate.model_validate(user), tokens=tokens),
        request_id=req_id,
    )


@router.post(
    "/refresh",
    response_model=ApiResponse[AuthResponseData],
    summary="Refresh access token with single-use rotation",
)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AuthResponseData]:
    user, tokens = await AuthService.refresh_tokens(db, data.refresh_token)
    return ApiResponse.ok(
        data=AuthResponseData(user=UserPrivate.model_validate(user), tokens=tokens),
        request_id=req_id,
    )


@router.post(
    "/logout",
    response_model=ApiResponse[MessageResponse],
    summary="Revoke session refresh token",
)
async def logout(
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[MessageResponse]:
    await AuthService.revoke_refresh_token(db, data.refresh_token)
    return ApiResponse.ok(
        data=MessageResponse(message="Successfully logged out and session revoked."),
        request_id=req_id,
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserPrivate],
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[UserPrivate]:
    return ApiResponse.ok(
        data=UserPrivate.model_validate(current_user),
        request_id=req_id,
    )


@router.post(
    "/change-password",
    response_model=ApiResponse[MessageResponse],
    summary="Change user password and invalidate active sessions",
)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[MessageResponse]:
    await AuthService.change_password(
        db,
        current_user,
        data.current_password,
        data.new_password,
    )
    return ApiResponse.ok(
        data=MessageResponse(message="Password successfully updated. All other sessions terminated."),
        request_id=req_id,
    )
