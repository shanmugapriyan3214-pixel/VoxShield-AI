"""VoxShield AI — Abstract Speaker Embedding Interface."""

from abc import ABC, abstractmethod
from app.ai.schemas import SpeakerEmbeddingResult


class SpeakerEmbeddingService(ABC):
    """Contract for extracting normalized speaker voice embeddings."""

    @abstractmethod
    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        """Extract speaker identity embedding vector from audio."""
        pass
