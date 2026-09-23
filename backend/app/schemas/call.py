"""VoxShield AI — Call and Security Event Schemas."""

import json
import math
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CallInitiateRequest(BaseModel):
    receiver_id: str = Field(..., min_length=1, max_length=100, description="Target recipient user ID")


class CallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    caller_id: str
    receiver_id: str
    status: str
    encryption_algorithm: str
    termination_reason: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    caller_name: Optional[str] = None
    caller_voxshield_id: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_voxshield_id: Optional[str] = None
    duration_seconds: Optional[int] = None
    latest_threat_score: Optional[float] = None
    latest_severity: Optional[str] = None


class CallSecurityEventCreate(BaseModel):
    event_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="AI_VOICE_DETECTED | SPEAKER_MISMATCH | LIVENESS_FAILURE | HIGH_THREAT | CALL_VERIFIED",
    )
    severity: str = Field(..., min_length=1, max_length=20, description="LOW | MEDIUM | HIGH | CRITICAL")
    threat_score: float = Field(..., ge=0.0, le=100.0)
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("threat_score", "ai_probability", "speaker_match_score", "liveness_score", mode="before")
    @classmethod
    def reject_nan_inf(cls, v: Any) -> Any:
        if v is not None and isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                raise ValueError("NaN and Infinity are not permitted.")
        return v


class CallSecurityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    call_id: str
    reported_by_user_id: str
    event_type: str
    severity: str
    threat_score: float
    ai_probability: float
    speaker_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_json")
    timestamp: datetime

    @field_validator("metadata", mode="before")
    @classmethod
    def parse_metadata_json(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        elif isinstance(v, dict):
            return v
        return {}


class SecurityTelemetryReportRequest(BaseModel):
    """Real-time security telemetry submitted by local client inference engine."""
    ai_generated_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    window_duration_ms: int = Field(default=1500, ge=100, le=10000)
    window_index: Optional[int] = Field(None, ge=0, le=10000000)
    client_timestamp_ms: Optional[int] = None
    detected_artifacts: List[str] = Field(default_factory=list, max_length=20)
    transaction_type: Optional[str] = Field(None, max_length=100)
    transaction_amount: Optional[float] = Field(None, ge=0.0)
    urgency_level: Optional[str] = Field(None, max_length=50)
    caller_known: Optional[bool] = None
    language: Optional[str] = Field(None, max_length=20)

    @field_validator("ai_generated_probability", "speaker_match_probability", "liveness_probability", "transaction_amount", mode="before")
    @classmethod
    def reject_nan_inf(cls, v: Any) -> Any:
        if v is not None and isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                raise ValueError("NaN and Infinity are not permitted in security telemetry.")
        return v


class SecurityTelemetryResponse(BaseModel):
    threat_score: float = Field(..., ge=0.0, le=100.0)
    severity: str
    recommended_action: str
    recommendation: str
    indicators: List[str] = Field(default_factory=list)
    call_terminated: bool = False
    event_id: Optional[str] = None
    context_risk: Optional[float] = None
    breakdown: Optional[Dict[str, Any]] = None
    social_engineering_risk: Optional[bool] = False
    timestamp: datetime


class ChallengeIssueRequest(BaseModel):
    target_user_id: Optional[str] = Field(None, max_length=100)
    timeout_seconds: Optional[int] = Field(None, ge=10, le=300)


class ChallengeResponse(BaseModel):
    challenge_id: str
    call_id: str
    passphrase: str
    prompt: str
    expires_at: datetime
    status: str
    created_at: datetime


class ChallengeVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1, max_length=100)
    spoken_phrase: str = Field(..., min_length=1, max_length=250)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)

    @field_validator("liveness_score", mode="before")
    @classmethod
    def reject_nan_inf(cls, v: Any) -> Any:
        if v is not None and isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                raise ValueError("NaN and Infinity are not permitted.")
        return v


class ChallengeVerificationResponse(BaseModel):
    challenge_id: str
    call_id: str
    status: str
    verified: bool
    details: str
    threat_score_impact: float = 0.0
    timestamp: datetime

