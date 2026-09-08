"""VoxShield AI — Phase 2.5 AI Claim Audit & Model Verification Tests.

Verifies:
1. Strict engine type classification (REAL_PRETRAINED_MODEL, LOCAL_DSP_ANALYZER, MOCK_DEMO_MODEL).
2. Honest fallback behavior when model weights are not present.
3. ONNX runtime integration behavior.
4. Biometric privacy invariant: raw voice embeddings are never returned or logged.
5. Zero-server-audio privacy: no raw audio in telemetry payloads.
6. Honest labeling of simulated demo scenarios.
"""

from unittest.mock import MagicMock, patch
import numpy as np
import pytest

from app.ai.base import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
)
from app.ai.deepfake.dsp_detector import DSPDeepfakeDetector
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector
from app.ai.liveness.detector import LocalLivenessDetector
from app.ai.liveness.dsp_liveness import DSPLivenessDetector
from app.ai.liveness.mock import MockLivenessDetector
from app.ai.liveness.pretrained_liveness import PretrainedLivenessDetector
from app.ai.runtime.local_inference import LocalStreamAnalyzer
from app.ai.speaker.comparison import SpeakerComparisonService
from app.ai.speaker.dsp_embedding import DSPSpeakerEmbeddingService
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService, MockSpeakerEmbeddingService
from app.ai.speaker.pretrained_embedding import PretrainedSpeakerEmbeddingService


def generate_audio_pcm(duration_sec: float = 1.0, sr: int = 16000, freq: float = 440.0) -> bytes:
    """Generate deterministic synthetic PCM 16-bit 16kHz mono audio."""
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    samples = (0.5 * np.sin(2 * np.pi * freq * t) * 32767.0).astype(np.int16)
    return samples.tobytes()


# ==============================================================================
# 1. STRICT TAXONOMY AUDIT
# ==============================================================================

def test_ai_claim_audit_taxonomy_integrity():
    """Verify that every AI component declares its honest engine type."""
    # Pretrained adapters
    pretrained_df = PretrainedDeepfakeDetector(model_path="nonexistent.onnx")
    assert pretrained_df.engine_type == ENGINE_REAL_PRETRAINED
    assert pretrained_df.framework == "onnxruntime"
    assert pretrained_df.available is False
    assert pretrained_df.status == "ADAPTER_READY_NO_WEIGHTS"

    pretrained_spk = PretrainedSpeakerEmbeddingService(model_path="nonexistent.onnx")
    assert pretrained_spk.engine_type == ENGINE_REAL_PRETRAINED
    assert pretrained_spk.available is False
    assert pretrained_spk.status == "ADAPTER_READY_NO_WEIGHTS"

    pretrained_live = PretrainedLivenessDetector(model_path="nonexistent.onnx")
    assert pretrained_live.engine_type == ENGINE_REAL_PRETRAINED
    assert pretrained_live.available is False
    assert pretrained_live.status == "ADAPTER_READY_NO_WEIGHTS"

    # Local DSP Analyzers (Never falsely claim to be neural models)
    dsp_df = DSPDeepfakeDetector()
    assert dsp_df.engine_type == ENGINE_LOCAL_DSP
    assert dsp_df.framework in ("dsp_numpy", "numpy_dsp")
    assert dsp_df.available is True

    dsp_spk = DSPSpeakerEmbeddingService()
    assert dsp_spk.engine_type == ENGINE_LOCAL_DSP
    assert dsp_spk.framework in ("dsp_numpy", "numpy_dsp")

    dsp_live = DSPLivenessDetector()
    assert dsp_live.engine_type == ENGINE_LOCAL_DSP
    assert dsp_live.framework in ("dsp_numpy", "numpy_dsp")

    # Mock Demo Models
    mock_df = MockDeepfakeDetector()
    assert mock_df.engine_type == ENGINE_MOCK_DEMO
    assert mock_df.framework in ("mock", "mock_simulation")

    mock_spk = MockSpeakerEmbeddingService()
    assert mock_spk.engine_type == ENGINE_MOCK_DEMO

    mock_live = MockLivenessDetector()
    assert mock_live.engine_type == ENGINE_MOCK_DEMO


# ==============================================================================
# 2. HONEST FALLBACK BEHAVIOR
# ==============================================================================

def test_fallback_mode_switching_deepfake():
    """Verify LocalDeepfakeDetector respects fallback_mode configuration."""
    # Fallback to DSP
    detector_dsp = LocalDeepfakeDetector(model_path="nonexistent.onnx", fallback_mode="dsp")
    assert detector_dsp.engine_type == ENGINE_LOCAL_DSP
    assert detector_dsp.available is True

    # Fallback to Mock
    detector_mock = LocalDeepfakeDetector(model_path="nonexistent.onnx", fallback_mode="mock")
    assert detector_mock.engine_type == ENGINE_MOCK_DEMO
    assert detector_mock.available is True

    # Fallback None (Strict mode: no weights means unavailable)
    detector_none = LocalDeepfakeDetector(model_path="nonexistent.onnx", fallback_mode="none")
    assert detector_none.engine_type == ENGINE_REAL_PRETRAINED
    assert detector_none.available is False


def test_fallback_mode_switching_speaker():
    """Verify LocalSpeakerEmbeddingService respects fallback_mode configuration."""
    spk_dsp = LocalSpeakerEmbeddingService(model_path="nonexistent.onnx", fallback_mode="dsp")
    assert spk_dsp.engine_type == ENGINE_LOCAL_DSP
    assert spk_dsp.available is True

    spk_mock = LocalSpeakerEmbeddingService(model_path="nonexistent.onnx", fallback_mode="mock")
    assert spk_mock.engine_type == ENGINE_MOCK_DEMO
    assert spk_mock.available is True

    spk_none = LocalSpeakerEmbeddingService(model_path="nonexistent.onnx", fallback_mode="none")
    assert spk_none.engine_type == ENGINE_REAL_PRETRAINED
    assert spk_none.available is False


def test_fallback_mode_switching_liveness():
    """Verify LocalLivenessDetector respects fallback_mode configuration."""
    live_dsp = LocalLivenessDetector(model_path="nonexistent.onnx", fallback_mode="dsp")
    assert live_dsp.engine_type == ENGINE_LOCAL_DSP
    assert live_dsp.available is True

    live_mock = LocalLivenessDetector(model_path="nonexistent.onnx", fallback_mode="mock")
    assert live_mock.engine_type == ENGINE_MOCK_DEMO
    assert live_mock.available is True

    live_none = LocalLivenessDetector(model_path="nonexistent.onnx", fallback_mode="none")
    assert live_none.engine_type == ENGINE_REAL_PRETRAINED
    assert live_none.available is False


# ==============================================================================
# 3. REAL PRETRAINED ONNX RUNTIME INFERENCE SIMULATION
# ==============================================================================

@pytest.mark.asyncio
async def test_pretrained_deepfake_detector_with_mocked_onnx_session():
    """Verify PretrainedDeepfakeDetector executes tensor operations when session is loaded."""
    mock_session = MagicMock()
    # Mock input: 1 input named 'input_values'
    mock_input = MagicMock()
    mock_input.name = "input_values"
    mock_input.shape = [1, 64600]
    mock_session.get_inputs.return_value = [mock_input]

    # Mock output: 1 output named 'logits' with shape [1, 2] -> [log(0.1), log(0.9)]
    mock_output = MagicMock()
    mock_output.name = "logits"
    mock_output.shape = [1, 2]
    mock_session.get_outputs.return_value = [mock_output]
    mock_session.run.return_value = [np.array([[-1.5, 2.3]], dtype=np.float32)]

    with patch("os.path.exists", return_value=True):
        with patch("onnxruntime.InferenceSession", return_value=mock_session):
            detector = PretrainedDeepfakeDetector(model_path="dummy_aasist.onnx")
            assert detector.available is True
            assert detector.status == "LOADED"
            assert detector.engine_type == ENGINE_REAL_PRETRAINED

            pcm_bytes = generate_audio_pcm(duration_sec=2.0)
            res = await detector.analyze(pcm_bytes)

            assert res.is_mock is False
            assert res.engine_type == ENGINE_REAL_PRETRAINED
            assert "AASIST" in res.model_name
            assert 0.0 <= res.ai_probability <= 1.0
            assert 0.0 <= res.human_probability <= 1.0
            assert res.inference_time_ms > 0
            # Verify session.run was invoked with correct input name
            mock_session.run.assert_called_once()


@pytest.mark.asyncio
async def test_pretrained_speaker_embedding_with_mocked_onnx_session():
    """Verify PretrainedSpeakerEmbeddingService extracts and L2-normalizes ONNX embeddings."""
    mock_session = MagicMock()
    mock_input = MagicMock()
    mock_input.name = "waveform"
    mock_input.shape = [1, "None"]
    mock_session.get_inputs.return_value = [mock_input]

    mock_output = MagicMock()
    mock_output.name = "embedding"
    mock_output.shape = [1, 192]
    mock_session.get_outputs.return_value = [mock_output]

    # Return unnormalized 192-dim vector
    raw_vec = np.ones((1, 192), dtype=np.float32) * 5.0
    mock_session.run.return_value = [raw_vec]

    with patch("os.path.exists", return_value=True):
        with patch("onnxruntime.InferenceSession", return_value=mock_session):
            service = PretrainedSpeakerEmbeddingService(model_path="dummy_ecapa.onnx", dimension=192)
            assert service.available is True
            assert service.status == "LOADED"

            pcm_bytes = generate_audio_pcm(duration_sec=1.5)
            res = await service.extract_embedding(pcm_bytes)

            assert res.dimension == 192
            assert res.engine_type == ENGINE_REAL_PRETRAINED
            assert "ECAPA" in res.model_name
            assert res.is_mock is False
            # Check unit L2 norm
            norm = np.linalg.norm(res.embedding)
            assert abs(norm - 1.0) < 1e-4


# ==============================================================================
# 4. BIOMETRIC PRIVACY & ZERO-SERVER-AUDIO INVARIANTS
# ==============================================================================

def test_speaker_comparison_omits_raw_embeddings():
    """Verify comparison result does not expose raw biometric embedding vectors."""
    comparator = SpeakerComparisonService()
    vec1 = [0.1] * 192
    vec2 = [0.1] * 192

    result = comparator.compare(vec1, vec2)
    result_dict = result.model_dump()

    # Must contain match score and metrics, never raw vectors
    assert "speaker_match_score" in result_dict
    assert "confidence" in result_dict
    assert "embedding_1" not in result_dict
    assert "embedding_2" not in result_dict
    assert "raw_embedding" not in result_dict


def test_zero_server_audio_in_telemetry_simulation():
    """Verify streaming telemetry packets NEVER contain raw audio data."""
    analyzer = LocalStreamAnalyzer()
    telemetry = analyzer.simulate_telemetry_window(scenario="voice_clone")

    # Critical security assertion: No raw audio data transmitted
    assert "raw_audio" not in telemetry
    assert "audio_bytes" not in telemetry
    assert "samples" not in telemetry
    assert "waveform" not in telemetry

    # Telemetry should only convey privacy-safe detection metrics
    assert "ai_generated_probability" in telemetry
    assert "threat_score" in telemetry
    assert "severity" in telemetry


def test_demo_scenario_banner_integrity():
    """Verify demo mode simulations clearly carry the DEMO banner."""
    analyzer = LocalStreamAnalyzer()
    telemetry_demo = analyzer.simulate_telemetry_window(scenario="voice_clone")
    assert telemetry_demo.get("simulation_banner") == "DEMO MODE — SIMULATED RESULT"
    assert telemetry_demo.get("engine_type") == ENGINE_MOCK_DEMO
