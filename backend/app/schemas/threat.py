"""VoxShield AI — Threat Schemas."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ThreatEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    call_id: Optional[str] = None
    event_type: str
    severity: str
    threat_score: float
    ai_probability: float
    speaker_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    timestamp: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_json")

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


class ThreatSummaryResponse(BaseModel):
    total_events: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    average_threat_score: float


class ThreatTimelineItem(BaseModel):
    period: str
    count: int
    average_score: float


class ThreatTimelineResponse(BaseModel):
    timeline: List[ThreatTimelineItem]
