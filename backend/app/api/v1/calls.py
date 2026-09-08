from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.call import (
    CallInitiateRequest,
    CallResponse,
    CallSecurityEventCreate,
    CallSecurityEventResponse,
    ChallengeIssueRequest,
    ChallengeResponse,
    ChallengeVerificationResponse,
    ChallengeVerifyRequest,
    SecurityTelemetryReportRequest,
    SecurityTelemetryResponse,
)
from app.schemas.common import ApiResponse
from app.services.call_service import CallService
from app.services.challenge_service import challenge_service


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


@router.post(
    "/{call_id}/security-analysis",
    response_model=ApiResponse[SecurityTelemetryResponse],
    summary="Submit client-side real-time voice telemetry for multi-signal threat evaluation (ZERO AUDIO TRANSFERRED)",
)
async def submit_security_analysis(
    call_id: str,
    data: SecurityTelemetryReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[SecurityTelemetryResponse]:
    result = await CallService.process_security_analysis(db, call_id, current_user.id, data)
    return ApiResponse.ok(data=result, request_id=req_id)


@router.post(
    "/{call_id}/challenge",
    response_model=ApiResponse[ChallengeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Issue an interactive acoustic passphrase verification challenge for caller/callee",
)
async def issue_verification_challenge(
    call_id: str,
    data: ChallengeIssueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[ChallengeResponse]:
    call = await CallService.get_call(db, call_id, current_user.id)
    target_user_id = data.target_user_id or (call.receiver_id if current_user.id == call.caller_id else call.caller_id)
    challenge = challenge_service.issue_challenge(
        call_id=call_id,
        issued_by_user_id=current_user.id,
        issued_to_user_id=target_user_id,
        timeout_seconds=data.timeout_seconds,
    )
    return ApiResponse.ok(
        data=ChallengeResponse(
            challenge_id=challenge.challenge_id,
            call_id=challenge.call_id,
            passphrase=challenge.passphrase,
            prompt=challenge.prompt,
            expires_at=challenge.expires_at,
            status=challenge.status,
            created_at=challenge.created_at,
        ),
        request_id=req_id,
    )


@router.post(
    "/{call_id}/challenge/verify",
    response_model=ApiResponse[ChallengeVerificationResponse],
    summary="Verify spoken response to active acoustic challenge",
)
async def verify_challenge_response(
    call_id: str,
    data: ChallengeVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[ChallengeVerificationResponse]:
    # Ensure participant authorized
    await CallService.get_call(db, call_id, current_user.id)
    result = challenge_service.verify_challenge(
        call_id=call_id,
        challenge_id=data.challenge_id,
        spoken_phrase=data.spoken_phrase,
        liveness_score=data.liveness_score,
    )
    return ApiResponse.ok(
        data=ChallengeVerificationResponse(
            challenge_id=result.challenge_id,
            call_id=result.call_id,
            status=result.status,
            verified=result.verified,
            details=result.details,
            threat_score_impact=result.threat_score_impact,
            timestamp=result.timestamp,
        ),
        request_id=req_id,
    )


@router.get(
    "/{call_id}/challenge",
    response_model=ApiResponse[Optional[ChallengeResponse]],
    summary="Get active verification challenge for call session",
)
async def get_active_challenge(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[Optional[ChallengeResponse]]:
    await CallService.get_call(db, call_id, current_user.id)
    challenge = challenge_service.get_active_challenge(call_id)
    if not challenge:
        return ApiResponse.ok(data=None, request_id=req_id)
    return ApiResponse.ok(
        data=ChallengeResponse(
            challenge_id=challenge.challenge_id,
            call_id=challenge.call_id,
            passphrase=challenge.passphrase,
            prompt=challenge.prompt,
            expires_at=challenge.expires_at,
            status=challenge.status,
            created_at=challenge.created_at,
        ),
        request_id=req_id,
    )

