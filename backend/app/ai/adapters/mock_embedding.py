"""VoxShield AI — Mock Speaker Embedding Adapter."""

import hashlib
import math
from app.ai.interfaces.embedding import SpeakerEmbeddingService
from app.ai.schemas import SpeakerEmbeddingResult


class MockSpeakerEmbeddingService(SpeakerEmbeddingService):
    """Generates synthetic normalized 192-dimensional embeddings."""

    def __init__(self, dimension: int = 192, model_version: str = "mock-ecapa-v1.0"):
        self.dimension = dimension
        self.model_version = model_version

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "12345678" * 8

        # Create raw vector from repeated hash chunks
        raw_vector = []
        for i in range(self.dimension):
            chunk = digest[(i * 4) % (len(digest) - 4): (i * 4) % (len(digest) - 4) + 4]
            raw_val = (int(chunk, 16) / 0xFFFF) * 2.0 - 1.0
            raw_vector.append(raw_val)

        # Normalize to unit sphere (L2 norm)
        magnitude = math.sqrt(sum(x * x for x in raw_vector)) or 1.0
        normalized_vector = [round(x / magnitude, 6) for x in raw_vector]

        return SpeakerEmbeddingResult(
            embedding=normalized_vector,
            dimension=self.dimension,
            model_version=self.model_version,
            is_mock=True,
        )
