"""VoxShield AI — Security API-First Endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.incident import IncidentResponse
from app.services.incident_service import IncidentService
from app.services.threat_service import ThreatService

router = APIRouter(prefix="/security", tags=["Security & Incident Operations"])


@router.get(
    "/summary",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Get user-specific real-time voice security summary and incident statistics",
)
async def get_security_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[Dict[str, Any]]:
    summary = await ThreatService.get_user_summary(db, current_user.id)
    incidents = await IncidentService.list_incidents(db, current_user.id, limit=100)
    return ApiResponse.ok(
        data={
            "protection_active": True,
            "zero_server_audio_enforced": True,
            "threat_summary": summary,
            "total_incidents": len(incidents),
            "unresolved_incidents": sum(1 for inc in incidents if inc.status == "UNRESOLVED"),
        },
        request_id=req_id,
    )


@router.get(
    "/incidents",
    response_model=ApiResponse[List[IncidentResponse]],
    summary="List cryptographic security incidents recorded for the authenticated user",
)
async def list_security_incidents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[IncidentResponse]]:
    incidents = await IncidentService.list_incidents(db, current_user.id, limit=limit, offset=offset)
    return ApiResponse.ok(
        data=[IncidentResponse.model_validate(inc) for inc in incidents],
        request_id=req_id,
    )
