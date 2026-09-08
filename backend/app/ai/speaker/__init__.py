"""VoxShield AI — Speaker Voiceprint & Embedding Services."""

from app.ai.speaker.embedding import (
    SpeakerEmbeddingService,
    LocalSpeakerEmbeddingService,
    MockSpeakerEmbeddingService,
)
from app.ai.speaker.comparison import (
    SpeakerComparisonService,
    speaker_comparison_service,
)

__all__ = [
    "SpeakerEmbeddingService",
    "LocalSpeakerEmbeddingService",
    "MockSpeakerEmbeddingService",
    "SpeakerComparisonService",
    "speaker_comparison_service",
]
