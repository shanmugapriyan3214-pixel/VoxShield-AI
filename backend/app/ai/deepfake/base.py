"""VoxShield AI — Deepfake Detector Base Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from app.ai.base import BaseAIComponent
from app.ai.schemas import DeepfakeDetectionResult


class DeepfakeDetector(BaseAIComponent, ABC):
    """Abstract interface for AI voice cloning and deepfake detection engines."""

    @abstractmethod
    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        """Analyze audio frames for synthetic vocoder, diffusion, or cloning artifacts."""
        pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "available": True,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "device": self.device,
            "engine_type": self.engine_type,
        }
