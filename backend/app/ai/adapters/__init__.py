"""VoxShield AI — AI Adapters Registry."""

from app.ai.adapters.mock_detector import MockDeepfakeDetector
from app.ai.adapters.mock_embedding import MockSpeakerEmbeddingService
from app.ai.adapters.mock_comparison import MockSpeakerComparisonService
from app.ai.adapters.mock_liveness import MockLivenessDetector

__all__ = [
    "MockDeepfakeDetector",
    "MockSpeakerEmbeddingService",
    "MockSpeakerComparisonService",
    "MockLivenessDetector",
]
