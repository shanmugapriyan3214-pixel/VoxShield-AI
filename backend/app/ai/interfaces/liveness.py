"""VoxShield AI — Abstract Liveness Detector Interface."""

from abc import ABC, abstractmethod
from app.ai.schemas import LivenessResult


class LivenessDetector(ABC):
    """Contract for acoustic impulse response and replay attack detection."""

    @abstractmethod
    async def analyze_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        """Analyze room acoustics and phase consistency for replay clues."""
        pass
