"""VoxShield AI — Analysis API Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.ai.schemas import DeepfakeDetectionResult, SpeakerComparisonResult


class CompareRequest(BaseModel):
    reference_profile_id: Optional[str] = Field(None, description="Registered VoiceProfile ID to compare against")
    suspect_analysis_id: Optional[str] = Field(None, description="Existing VoiceAnalysis ID to compare")
    reference_embedding: Optional[list[float]] = Field(None, description="Optional raw embedding for testing")
    suspect_embedding: Optional[list[float]] = Field(None, description="Optional raw embedding for testing")


class AudioAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_id: str
    status: str
    classification: str
    ai_probability: float
    human_probability: float
    speaker_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    model_version: str
    is_mock: bool
    created_at: datetime
    warning: Optional[str] = None
