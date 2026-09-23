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
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.fusion.threat_fusion import threat_fusion_engine
from app.ai.fusion.multi_signal_engine import multi_signal_engine
from app.ai.temporal import temporal_manager
from app.ai.registry import model_registry
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
                fallback_mode=ai_settings.AI_FALLBACK_MODE,
            )
        else:
            self.detector = MockDeepfakeDetector(model_version=settings.AI_MODEL_VERSION)

        if embedding_service is not None:
            self.embedding_service = embedding_service
        elif mode == "local":
            self.embedding_service = LocalSpeakerEmbeddingService(
                device=ai_settings.AI_DEVICE,
                model_path=ai_settings.SPEAKER_MODEL_PATH,
                fallback_mode=ai_settings.AI_FALLBACK_MODE,
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
                fallback_mode=ai_settings.AI_FALLBACK_MODE,
            )
        else:
            self.liveness_detector = MockLivenessDetector()

        self.threat_fusion = threat_fusion_engine
        self._sync_registry()

    def _sync_registry(self) -> None:
        """Ensure all pipeline components are registered in the central model registry."""
        from app.ai.registry import ModelMetadata

        if not model_registry.get_model("deepfake_detector") and hasattr(self.detector, "get_status"):
            st = self.detector.get_status()
            model_registry.register(
                "deepfake_detector",
                ModelMetadata(
                    model_name=st.get("model_name", "VoxShield-Detector"),
                    version=st.get("model_version", "1.0.0"),
                    engine_type=st.get("engine_type", "MOCK_DEMO_MODEL"),
                    framework=st.get("framework", "mock"),
                    device=st.get("device", "cpu"),
                    available=st.get("available", True),
                    status=st.get("status", "LOADED"),
                    description="Speech deepfake and voice cloning detector.",
                ),
            )
        if not model_registry.get_model("speaker_encoder") and hasattr(self.embedding_service, "get_status"):
            st = self.embedding_service.get_status()
            model_registry.register(
                "speaker_encoder",
                ModelMetadata(
                    model_name=st.get("model_name", "VoxShield-SpeakerEncoder"),
                    version=st.get("model_version", "1.0.0"),
                    engine_type=st.get("engine_type", "MOCK_DEMO_MODEL"),
                    framework=st.get("framework", "mock"),
                    device=st.get("device", "cpu"),
                    available=st.get("available", True),
                    status=st.get("status", "LOADED"),
                    description="Acoustic speaker embedding extractor.",
                ),
            )
        if not model_registry.get_model("liveness_detector") and hasattr(self.liveness_detector, "get_status"):
            st = self.liveness_detector.get_status()
            model_registry.register(
                "liveness_detector",
                ModelMetadata(
                    model_name=st.get("model_name", "VoxShield-Liveness"),
                    version=st.get("model_version", "1.0.0"),
                    engine_type=st.get("engine_type", "MOCK_DEMO_MODEL"),
                    framework=st.get("framework", "mock"),
                    device=st.get("device", "cpu"),
                    available=st.get("available", True),
                    status=st.get("status", "LOADED"),
                    description="Acoustic liveness and anti-replay verification.",
                ),
            )
        if not model_registry.get_model("speaker_verification") and hasattr(self.comparison_service, "get_status"):
            st = self.comparison_service.get_status()
            model_registry.register(
                "speaker_verification",
                ModelMetadata(
                    model_name=st.get("model_name", "VoxShield-SpeakerVerification"),
                    version=st.get("model_version", "1.0.0"),
                    engine_type=st.get("engine_type", "LOCAL_DSP_ANALYZER"),
                    framework=st.get("framework", "dsp_numpy"),
                    device=st.get("device", "cpu"),
                    available=st.get("available", True),
                    status=st.get("status", "LOADED"),
                    description="Speaker verification cosine similarity comparison engine.",
                ),
            )

    async def analyze_full(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        """Run multi-signal deepfake detection, audio quality check, and liveness analysis."""
        ctx = context or {}
        session_id = ctx.get("session_id") or ctx.get("call_id")
        temporal_prior = None

        if session_id:
            temporal_buf = temporal_manager.get_or_create(session_id)
            temporal_prior = temporal_buf._current_smoothed

        # 1. Base detector inference (AASIST-L or DSP fallback)
        result = await self.detector.analyze(audio_bytes, sample_rate=sample_rate, context=context)

        # 2. Liveness & anti-replay analysis
        liveness = await self.liveness_detector.analyze_liveness(audio_bytes, sample_rate=sample_rate)

        # 3. Waveform decoding for multi-signal DSP feature verification
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)

        # 4. Multi-Signal Score Fusion
        verdict = multi_signal_engine.evaluate(
            waveform=waveform,
            sr=sr,
            model_ai_prob=result.ai_probability,
            model_confidence=result.confidence,
            temporal_prior=temporal_prior,
        )

        # 5. Populate enriched multi-signal attributes
        result.classification = verdict.classification
        result.ai_probability = verdict.ai_probability
        result.human_probability = verdict.human_probability
        result.confidence = verdict.confidence
        result.voice_trust_score = verdict.voice_trust_score
        result.audio_quality = verdict.audio_quality
        result.signals = verdict.signals
        result.replay_suspicion = verdict.replay_suspicion
        result.detected_artifacts = list(set(result.detected_artifacts + verdict.detected_artifacts))
        result.evidence_summary = verdict.evidence_summary
        result.liveness_score = liveness.liveness_score
        result.diagnostics = verdict.diagnostics
        result.disclaimer = (
            "Probabilistic assessment based on acoustic, spectral, prosodic, and neural graph feature extraction. "
            "Cannot guarantee 100% certainty under heavy compression or adversarial conditions."
        )

        # 6. Update temporal buffer if in live session
        if session_id:
            temporal_state = temporal_buf.update(
                raw_ai_prob=verdict.ai_probability,
                confidence=verdict.confidence,
                artifacts=verdict.detected_artifacts,
            )
            result.signals["temporal_consistency"] = temporal_state.trend

        return result

    def get_status(self) -> Dict[str, Any]:
        """Return operational status and metadata for all AI subsystems."""
        return {
            "mode": ai_settings.AI_MODE,
            "fallback_mode": ai_settings.AI_FALLBACK_MODE,
            "device": ai_settings.AI_DEVICE,
            "models": model_registry.get_status_report(),
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
