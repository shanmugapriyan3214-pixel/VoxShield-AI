"""VoxShield AI — AI Pipeline Orchestrator."""

from typing import Any, Dict, Optional
from app.ai.config import ai_settings
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.speaker.embedding import (
    LocalSpeakerEmbeddingService,
    MockSpeakerEmbeddingService,
)
from app.ai.adapters.mock_comparison import MockSpeakerComparisonService
from app.ai.speaker.comparison import (
    SpeakerComparisonService,
    speaker_comparison_service,
)
from app.ai.liveness.detector import LocalLivenessDetector
from app.ai.liveness.mock import MockLivenessDetector
from app.ai.fusion.threat_fusion import threat_fusion_engine
from app.ai.schemas import DeepfakeDetectionResult
from app.core.config import settings


class AIPipeline:
    """Coordinates AI detection, embedding, comparison, and liveness components."""

    def __init__(
        self,
        detector=None,
        embedding_service=None,
        comparison_service=None,
        liveness_detector=None,
    ):
        mode = ai_settings.AI_MODE.lower()
        if detector is not None:
            self.detector = detector
        elif mode == "local":
            self.detector = LocalDeepfakeDetector(
                device=ai_settings.AI_DEVICE,
                model_path=ai_settings.DEEPFAKE_MODEL_PATH,
            )
        else:
            self.detector = MockDeepfakeDetector(model_version=settings.AI_MODEL_VERSION)

        if embedding_service is not None:
            self.embedding_service = embedding_service
        elif mode == "local":
            self.embedding_service = LocalSpeakerEmbeddingService(
                device=ai_settings.AI_DEVICE,
                model_path=ai_settings.SPEAKER_MODEL_PATH,
            )
        else:
            self.embedding_service = MockSpeakerEmbeddingService()

        if comparison_service is not None:
            self.comparison_service = comparison_service
        elif mode == "local":
            self.comparison_service = speaker_comparison_service
        else:
            self.comparison_service = MockSpeakerComparisonService()


        if liveness_detector is not None:
            self.liveness_detector = liveness_detector
        elif mode == "local":
            self.liveness_detector = LocalLivenessDetector(
                device=ai_settings.AI_DEVICE,
                model_path=ai_settings.LIVENESS_MODEL_PATH,
            )
        else:
            self.liveness_detector = MockLivenessDetector()

        self.threat_fusion = threat_fusion_engine

    async def analyze_full(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        """Run deepfake detection and liveness analysis on audio bytes."""
        result = await self.detector.analyze(audio_bytes, sample_rate=sample_rate, context=context)
        liveness = await self.liveness_detector.analyze_liveness(audio_bytes, sample_rate=sample_rate)
        result.liveness_score = liveness.liveness_score
        return result

    def get_status(self) -> Dict[str, Any]:
        """Return operational status and metadata for all AI subsystems."""
        return {
            "mode": ai_settings.AI_MODE,
            "device": ai_settings.AI_DEVICE,
            "components": {
                "deepfake_detector": self.detector.get_status(),
                "speaker_embedding": self.embedding_service.get_status(),
                "speaker_comparison": self.comparison_service.get_status(),
                "liveness_detector": self.liveness_detector.get_status(),
                "threat_fusion": self.threat_fusion.get_status(),
            },
        }


# Global pipeline instance
ai_pipeline = AIPipeline()
