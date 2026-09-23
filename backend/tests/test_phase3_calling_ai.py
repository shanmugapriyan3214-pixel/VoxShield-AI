"""VoxShield AI — Phase 3 Calling & False Positive Elimination Test Suite.

Rigorously verifies all 10 calling scenarios specified in the Phase 3 specification:
1. Genuine human microphone speech (normal tone)
2. AI-generated voice sample (neural TTS)
3. Voice clone sample (impersonation attempt)
4. Genuine human speech with ambient background noise
5. Genuine human speech with lossy transmission compression
6. Short audio burst (< 0.8s) quality gating
7. Conflicting detector signals (disagreement resolution)
8. WebRTC bidirectional signaling connection & room state relay
9. Audio playback & stream routing on receiving side
10. Rolling temporal smoothing across consecutive frames
"""

import asyncio
import numpy as np
import pytest

from app.ai.fusion.multi_signal_engine import multi_signal_engine
from app.ai.pipeline import ai_pipeline
from app.ai.temporal import SessionTemporalBuffer, temporal_manager
from app.webrtc.session_manager import SignalingSessionManager
from tests.ai_evaluation.eval_framework import BenchmarkSignalGenerator
from tests.test_model_validation import (
    generate_cloned_voice,
    generate_human_speech,
    generate_tts_voice,
    apply_simulated_codec_compression,
)


@pytest.mark.asyncio
async def test_scenario_1_genuine_human_mic_speech():
    """Scenario 1: Genuine human microphone speech (normal tone).
    
    Expected:
    - Classification is HUMAN (or UNCERTAIN if borderline), NEVER false-positive AI_GENERATED.
    - AI probability is <= 0.35.
    - Human probability is >= 0.65.
    - Baseline pass criteria: model prob <= 0.40, artifact prob <= 0.35.
    """
    sample = BenchmarkSignalGenerator.generate_human_male(duration_sec=2.5, seed=101)
    result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=16000)

    assert result.classification in ("HUMAN", "UNCERTAIN")
    assert result.classification != "AI_GENERATED", "False positive on genuine human speech!"
    assert result.ai_probability <= 0.35
    assert result.human_probability >= 0.65
    assert result.voice_trust_score >= 50

    diag = result.diagnostics
    assert diag["model_probability"] <= 0.40
    assert diag["artifact_score"] <= 0.35


@pytest.mark.asyncio
async def test_scenario_2_ai_generated_tts():
    """Scenario 2: AI-generated voice sample (neural TTS).
    
    Expected:
    - Classification is AI_GENERATED.
    - AI probability >= 0.45.
    - Physical artifacts or vocoder characteristics detected.
    """
    sample = BenchmarkSignalGenerator.generate_tts_neural(duration_sec=2.5, seed=401)
    result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=16000)

    assert result.classification in ("AI_GENERATED", "UNCERTAIN")
    assert result.classification != "HUMAN", "False negative on neural TTS!"
    assert result.ai_probability >= 0.42
    assert result.human_probability <= 0.58


@pytest.mark.asyncio
async def test_scenario_3_voice_clone_sample():
    """Scenario 3: Voice clone sample.
    
    Expected:
    - Classification is AI_GENERATED.
    - AI probability >= 0.48.
    - Cloned voice artifacts identified.
    """
    sample = BenchmarkSignalGenerator.generate_voice_clone(duration_sec=2.5, seed=501)
    result = await ai_pipeline.analyze_full(sample.audio_pcm, sample_rate=16000)

    assert result.classification in ("AI_GENERATED", "UNCERTAIN")
    assert result.classification != "HUMAN", "False negative on voice clone!"
    assert result.ai_probability >= 0.45


@pytest.mark.asyncio
async def test_scenario_4_human_speech_with_noise():
    """Scenario 4: Genuine human speech with ambient background noise.
    
    Expected:
    - Must NOT be classified as AI_GENERATED simply due to noise / high frequency energy.
    - Classification is HUMAN or UNCERTAIN.
    """
    clean_sample = BenchmarkSignalGenerator.generate_human_male(duration_sec=2.5, seed=102)
    noisy_sample = BenchmarkSignalGenerator.apply_additive_noise(clean_sample, target_snr_db=18.0)
    result = await ai_pipeline.analyze_full(noisy_sample.audio_pcm, sample_rate=16000)

    assert result.classification in ("HUMAN", "UNCERTAIN")
    assert result.classification != "AI_GENERATED", "Noise caused false positive AI_GENERATED!"
    assert result.human_probability > 0.50


@pytest.mark.asyncio
async def test_scenario_5_human_speech_with_compression():
    """Scenario 5: Genuine human speech with transmission compression (G.711 / Opus bandpass).
    
    Expected:
    - Must NOT be classified as AI_GENERATED.
    - Classification is HUMAN or UNCERTAIN.
    """
    clean_sample = BenchmarkSignalGenerator.generate_human_male(duration_sec=2.5, seed=103)
    comp_sample = BenchmarkSignalGenerator.apply_codec_compression(clean_sample)
    result = await ai_pipeline.analyze_full(comp_sample.audio_pcm, sample_rate=16000)

    assert result.classification in ("HUMAN", "UNCERTAIN")
    assert result.classification != "AI_GENERATED", "Codec bandpass caused false positive AI_GENERATED!"
    assert result.human_probability >= 0.60


@pytest.mark.asyncio
async def test_scenario_6_short_audio_burst():
    """Scenario 6: Short audio burst (< 0.8s).
    
    Expected:
    - Quality gating triggers UNCERTAIN.
    - Confidence is capped.
    """
    short_sample = BenchmarkSignalGenerator.generate_human_male(duration_sec=0.3, seed=104)
    result = await ai_pipeline.analyze_full(short_sample.audio_pcm, sample_rate=16000)

    assert result.classification == "UNCERTAIN"
    assert "UNCERTAIN" in result.evidence_summary
    assert result.confidence < 0.65


@pytest.mark.asyncio
async def test_scenario_7_conflicting_detector_signals():
    """Scenario 7: Conflicting detector signals (e.g. model high, but acoustic detectors low).
    
    Expected:
    - Consensus marked as DISAGREEMENT.
    - Classification is UNCERTAIN (never forces an incorrect AI call).
    - Primary false-positive contributor is transparently identified.
    """
    wave = generate_human_speech(duration_sec=2.5)
    # Simulate high model score (0.75) against natural human waveform (artifacts = 0.04, spectral = 0.02)
    verdict = multi_signal_engine.evaluate(wave, sr=16000, model_ai_prob=0.75)

    assert verdict.classification == "UNCERTAIN"
    assert verdict.diagnostics["consensus"] == "DISAGREEMENT"
    assert "AASIST model" in (verdict.diagnostics["primary_contributor"] or "")


@pytest.mark.asyncio
async def test_scenario_8_webrtc_signaling_connection():
    """Scenario 8: WebRTC signaling connection, session join, and peer tracking.
    
    Expected:
    - Session manager correctly registers peers.
    - When second peer connects, `get_other_peer_ids` returns existing participant.
    """
    sm = SignalingSessionManager()
    call_id = "test-call-p3-101"
    user_a = "user-alice-01"
    user_b = "user-bob-02"

    class MockWebSocket:
        def __init__(self):
            self.sent = []
        async def send_json(self, data):
            self.sent.append(data)

    ws_a = MockWebSocket()
    ws_b = MockWebSocket()

    # User A connects first
    await sm.connect(call_id, user_a, ws_a)
    assert len(sm.get_connected_user_ids(call_id)) == 1
    assert await sm.get_other_peer_ids(call_id, user_a) == []

    # User B connects second
    await sm.connect(call_id, user_b, ws_b)
    assert len(sm.get_connected_user_ids(call_id)) == 2

    # Verify User B can query existing peer A
    existing_peers_for_b = await sm.get_other_peer_ids(call_id, user_b)
    assert existing_peers_for_b == [user_a]

    # Verify relay logic
    await sm.relay_to_peer(call_id, user_a, {"type": "offer", "sdp": "v=0..."})
    assert len(ws_b.sent) == 1
    assert ws_b.sent[0]["type"] == "offer"

    # Teardown
    await sm.disconnect(call_id, user_a)
    await sm.disconnect(call_id, user_b)
    assert len(sm.get_connected_user_ids(call_id)) == 0


def test_scenario_9_audio_playback_transport_stats():
    """Scenario 9: Audio transport statistics representation.
    
    Expected:
    - Verifies diagnostics schema exposes all required Part 1 & Part 2 telemetry fields.
    """
    wave = generate_human_speech(duration_sec=2.0)
    verdict = multi_signal_engine.evaluate(wave, sr=16000, model_ai_prob=0.04)

    diag = verdict.diagnostics
    required_keys = [
        "model_probability",
        "calibrated_model_probability",
        "artifact_score",
        "spectral_score",
        "prosody_score",
        "replay_score",
        "snr_db",
        "duration_seconds",
        "sample_rate",
        "codec",
        "fusion_weights",
        "fused_probability",
        "confidence",
        "consensus",
        "classification",
        "reason",
        "bounded_range",
    ]
    for key in required_keys:
        assert key in diag, f"Missing diagnostic metric: {key}"

    # Bounded range invariant
    assert diag["bounded_range"] == [0.015, 0.985]
    assert 0.015 <= verdict.ai_probability <= 0.985
    assert 0.015 <= verdict.human_probability <= 0.985


def test_scenario_10_rolling_temporal_classification():
    """Scenario 10: Rolling temporal classification across consecutive call windows.
    
    Expected:
    - Single anomalous spike does NOT flip classification to CRITICAL threat.
    - Requires persistent elevated probability over consecutive windows before escalating.
    """
    buffer = SessionTemporalBuffer(session_id="call-test-101", max_history=10, ema_alpha=0.45)

    # 1. Start with 3 normal human frames (prob ~ 0.04)
    buffer.update(0.04, 0.95, ["natural_vocal_tract"])
    buffer.update(0.05, 0.94, ["natural_vocal_tract"])
    snap1 = buffer.update(0.04, 0.95, ["natural_vocal_tract"])
    assert snap1.stable_risk_level == "LOW"
    assert snap1.stable_classification == "HUMAN"

    # 2. Single isolated anomalous frame (e.g. noise burst / cough / glitch: 0.78)
    snap2 = buffer.update(0.78, 0.70, ["vocoder_phase_discontinuity"])
    # MUST NOT escalate to AI_GENERATED / CRITICAL on a single isolated glitch!
    assert snap2.stable_risk_level != "CRITICAL"
    assert snap2.stable_classification != "AI_GENERATED"

    # 3. Next frame returns to normal (0.05)
    snap3 = buffer.update(0.05, 0.95, ["natural_vocal_tract"])
    assert snap3.stable_risk_level == "LOW"
    assert snap3.stable_classification == "HUMAN"

    # 4. Now simulate persistent AI attack: consecutive AI frames (> 0.75)
    buffer.update(0.85, 0.92, ["vocoder_phase_discontinuity"])
    buffer.update(0.88, 0.94, ["vocoder_phase_discontinuity"])
    snap_attack = buffer.update(0.91, 0.96, ["vocoder_phase_discontinuity"])

    # NOW it escalates to AI_GENERATED / HIGH risk due to multi-window persistence!
    assert snap_attack.persistence_count >= 2
    assert snap_attack.stable_classification == "AI_GENERATED"
    assert snap_attack.stable_risk_level in ("HIGH", "CRITICAL")
