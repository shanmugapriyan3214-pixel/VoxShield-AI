"""VoxShield AI — Abstract Deepfake Detector Interface."""

from abc import ABC, abstractmethod
from typing import Optional
from app.ai.schemas import DeepfakeDetectionResult


class DeepfakeDetector(ABC):
    """Contract for AI voice and deepfake detection engines."""

    @abstractmethod
    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        """Perform acoustic, spectral, and vocoder artifact analysis on audio data."""
        pass
