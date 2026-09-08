"""VoxShield AI — AI Interfaces Registry."""

from app.ai.interfaces.detector import DeepfakeDetector
from app.ai.interfaces.embedding import SpeakerEmbeddingService
from app.ai.interfaces.comparison import SpeakerComparisonService
from app.ai.interfaces.liveness import LivenessDetector

__all__ = [
    "DeepfakeDetector",
    "SpeakerEmbeddingService",
    "SpeakerComparisonService",
    "LivenessDetector",
]
