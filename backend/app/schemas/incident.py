"""VoxShield AI — Incident Report Schemas."""

import json
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class IncidentCreate(BaseModel):
    call_id: Optional[str] = None
    incident_type: str = Field(..., description="e.g. VOICE_CLONING_ATTEMPT, IMPERSONATION")
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    threat_score: float = Field(..., ge=0.0, le=100.0)
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    summary: str = Field(..., min_length=5)
    indicators: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    summary: Optional[str] = None
    status: Optional[str] = Field(None, description="OPEN | INVESTIGATING | RESOLVED | FALSE_POSITIVE")


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_number: str
    user_id: str
    call_id: Optional[str] = None
    incident_type: str
    severity: str
    threat_score: float
    ai_probability: float
    speaker_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    summary: str
    indicators: List[str] = Field(default_factory=list, validation_alias="indicators_json")
    recommendations: List[str] = Field(default_factory=list, validation_alias="recommendations_json")
    canonical_hash: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    is_anchored: bool = False

    @field_validator("indicators", "recommendations", mode="before")
    @classmethod
    def parse_json_list(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except Exception:
                return []
        elif isinstance(v, list):
            return v
        return []
