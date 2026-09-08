"""VoxShield AI — Call and Security Event Schemas."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CallInitiateRequest(BaseModel):
    receiver_id: str = Field(..., description="Target recipient user ID")


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


class CallSecurityEventCreate(BaseModel):
    event_type: str = Field(
        ...,
        description="AI_VOICE_DETECTED | SPEAKER_MISMATCH | LIVENESS_FAILURE | HIGH_THREAT | CALL_VERIFIED",
    )
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    threat_score: float = Field(..., ge=0.0, le=100.0)
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


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
    window_duration_ms: int = Field(default=1500, ge=100)
    window_index: Optional[int] = None
    client_timestamp_ms: Optional[int] = None
    detected_artifacts: List[str] = Field(default_factory=list)


class SecurityTelemetryResponse(BaseModel):
    threat_score: float = Field(..., ge=0.0, le=100.0)
    severity: str
    recommended_action: str
    recommendation: str
    indicators: List[str] = Field(default_factory=list)
    call_terminated: bool = False
    event_id: Optional[str] = None
    timestamp: datetime


class ChallengeIssueRequest(BaseModel):
    target_user_id: Optional[str] = None
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
    challenge_id: str
    spoken_phrase: str
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class ChallengeVerificationResponse(BaseModel):
    challenge_id: str
    call_id: str
    status: str
    verified: bool
    details: str
    threat_score_impact: float = 0.0
    timestamp: datetime

