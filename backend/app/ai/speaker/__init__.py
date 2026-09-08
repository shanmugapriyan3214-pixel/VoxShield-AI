"""VoxShield AI — Speaker Voiceprint & Embedding Services."""

from app.ai.speaker.comparison import (
    SpeakerComparisonService,
    speaker_comparison_service,
)
from app.ai.speaker.dsp_embedding import DSPSpeakerEmbeddingService
from app.ai.speaker.embedding import (
    LocalSpeakerEmbeddingService,
    MockSpeakerEmbeddingService,
    SpeakerEmbeddingService,
)
from app.ai.speaker.pretrained_embedding import PretrainedSpeakerEmbeddingService

__all__ = [
    "DSPSpeakerEmbeddingService",
    "LocalSpeakerEmbeddingService",
    "MockSpeakerEmbeddingService",
    "PretrainedSpeakerEmbeddingService",
    "SpeakerComparisonService",
    "SpeakerEmbeddingService",
    "speaker_comparison_service",
]
