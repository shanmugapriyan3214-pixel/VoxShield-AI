"""VoxShield AI — Controlled Voice-Cloning Attack Simulation & Live Detection Demo Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_request_id
from app.db.models.user import User
from app.demo.attack_simulator import attack_simulator
from app.demo.demo_models import (
    DemoExecuteRequest,
    DemoExecuteResponse,
    DemoResetRequest,
    DemoResetResponse,
    DemoScenarioInfo,
    TamperTestRequest,
    TamperTestResponse,
)
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/demo", tags=["Controlled Attack Simulation Demo"])


@router.get(
    "/scenarios",
    response_model=ApiResponse[List[DemoScenarioInfo]],
    summary="List available controlled attack scenarios with provenance and safety metadata",
)
async def list_demo_scenarios(
    current_user: User = Depends(get_current_user),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[List[DemoScenarioInfo]]:
    scenarios = attack_simulator.get_scenarios()
    return ApiResponse.ok(data=scenarios, request_id=req_id)


@router.post(
    "/execute",
    response_model=ApiResponse[DemoExecuteResponse],
    summary="Execute a controlled attack step using real pretrained models or simulated attack telemetry",
)
async def execute_demo_scenario(
    data: DemoExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[DemoExecuteResponse]:
    result = await attack_simulator.execute_scenario(db, current_user.id, data)
    return ApiResponse.ok(data=result, request_id=req_id)


@router.post(
    "/tamper-test",
    response_model=ApiResponse[TamperTestResponse],
    summary="Execute cryptographic evidence tamper demonstration (in-memory proof without corrupting DB)",
)
async def demonstrate_tamper_detection(
    data: TamperTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[TamperTestResponse]:
    result = await attack_simulator.run_tamper_test(
        incident_id=data.incident_id,
        tamper_field=data.tamper_field,
        tampered_value=data.tampered_value,
        db=db,
        user_id=current_user.id,
    )
    return ApiResponse.ok(data=result, request_id=req_id)


@router.post(
    "/reset",
    response_model=ApiResponse[DemoResetResponse],
    summary="Reset demonstration session state, challenge records, and live telemetry baselines",
)
async def reset_demo_session(
    data: DemoResetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[DemoResetResponse]:
    result = await attack_simulator.reset_demo(data.call_id, db, current_user.id)
    return ApiResponse.ok(data=result, request_id=req_id)
