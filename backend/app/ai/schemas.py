"""VoxShield AI — AI Intelligence & Detection Schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DeepfakeDetectionResult(BaseModel):
    """Output from deepfake acoustic and vocoder artifact analysis."""
    analysis_id: str
    classification: str = Field(..., description="LIKELY_HUMAN | LIKELY_AI_GENERATED | SUSPICIOUS | UNKNOWN")
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    human_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    is_mock: bool = True
    warning: Optional[str] = None
    detected_artifacts: List[str] = Field(default_factory=list)
    timestamp: datetime


class SpeakerEmbeddingResult(BaseModel):
    """Normalized vector representation of speaker voice identity."""
    embedding: List[float]
    dimension: int
    model_version: str
    is_mock: bool = True


class SpeakerComparisonResult(BaseModel):
    """Probabilistic match score between reference and suspect speaker representations."""
    speaker_match_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_match: bool
    threshold_used: float = 0.75
    model_version: str
    is_mock: bool = True
    analysis_id: str
    timestamp: datetime


class LivenessResult(BaseModel):
    """Acoustic impulse response and replay artifact check."""
    liveness_score: float = Field(..., ge=0.0, le=1.0)
    replay_probability: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    room_acoustic_variance: float = Field(..., ge=0.0)
    model_version: str
    is_mock: bool = True
