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
    synthetic_artifact_level: Optional[str] = "LOW"
    detected_artifacts: Optional[list[str]] = Field(default_factory=list)
    prosody_anomaly_score: Optional[float] = None
    confidence_score: Optional[float] = None
    voice_trust_score: Optional[int] = 85
    audio_quality: Optional[dict] = None
    signals: Optional[dict] = None
    replay_suspicion: Optional[float] = 0.0
    evidence_summary: Optional[str] = None
    language: Optional[str] = "en-IN"
    model_version: str
    is_mock: bool
    created_at: datetime
    warning: Optional[str] = None
    diagnostics: Optional[dict] = None
    disclaimer: Optional[str] = "Probabilistic assessment based on acoustic, spectral, prosodic, and neural graph feature extraction. Cannot guarantee 100% certainty under heavy compression or adversarial conditions."

