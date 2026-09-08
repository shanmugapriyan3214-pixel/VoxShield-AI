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
