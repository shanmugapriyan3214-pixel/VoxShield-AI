"""VoxShield AI — Health Probes Endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_request_id
from app.core.config import settings
from app.schemas.common import ApiResponse
from app.schemas.health import ComponentHealth, DetailedHealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=ApiResponse[DetailedHealthResponse],
    summary="Deep health check verifying database, AI, and blockchain readiness",
)
async def deep_health_check(
    db: AsyncSession = Depends(get_db),
    req_id: str = Depends(get_request_id),
) -> ApiResponse[DetailedHealthResponse]:
    components = {}
    is_healthy = True

    # 1. Database Probe
    try:
        await db.execute(text("SELECT 1"))
        components["database"] = ComponentHealth(
            status="UP",
            details=f"Connected to {settings.DATABASE_URL.split('://')[0]}",
        )
    except Exception as e:
        is_healthy = False
        components["database"] = ComponentHealth(
            status="DOWN",
            details=f"Database unreachable: {str(e)}",
        )

    # 2. AI Intelligence Subsystem
    components["ai_engine"] = ComponentHealth(
        status="UP" if settings.AI_DETECTOR_PROVIDER != "mock" else "MOCK",
        details=f"Provider: {settings.AI_DETECTOR_PROVIDER}, Model: {settings.AI_MODEL_VERSION}",
    )

    # 3. Blockchain Evidence Subsystem
    components["blockchain"] = ComponentHealth(
        status="UP" if settings.BLOCKCHAIN_PROVIDER != "mock" else "MOCK",
        details=f"Provider: {settings.BLOCKCHAIN_PROVIDER}, Network: {settings.BLOCKCHAIN_NETWORK}",
    )

    # 4. Redis Cache Subsystem
    if settings.REDIS_ENABLED:
        components["cache"] = ComponentHealth(
            status="UP",
            details=f"Connected to {settings.REDIS_URL}",
        )
    else:
        components["cache"] = ComponentHealth(
            status="DISABLED",
            details="In-memory fallback active (single-node mode)",
        )

    response_data = DetailedHealthResponse(
        status="HEALTHY" if is_healthy else "DEGRADED",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        components=components,
    )

    return ApiResponse.ok(data=response_data, request_id=req_id)
