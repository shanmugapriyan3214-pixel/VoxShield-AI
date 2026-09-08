"""VoxShield AI — AI Layer Configuration."""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Standardized AI Engine Types (MANDATORY FOR AUDIT TRANSPARENCY)
ENGINE_REAL_PRETRAINED = "REAL_PRETRAINED_MODEL"
ENGINE_LOCAL_DSP = "LOCAL_DSP_ANALYZER"
ENGINE_MOCK_DEMO = "MOCK_DEMO_MODEL"


class AISettings(BaseSettings):
    """Configuration for AI models, edge inference parameters, and progressive defense."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    AI_MODE: str = Field(default="mock", description="mock | local")
    AI_DEVICE: str = Field(default="cpu", description="cpu | cuda")
    AI_FALLBACK_MODE: str = Field(default="dsp", description="dsp | mock | none")

    # Pretrained Model Checkpoint Paths (ONNX / PyTorch)
    DEEPFAKE_MODEL_PATH: Optional[str] = Field(
        default=None,
        description="Path to pretrained ONNX deepfake anti-spoofing model (e.g. models/aasist_ssl.onnx)",
    )
    SPEAKER_MODEL_PATH: Optional[str] = Field(
        default=None,
        description="Path to pretrained ONNX speaker encoder model (e.g. models/ecapa_tdnn.onnx)",
    )
    LIVENESS_MODEL_PATH: Optional[str] = Field(
        default=None,
        description="Path to pretrained ONNX replay anti-spoof model (e.g. models/replay_liveness.onnx)",
    )

    # Real-Time Streaming Parameters
    ANALYSIS_WINDOW_MS: int = Field(default=1500, description="Sliding window duration in milliseconds")
    ANALYSIS_INTERVAL_MS: int = Field(default=1000, description="Telemetry interval in milliseconds")
    CONFIDENCE_THRESHOLD: float = Field(default=0.70, ge=0.0, le=1.0)

    # Progressive Security Actions
    AUTO_TERMINATE_CRITICAL: bool = Field(default=False, description="Whether to automatically sever calls on CRITICAL threat")
    CHALLENGE_TIMEOUT_SECONDS: int = Field(default=30, description="Timeout for participant verification challenges")

    @property
    def STREAMING_WINDOW_SEC(self) -> float:
        return self.ANALYSIS_WINDOW_MS / 1000.0

    @property
    def STREAMING_HOP_SEC(self) -> float:
        return self.ANALYSIS_INTERVAL_MS / 1000.0


ai_settings = AISettings()
