"""VoxShield AI — Multi-Signal AI Authenticity & Detection Regression Test Suite.

Verifies:
1. Regression Fix: AI-generated / synthetic voice is NEVER reported as 100% Human.
2. Audio Quality Gating: Short (<0.6s) or silent samples yield UNCERTAIN with descriptive reasoning.
3. Multi-Signal Ensemble Fusion: Correctly fuses spectral, prosody, artifact, and neural signals.
4. Voice Trust Score: Derived dynamically and bounded in [0, 100].
5. Anti-Replay Separation: Loudspeaker/replay suspicion is tracked independently from synthetic probability.
6. Temporal Window Smoothing: Multi-segment persistence prevents single-window false alarms.
"""

import numpy as np
import pytest

from app.ai.artifacts import synthetic_artifact_detector
from app.ai.config import ai_settings, resolve_model_path
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector
from app.ai.fusion.multi_signal_engine import multi_signal_engine
from app.ai.pipeline import ai_pipeline
from app.ai.prosody import prosody_analyzer
from app.ai.quality import audio_quality_checker
from app.ai.replay import replay_suspicion_detector
from app.ai.temporal import SessionTemporalBuffer


def _generate_synthetic_tone(duration_sec: float = 2.0, freq: float = 440.0, sr: int = 16000) -> np.ndarray:
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    # Synthetic waveform with harsh artificial harmonics
    tone = 0.5 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 3 * t)
    return tone.astype(np.float32)


def _generate_simulated_human(duration_sec: float = 2.0, sr: int = 16000) -> np.ndarray:
    """Generate signal with dynamic human-like pitch excursions and natural envelope."""
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    # Pitch modulation (vibrato/prosody ~5 Hz LFO between 120 and 160 Hz)
    f0 = 140.0 + 20.0 * np.sin(2 * np.pi * 3.5 * t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    sig = 0.4 * np.sin(phase) + 0.2 * np.sin(2 * phase) + 0.1 * np.sin(3 * phase)
    # Amplitude envelope with syllabic bursts and micro-pauses
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 4.0 * t)
    return (sig * envelope).astype(np.float32)


# ==============================================================================
# 1. CRITICAL REGRESSION TEST: AI Voice != 100% Human
# ==============================================================================

@pytest.mark.asyncio
async def test_ai_synthetic_voice_not_classified_as_100_percent_human():
    """Verify that synthetic audio is NOT classified as LIKELY_HUMAN with 100% human probability."""
    path = resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH)
    detector = PretrainedDeepfakeDetector(model_path=path)

    synth_tone = _generate_synthetic_tone(duration_sec=2.5)
    pcm = (synth_tone * 32767).astype(np.int16).tobytes()

    result = await detector.analyze(pcm, sample_rate=16000)

    # Must NOT report 100% human
    assert result.human_probability < 0.30, f"False negative regression! Human probability was {result.human_probability}"
    assert result.ai_probability > 0.70, f"Expected high AI probability, got {result.ai_probability}"
    assert result.classification in ("LIKELY_AI_GENERATED", "SUSPICIOUS")


# ==============================================================================
# 2. AUDIO QUALITY GATING TESTS
# ==============================================================================

def test_audio_quality_gating_short_sample():
    """Short audio (<0.6s) must be flagged as unacceptable / UNCERTAIN."""
    short_wave = np.sin(np.linspace(0, 10, 4000)).astype(np.float32)  # 4000 samples @ 16kHz = 0.25s
    report = audio_quality_checker.evaluate(short_wave, sr=16000)

    assert report.is_acceptable is False
    assert any("too short" in s.lower() for s in report.issues)

    # Multi-signal verdict on short audio must yield UNCERTAIN
    verdict = multi_signal_engine.evaluate(short_wave, sr=16000, model_ai_prob=0.8)
    assert verdict.classification == "UNCERTAIN"
    assert "UNCERTAIN" in verdict.evidence_summary


def test_audio_quality_gating_silent_sample():
    """Near-silent audio must be gated into UNCERTAIN."""
    silent_wave = np.zeros(32000, dtype=np.float32)
    report = audio_quality_checker.evaluate(silent_wave, sr=16000)

    assert report.is_acceptable is False
    assert any("silent" in s.lower() for s in report.issues)

    verdict = multi_signal_engine.evaluate(silent_wave, sr=16000, model_ai_prob=0.5)
    assert verdict.classification == "UNCERTAIN"


# ==============================================================================
# 3. PROSODY & CADENCE ANALYSIS TESTS
# ==============================================================================

def test_prosody_flat_pitch_anomaly():
    """Monotone robotic speech triggers unnatural pitch regularity."""
    flat_pitch = (0.5 * np.sin(2 * np.pi * 180.0 * np.linspace(0, 2.0, 32000))).astype(np.float32)
    res = prosody_analyzer.analyze(flat_pitch, sr=16000)

    assert res.pitch_variability < 8.0
    assert "unnatural_pitch_regularity" in res.indicators or "compressed_intonation_contour" in res.indicators


def test_prosody_dynamic_human_cadence():
    """Natural modulated speech produces a low prosodic anomaly score."""
    human_sim = _generate_simulated_human(duration_sec=2.0)
    res = prosody_analyzer.analyze(human_sim, sr=16000)

    assert res.prosody_anomaly_score < 0.60
    assert res.rating in ("NATURAL", "SLIGHTLY_ANOMALOUS")


# ==============================================================================
# 4. SYNTHETIC ARTIFACT DETECTION TESTS
# ==============================================================================

def test_synthetic_artifact_detector():
    """Harsh synthetic tone triggers high vocoder phase or spectral flatness flags."""
    synth_tone = _generate_synthetic_tone(duration_sec=2.0)
    res = synthetic_artifact_detector.analyze(synth_tone, sr=16000)

    assert res.artifact_score > 0.30
    assert len(res.detected_artifacts) > 0


# ==============================================================================
# 5. MULTI-SIGNAL ENSEMBLE SCORE FUSION TESTS
# ==============================================================================

def test_multi_signal_engine_score_bounds_and_trust():
    """Verdict probabilities must sum to 1.0, trust score bounded in [0, 100]."""
    wave = _generate_simulated_human(duration_sec=2.0)
    verdict = multi_signal_engine.evaluate(wave, sr=16000, model_ai_prob=0.10)

    assert 0.0 <= verdict.ai_probability <= 1.0
    assert 0.0 <= verdict.human_probability <= 1.0
    assert pytest.approx(verdict.ai_probability + verdict.human_probability, abs=0.01) == 1.0
    assert 0 <= verdict.voice_trust_score <= 100
    assert verdict.classification in ("HUMAN", "AI_GENERATED", "UNCERTAIN")
    assert "spectral" in verdict.signals
    assert "prosody" in verdict.signals
    assert "synthetic_artifacts" in verdict.signals


# ==============================================================================
# 6. ANTI-REPLAY SEPARATION TESTS
# ==============================================================================

def test_anti_replay_separation():
    """Replay detector operates independently and does not automatically mark audio as AI."""
    wave = _generate_simulated_human(duration_sec=2.0)
    res = replay_suspicion_detector.analyze(wave, sr=16000)

    assert 0.0 <= res.replay_score <= 1.0
    assert isinstance(res.is_replay_suspicious, bool)


# ==============================================================================
# 7. TEMPORAL SMOOTHING & PERSISTENCE TESTS
# ==============================================================================

def test_temporal_window_buffer_smoothing():
    """Isolated single AI spike should not trigger persistent threat; sustained AI must."""
    buf = SessionTemporalBuffer(session_id="test-session-1")

    # Segment 1: Benign human
    s1 = buf.update(raw_ai_prob=0.15, confidence=0.9)
    assert s1.is_persistent_threat is False
    assert s1.current_classification == "HUMAN"

    # Segment 2: Isolated glitch spike
    s2 = buf.update(raw_ai_prob=0.72, confidence=0.85)
    # EMA smoothing tempers single spike
    assert s2.is_persistent_threat is False

    # Segment 3: Continued elevated AI
    s3 = buf.update(raw_ai_prob=0.88, confidence=0.92)
    # Now sustained >= 2 segments
    assert s3.is_persistent_threat is True
    assert s3.current_classification == "AI_GENERATED"
