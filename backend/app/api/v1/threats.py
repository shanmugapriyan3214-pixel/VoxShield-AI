"""VoxShield AI — Threat History & Telemetry Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.threat import (
    ThreatEventResponse,
    ThreatSummaryResponse,
    ThreatTimelineResponse,
)
from app.services.threat_service import ThreatService

router = APIRouter(prefix="/threats", tags=["Threat Intelligence"])


@router.get(
    "",
    response_model=ApiResponse[List[ThreatEventResponse]],
    summary="List historical threat events with optional severity and call filters",
)
async def list_threats(
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    call_id: Optional[str] = Query(None, description="Filter by specific call session ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[ThreatEventResponse]]:
    events = await ThreatService.list_events(
        db,
        user_id=current_user.id,
        severity=severity,
        event_type=event_type,
        call_id=call_id,
        limit=limit,
        offset=offset,
    )
    return ApiResponse.ok(
        data=[ThreatEventResponse.model_validate(e) for e in events],
        request_id=req_id,
    )


@router.get(
    "/summary",
    response_model=ApiResponse[ThreatSummaryResponse],
    summary="Get aggregated threat metrics and severity breakdown",
)
async def get_threat_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[ThreatSummaryResponse]:
    summary = await ThreatService.get_summary(db, current_user.id)
    return ApiResponse.ok(data=summary, request_id=req_id)


@router.get(
    "/timeline",
    response_model=ApiResponse[ThreatTimelineResponse],
    summary="Get daily time-series buckets of threat activity for charts",
)
async def get_threat_timeline(
    days: int = Query(7, ge=1, le=90, description="Number of historical days to chart"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[ThreatTimelineResponse]:
    timeline = await ThreatService.get_timeline(db, current_user.id, days=days)
    return ApiResponse.ok(data=timeline, request_id=req_id)


@router.get(
    "/{threat_id}",
    response_model=ApiResponse[ThreatEventResponse],
    summary="Get full details of a specific threat event",
)
async def get_threat_event(
    threat_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[ThreatEventResponse]:
    event = await ThreatService.get_by_id(db, threat_id, current_user.id)
    return ApiResponse.ok(
        data=ThreatEventResponse.model_validate(event),
        request_id=req_id,
    )
