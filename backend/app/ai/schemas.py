"""VoxShield AI — AI Intelligence & Detection Schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.ai.config import ENGINE_MOCK_DEMO


class DeepfakeDetectionResult(BaseModel):
    """Output from deepfake acoustic and vocoder artifact analysis."""
    analysis_id: str
    classification: str = Field(..., description="LIKELY_HUMAN | LIKELY_AI_GENERATED | SUSPICIOUS | UNKNOWN")
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    human_probability: float = Field(..., ge=0.0, le=1.0)
    speaker_match_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    liveness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    voice_trust_score: int = Field(default=85, ge=0, le=100)
    audio_quality: Optional[dict] = None
    signals: Optional[dict] = None
    replay_suspicion: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_summary: Optional[str] = None
    engine_type: str = Field(default=ENGINE_MOCK_DEMO, description="REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL")
    model_name: Optional[str] = None
    model_version: str
    inference_time_ms: Optional[float] = None
    is_mock: bool = True
    warning: Optional[str] = None
    detected_artifacts: List[str] = Field(default_factory=list)
    diagnostics: Optional[dict] = None
    disclaimer: Optional[str] = None
    timestamp: datetime


class SpeakerEmbeddingResult(BaseModel):
    """Normalized vector representation of speaker voice identity."""
    embedding: List[float]
    dimension: int
    engine_type: str = Field(default=ENGINE_MOCK_DEMO, description="REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL")
    model_name: Optional[str] = None
    model_version: str
    inference_time_ms: Optional[float] = None
    is_mock: bool = True


class SpeakerComparisonResult(BaseModel):
    """Probabilistic match score between reference and suspect speaker representations."""
    speaker_match_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_match: bool
    threshold_used: float = 0.75
    engine_type: str = Field(default=ENGINE_MOCK_DEMO, description="REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL")
    model_name: Optional[str] = None
    model_version: str
    inference_time_ms: Optional[float] = None
    is_mock: bool = True
    analysis_id: str
    timestamp: datetime


class LivenessResult(BaseModel):
    """Acoustic impulse response and replay artifact check."""
    liveness_score: float = Field(..., ge=0.0, le=1.0)
    replay_probability: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    room_acoustic_variance: float = Field(..., ge=0.0)
    engine_type: str = Field(default=ENGINE_MOCK_DEMO, description="REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL")
    model_name: Optional[str] = None
    model_version: str
    inference_time_ms: Optional[float] = None
    is_mock: bool = True
