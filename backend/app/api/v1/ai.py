"""VoxShield AI — AI Intelligence & Engine Status Endpoints."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.ai.config import ai_settings
from app.ai.pipeline import ai_pipeline
from app.api.deps import get_request_id
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/ai", tags=["AI & Threat Intelligence"])


class AIStatusResponse(BaseModel):
    status: str
    mode: str
    fallback_mode: str
    device: str
    streaming_window: Dict[str, Any]
    models: Dict[str, Any]
    components: Dict[str, Any]
    privacy_policy: Dict[str, str]


@router.get(
    "/status",
    response_model=ApiResponse[AIStatusResponse],
    summary="Get operational status and non-sensitive metadata for VoxShield AI subsystems",
)
async def get_ai_status(
    req_id: str = Depends(get_request_id),
) -> ApiResponse[AIStatusResponse]:
    pipeline_status = ai_pipeline.get_status()

    data = AIStatusResponse(
        status="OPERATIONAL",
        mode=pipeline_status.get("mode", ai_settings.AI_MODE),
        fallback_mode=pipeline_status.get("fallback_mode", ai_settings.AI_FALLBACK_MODE),
        device=pipeline_status.get("device", ai_settings.AI_DEVICE),
        streaming_window={
            "window_duration_sec": ai_settings.STREAMING_WINDOW_SEC,
            "hop_duration_sec": ai_settings.STREAMING_HOP_SEC,
            "sample_rate": 16000,
        },
        models=pipeline_status.get("models", {}),
        components=pipeline_status.get("components", {}),
        privacy_policy={
            "zero_server_audio": "Strictly Enforced: Voice streams are analyzed client-side; raw audio is never stored or transmitted to server.",
            "biometric_protection": "Voice embeddings are treated as high-security biometric credentials and never returned via public APIs.",
            "provenance_transparency": "Engine types are truthfully declared as REAL_PRETRAINED_MODEL, LOCAL_DSP_ANALYZER, or MOCK_DEMO_MODEL.",
        },
    )
    return ApiResponse.ok(data=data, request_id=req_id)
