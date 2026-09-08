"""VoxShield AI — AI Pipeline Orchestrator."""

from app.ai.adapters.mock_comparison import MockSpeakerComparisonService
from app.ai.adapters.mock_detector import MockDeepfakeDetector
from app.ai.adapters.mock_embedding import MockSpeakerEmbeddingService
from app.ai.adapters.mock_liveness import MockLivenessDetector
from app.ai.interfaces.comparison import SpeakerComparisonService
from app.ai.interfaces.detector import DeepfakeDetector
from app.ai.interfaces.embedding import SpeakerEmbeddingService
from app.ai.interfaces.liveness import LivenessDetector
from app.ai.schemas import DeepfakeDetectionResult
from app.core.config import settings


class AIPipeline:
    """Coordinates AI detection, embedding, comparison, and liveness components."""

    def __init__(
        self,
        detector: DeepfakeDetector = None,
        embedding_service: SpeakerEmbeddingService = None,
        comparison_service: SpeakerComparisonService = None,
        liveness_detector: LivenessDetector = None,
    ):
        # Default to mock adapters if not explicitly provided
        self.detector = detector or MockDeepfakeDetector(model_version=settings.AI_MODEL_VERSION)
        self.embedding_service = embedding_service or MockSpeakerEmbeddingService()
        self.comparison_service = comparison_service or MockSpeakerComparisonService()
        self.liveness_detector = liveness_detector or MockLivenessDetector()

    async def analyze_full(self, audio_bytes: bytes) -> DeepfakeDetectionResult:
        """Run deepfake detection and liveness analysis on audio bytes."""
        result = await self.detector.analyze(audio_bytes)
        liveness = await self.liveness_detector.analyze_liveness(audio_bytes)
        result.liveness_score = liveness.liveness_score
        return result


# Global pipeline instance
ai_pipeline = AIPipeline()
