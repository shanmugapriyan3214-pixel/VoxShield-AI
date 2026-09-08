"""VoxShield AI — AI Layer Unit & Security Tests."""

import numpy as np
import pytest

from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.fusion.threat_fusion import ThreatFusionEngine, threat_fusion_engine
from app.ai.liveness.detector import LocalLivenessDetector
from app.ai.liveness.mock import MockLivenessDetector
from app.ai.runtime.local_inference import LocalStreamAnalyzer
from app.ai.speaker.comparison import SpeakerComparisonService, speaker_comparison_service
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService, MockSpeakerEmbeddingService


def generate_audio_bytes(duration_sec: float = 1.0, sr: int = 16000, freq: float = 440.0) -> bytes:
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    samples = (0.5 * np.sin(2 * np.pi * freq * t) * 32767.0).astype(np.int16)
    return samples.tobytes()


@pytest.mark.asyncio
async def test_local_deepfake_detector_acoustic_features():
    detector = LocalDeepfakeDetector()
    assert detector.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    audio = generate_audio_bytes(duration_sec=1.0)
    result = await detector.analyze(audio)

    assert result.analysis_id
    assert 0.0 <= result.ai_probability <= 1.0
    assert 0.0 <= result.human_probability <= 1.0
    assert round(result.ai_probability + result.human_probability, 3) == 1.0
    assert result.classification in ("LIKELY_HUMAN", "SUSPICIOUS", "LIKELY_AI_GENERATED")
    assert result.is_mock is False


@pytest.mark.asyncio
async def test_speaker_embedding_service_l2_normalization():
    service = LocalSpeakerEmbeddingService(dimension=192)
    assert service.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    audio = generate_audio_bytes(duration_sec=1.5)
    result = await service.extract_embedding(audio)

    assert len(result.embedding) == 192
    assert result.dimension == 192
    assert result.is_mock is False

    # Check L2 unit norm
    norm = np.linalg.norm(result.embedding)
    assert abs(norm - 1.0) < 1e-3


def test_speaker_comparison_service():
    comparator = SpeakerComparisonService()
    vec_a = [0.1] * 192
    norm_a = np.linalg.norm(vec_a)
    vec_a = [x / norm_a for x in vec_a]

    # Compare identical embeddings
    res_identical = comparator.compare(vec_a, vec_a)
    assert res_identical.is_match is True
    assert res_identical.speaker_match_score >= 0.99
    assert res_identical.confidence >= 0.90

    # Compare orthogonal embeddings
    vec_b = [-x for x in vec_a]
    res_diff = comparator.compare(vec_a, vec_b)
    assert res_diff.is_match is False
    assert res_diff.speaker_match_score <= 0.10


@pytest.mark.asyncio
async def test_local_liveness_detector():
    liveness_detector = LocalLivenessDetector()
    assert liveness_detector.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    audio = generate_audio_bytes(duration_sec=1.0)
    res = await liveness_detector.detect_liveness(audio)

    assert 0.0 <= res.liveness_score <= 1.0
    assert 0.0 <= res.replay_probability <= 1.0
    assert round(res.liveness_score + res.replay_probability, 3) == 1.0
    assert res.is_mock is False


def test_threat_fusion_engine_progressive_responses():
    fusion = ThreatFusionEngine()

    # 1. Benign Call
    benign = fusion.evaluate(
        ai_probability=0.05,
        speaker_match_score=0.95,
        liveness_score=0.92,
        is_claimed_trusted_contact=True,
    )
    assert benign.threat_score <= 24.9
    assert benign.severity == "LOW"
    assert benign.recommended_action == "CONTINUE_NORMAL"

    # 2. Ambiguous / Suspicious
    suspicious = fusion.evaluate(
        ai_probability=0.55,
        speaker_match_score=0.65,
        liveness_score=0.60,
    )
    assert 25.0 <= suspicious.threat_score <= 74.9
    assert suspicious.severity in ("MEDIUM", "HIGH")
    assert suspicious.recommended_action in ("DISPLAY_ADVISORY", "REQUIRE_VERIFICATION")

    # 3. Critical Voice Clone Attack
    critical = fusion.evaluate(
        ai_probability=0.95,
        speaker_match_score=0.30,
        liveness_score=0.25,
        is_claimed_trusted_contact=True,
        anomaly_flags=["vocoder_phase_discontinuity", "replay_detected"],
    )
    assert critical.threat_score >= 75.0
    assert critical.severity == "CRITICAL"
    assert critical.recommended_action == "RECOMMEND_TERMINATION"
    assert "CRITICAL THREAT" in critical.recommendation


def test_local_stream_analyzer_sliding_window_simulation():
    analyzer = LocalStreamAnalyzer(window_duration_sec=1.5, hop_duration_sec=0.75)

    # Simulate scenarios
    normal_telemetry = analyzer.simulate_telemetry_window(scenario="normal")
    assert normal_telemetry["severity"] == "LOW"
    assert normal_telemetry["recommended_action"] == "CONTINUE_NORMAL"
    assert "raw_audio" not in normal_telemetry  # Zero-server-audio privacy

    clone_telemetry = analyzer.simulate_telemetry_window(scenario="voice_clone")
    assert clone_telemetry["severity"] == "CRITICAL"
    assert clone_telemetry["recommended_action"] == "RECOMMEND_TERMINATION"
    assert clone_telemetry["threat_score"] >= 75.0
    assert "raw_audio" not in clone_telemetry


def test_model_labeling_transparency():
    # Verify strict distinction between real local models and mock demo models
    real_detector = LocalDeepfakeDetector()
    mock_detector = MockDeepfakeDetector()
    assert real_detector.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    assert mock_detector.engine_type == "MOCK_DEMO_MODEL"

    real_embedding = LocalSpeakerEmbeddingService()
    mock_embedding = MockSpeakerEmbeddingService()
    assert real_embedding.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    assert mock_embedding.engine_type == "MOCK_DEMO_MODEL"

    real_liveness = LocalLivenessDetector()
    mock_liveness = MockLivenessDetector()
    assert real_liveness.engine_type in ("REAL_PRETRAINED_MODEL", "LOCAL_DSP_ANALYZER")
    assert mock_liveness.engine_type == "MOCK_DEMO_MODEL"
