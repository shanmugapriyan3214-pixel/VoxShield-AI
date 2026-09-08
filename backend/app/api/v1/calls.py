"""VoxShield AI — Call Lifecycle & Telemetry Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.call import (
    CallInitiateRequest,
    CallResponse,
    CallSecurityEventCreate,
    CallSecurityEventResponse,
)
from app.schemas.common import ApiResponse
from app.services.call_service import CallService

router = APIRouter(prefix="/calls", tags=["Calls & WebRTC Lifecycle"])


@router.post(
    "",
    response_model=ApiResponse[CallResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a secure peer-to-peer voice call session (creates RINGING state)",
)
async def initiate_call(
    data: CallInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallResponse]:
    call = await CallService.initiate_call(db, current_user.id, data)
    return ApiResponse.ok(
        data=CallResponse.model_validate(call),
        request_id=req_id,
    )


@router.get(
    "",
    response_model=ApiResponse[List[CallResponse]],
    summary="List past and active voice call sessions for authenticated user",
)
async def list_calls(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[CallResponse]]:
    calls = await CallService.list_calls(db, current_user.id, limit=limit, offset=offset)
    return ApiResponse.ok(
        data=[CallResponse.model_validate(c) for c in calls],
        request_id=req_id,
    )


@router.get(
    "/{call_id}",
    response_model=ApiResponse[CallResponse],
    summary="Get status and metadata for a specific call session",
)
async def get_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallResponse]:
    call = await CallService.get_call(db, call_id, current_user.id)
    return ApiResponse.ok(
        data=CallResponse.model_validate(call),
        request_id=req_id,
    )


@router.post(
    "/{call_id}/accept",
    response_model=ApiResponse[CallResponse],
    summary="Accept an incoming call session",
)
async def accept_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallResponse]:
    call = await CallService.accept_call(db, call_id, current_user.id)
    return ApiResponse.ok(
        data=CallResponse.model_validate(call),
        request_id=req_id,
    )


@router.post(
    "/{call_id}/reject",
    response_model=ApiResponse[CallResponse],
    summary="Reject an incoming call session",
)
async def reject_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallResponse]:
    call = await CallService.reject_call(db, call_id, current_user.id)
    return ApiResponse.ok(
        data=CallResponse.model_validate(call),
        request_id=req_id,
    )


@router.post(
    "/{call_id}/end",
    response_model=ApiResponse[CallResponse],
    summary="Terminate an active voice call",
)
async def end_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallResponse]:
    call = await CallService.end_call(db, call_id, current_user.id)
    return ApiResponse.ok(
        data=CallResponse.model_validate(call),
        request_id=req_id,
    )


@router.post(
    "/{call_id}/security-events",
    response_model=ApiResponse[CallSecurityEventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest client-side real-time AI security detection alert (Never contains audio)",
)
async def submit_security_event(
    call_id: str,
    data: CallSecurityEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[CallSecurityEventResponse]:
    event = await CallService.record_security_event(db, call_id, current_user.id, data)
    return ApiResponse.ok(
        data=CallSecurityEventResponse.model_validate(event),
        request_id=req_id,
    )


@router.get(
    "/{call_id}/security-events",
    response_model=ApiResponse[List[CallSecurityEventResponse]],
    summary="List all security telemetry events recorded during a specific call",
)
async def list_security_events(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[CallSecurityEventResponse]]:
    events = await CallService.list_security_events(db, call_id, current_user.id)
    return ApiResponse.ok(
        data=[CallSecurityEventResponse.model_validate(e) for e in events],
        request_id=req_id,
    )
