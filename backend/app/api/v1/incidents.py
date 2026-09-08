"""VoxShield AI — Incident Report & Blockchain Verification Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.blockchain.interface import (
    BlockchainReceipt,
    BlockchainVerificationResult,
)
from app.db.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.common import ApiResponse
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)
from app.services.blockchain_service import BlockchainService
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/incidents", tags=["Incidents & Blockchain Audit"])


@router.post(
    "",
    response_model=ApiResponse[IncidentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tamper-evident security incident report",
)
async def create_incident(
    data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[IncidentResponse]:
    incident = await IncidentService.create_incident(db, current_user.id, data)
    return ApiResponse.ok(
        data=IncidentResponse.model_validate(incident),
        request_id=req_id,
    )


@router.get(
    "",
    response_model=ApiResponse[List[IncidentResponse]],
    summary="List security incidents filed by the authenticated user",
)
async def list_incidents(
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


@router.get(
    "/{incident_id}",
    response_model=ApiResponse[IncidentResponse],
    summary="Get full incident report with canonical hash and evidence metadata",
)
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[IncidentResponse]:
    incident = await IncidentService.get_incident(db, incident_id, current_user.id)
    return ApiResponse.ok(
        data=IncidentResponse.model_validate(incident),
        request_id=req_id,
    )


@router.patch(
    "/{incident_id}",
    response_model=ApiResponse[IncidentResponse],
    summary="Update incident summary or status (OPEN, INVESTIGATING, RESOLVED, FALSE_POSITIVE)",
)
async def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[IncidentResponse]:
    updated = await IncidentService.update_incident(db, incident_id, current_user.id, data)
    return ApiResponse.ok(
        data=IncidentResponse.model_validate(updated),
        request_id=req_id,
    )


@router.delete(
    "/{incident_id}",
    response_model=ApiResponse[MessageResponse],
    summary="Delete an incident record",
)
async def delete_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[MessageResponse]:
    await IncidentService.delete_incident(db, incident_id, current_user.id)
    return ApiResponse.ok(
        data=MessageResponse(message="Incident deleted successfully."),
        request_id=req_id,
    )


@router.post(
    "/{incident_id}/anchor",
    response_model=ApiResponse[BlockchainReceipt],
    summary="Anchor canonical incident evidence hash to distributed ledger (Mock or EVM)",
)
async def anchor_incident_to_blockchain(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[BlockchainReceipt]:
    receipt = await BlockchainService.anchor_incident(db, incident_id, current_user.id)
    return ApiResponse.ok(data=receipt, request_id=req_id)


@router.get(
    "/{incident_id}/verification",
    response_model=ApiResponse[BlockchainVerificationResult],
    summary="Cryptographically verify incident record integrity against stored blockchain proof",
)
async def verify_incident_integrity(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[BlockchainVerificationResult]:
    result = await BlockchainService.verify_incident(db, incident_id, current_user.id)
    return ApiResponse.ok(data=result, request_id=req_id)
