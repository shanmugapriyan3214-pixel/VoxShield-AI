"""VoxShield AI — Mock Speaker Comparison Adapter."""

import math
import uuid
from datetime import datetime, timezone
from typing import List
from app.ai.interfaces.comparison import SpeakerComparisonService
from app.ai.schemas import SpeakerComparisonResult


class MockSpeakerComparisonService(SpeakerComparisonService):
    """Computes cosine similarity between speaker embeddings."""

    def __init__(self, model_version: str = "mock-cosine-v1.0"):
        self.model_version = model_version

    async def compare_embeddings(
        self,
        reference_embedding: List[float],
        suspect_embedding: List[float],
        threshold: float = 0.75,
    ) -> SpeakerComparisonResult:
        if not reference_embedding or not suspect_embedding:
            similarity = 0.0
        elif len(reference_embedding) != len(suspect_embedding):
            # Compute partial overlap dot product
            dim = min(len(reference_embedding), len(suspect_embedding))
            dot_prod = sum(reference_embedding[i] * suspect_embedding[i] for i in range(dim))
            similarity = max(0.0, min(1.0, dot_prod))
        else:
            dot_prod = sum(a * b for a, b in zip(reference_embedding, suspect_embedding))
            norm_a = math.sqrt(sum(a * a for a in reference_embedding)) or 1.0
            norm_b = math.sqrt(sum(b * b for b in suspect_embedding)) or 1.0
            similarity = max(0.0, min(1.0, dot_prod / (norm_a * norm_b)))

        # Convert cosine similarity to 0.0 - 1.0 scale
        match_score = round(similarity, 4)
        is_match = match_score >= threshold

        return SpeakerComparisonResult(
            speaker_match_score=match_score,
            confidence=0.93,
            is_match=is_match,
            threshold_used=threshold,
            model_version=self.model_version,
            is_mock=True,
            analysis_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
        )
