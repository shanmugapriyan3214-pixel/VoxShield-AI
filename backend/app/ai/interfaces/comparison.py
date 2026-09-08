"""VoxShield AI — Abstract Speaker Comparison Interface."""

from abc import ABC, abstractmethod
from typing import List
from app.ai.schemas import SpeakerComparisonResult


class SpeakerComparisonService(ABC):
    """Contract for comparing speaker voice representations."""

    @abstractmethod
    async def compare_embeddings(
        self,
        reference_embedding: List[float],
        suspect_embedding: List[float],
        threshold: float = 0.75,
    ) -> SpeakerComparisonResult:
        """Compute cosine similarity and probabilistic verification match."""
        pass
