"""VoxShield AI — AI Layer Configuration."""

from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Standardized AI Engine Types (MANDATORY FOR AUDIT TRANSPARENCY)
ENGINE_REAL_PRETRAINED = "REAL_PRETRAINED_MODEL"
ENGINE_LOCAL_DSP = "LOCAL_DSP_ANALYZER"
ENGINE_MOCK_DEMO = "MOCK_DEMO_MODEL"
ENGINE_ADAPTER_READY = "ADAPTER_READY_NO_WEIGHTS"
ENGINE_UNAVAILABLE = "UNAVAILABLE"


def resolve_model_path(path: Optional[str]) -> Optional[str]:
    """Resolve model path relative to repo root, backend directory, or CWD."""
    if not path:
        return None
    p = Path(path)
    if p.is_absolute() and p.exists():
        return str(p)
    if p.exists():
        return str(p.resolve())

    current_file = Path(__file__).resolve()
    backend_dir = current_file.parent.parent.parent  # backend/app/ai/config.py -> backend
    repo_root = backend_dir.parent

    # Check relative to repo_root (e.g. backend/models/weights/...)
    cand1 = repo_root / p
    if cand1.exists():
        return str(cand1.resolve())

    # Check relative to backend_dir
    cand2 = backend_dir / p
    if cand2.exists():
        return str(cand2.resolve())

    # If path starts with "backend", strip and check inside backend_dir
    parts = p.parts
    if len(parts) > 1 and parts[0].lower() == "backend":
        cand3 = backend_dir.joinpath(*parts[1:])
        if cand3.exists():
            return str(cand3.resolve())

    return str(p)


class AISettings(BaseSettings):
    """Configuration for AI models, edge inference parameters, and progressive defense."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    AI_MODE: str = Field(default="local", description="local | mock")
    AI_BACKEND: str = Field(default="auto", description="auto | pretrained | dsp | mock | none")
    AI_DEVICE: str = Field(default="cpu", description="cpu | cuda")
    AI_FALLBACK_MODE: str = Field(default="dsp", description="dsp | mock | none")

    # Pretrained Model Checkpoint Paths (ONNX / PyTorch)
    DEEPFAKE_MODEL_PATH: Optional[str] = Field(
        default="backend/models/weights/deepfake/aasist-l.onnx",
        description="Path to pretrained ONNX deepfake anti-spoofing model",
    )
    SPEAKER_MODEL_PATH: Optional[str] = Field(
        default="backend/models/weights/speaker/voxceleb.onnx",
        description="Path to pretrained ONNX speaker encoder model",
    )
    LIVENESS_MODEL_PATH: Optional[str] = Field(
        default=None,
        description="Path to pretrained ONNX replay anti-spoof model (None = DSP fallback active)",
    )

    @property
    def RESOLVED_DEEPFAKE_MODEL_PATH(self) -> Optional[str]:
        return resolve_model_path(self.DEEPFAKE_MODEL_PATH)

    @property
    def RESOLVED_SPEAKER_MODEL_PATH(self) -> Optional[str]:
        return resolve_model_path(self.SPEAKER_MODEL_PATH)

    @property
    def RESOLVED_LIVENESS_MODEL_PATH(self) -> Optional[str]:
        return resolve_model_path(self.LIVENESS_MODEL_PATH)

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
