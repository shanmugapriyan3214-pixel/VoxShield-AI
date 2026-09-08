"""VoxShield AI — Liveness & Replay Detection Base Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict
from app.ai.base import BaseAIComponent
from app.ai.schemas import LivenessResult


class LivenessDetector(BaseAIComponent, ABC):
    """Abstract base for voice liveness and acoustic replay detection."""

    @abstractmethod
    async def detect_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        """Inspect audio for acoustic reverberation, microphone transmission artifacts, and replay signatures."""
        pass

    async def analyze_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        """Alias for detect_liveness for backward compatibility."""
        return await self.detect_liveness(audio_bytes, sample_rate)

    def get_status(self) -> Dict[str, Any]:
        return {
            "available": True,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "device": self.device,
            "engine_type": self.engine_type,
        }
