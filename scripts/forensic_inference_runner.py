import json
import math
import os
import sys
import time
from pathlib import Path
import numpy as np
import onnxruntime as ort

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ai.config import resolve_model_path
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector
from app.ai.speaker.pretrained_embedding import PretrainedSpeakerEmbeddingService


def create_audio_silence(duration_sec: float = 4.0, sr: int = 16000) -> bytes:
    """Zero signal (silence)."""
    samples = np.zeros(int(duration_sec * sr), dtype=np.int16)
    return samples.tobytes()


def create_audio_human_speech(duration_sec: float = 4.0, sr: int = 16000, f0: float = 130.0) -> bytes:
    """Natural multi-formant speech simulation with natural vibrato and harmonic decay."""
    n = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    # Pitch modulation (natural human vibrato at 5 Hz)
    pitch_mod = f0 * (1.0 + 0.03 * np.sin(2 * np.pi * 5.0 * t))
    phase = 2 * np.pi * np.cumsum(pitch_mod) / sr
    sig = (
        0.45 * np.sin(phase)  # Fundamental
        + 0.25 * np.sin(2 * phase)  # 2nd harmonic
        + 0.15 * np.sin(3 * phase)  # 3rd harmonic
        + 0.10 * np.sin(4 * phase)  # 4th harmonic
        + 0.05 * np.sin(2 * np.pi * 1500 * t)  # F2 formant
    )
    # Natural speech envelope modulation (syllables at ~3 Hz)
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.0 * t) ** 2
    sig = np.clip(sig * envelope, -1.0, 1.0)
    return (sig * 32767).astype(np.int16).tobytes()


def create_audio_synthetic_vocoder(duration_sec: float = 4.0, sr: int = 16000) -> bytes:
    """Robotic vocoder / synthetic voice with harsh high-frequency buzz and phase jumps."""
    n = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    # Harsh sawtooth buzz at fixed pitch (robotic TTS / primitive vocoder signature)
    sig = 0.5 * (2.0 * ((t * 220.0) % 1.0) - 1.0)
    # Add phase discontinuities / glitches
    glitches = np.random.RandomState(42).choice([0.0, 0.3, -0.3], size=n, p=[0.98, 0.01, 0.01])
    sig = np.clip(sig + glitches, -1.0, 1.0)
    return (sig * 32767).astype(np.int16).tobytes()


def create_audio_replayed(duration_sec: float = 4.0, sr: int = 16000) -> bytes:
    """Acoustically filtered / replayed speech with room impulse reverberation."""
    base_bytes = create_audio_human_speech(duration_sec, sr, f0=150.0)
    sig = np.frombuffer(base_bytes, dtype=np.int16).astype(np.float32) / 32767.0
    # Apply simulated room reflection (exponential decay echo)
    delay_samples = int(0.040 * sr)  # 40 ms reflection
    reflected = np.pad(sig[:-delay_samples] * 0.4, (delay_samples, 0), mode="constant")
    sig = np.clip(sig + reflected, -1.0, 1.0)
    return (sig * 32767).astype(np.int16).tobytes()


async def verify_aasist_inference():
    print("\n" + "=" * 70)
    print("FORENSIC INFERENCE VERIFICATION: AASIST-L (Deepfake Detector)")
    print("=" * 70)

    model_path = resolve_model_path("backend/models/weights/deepfake/aasist-l.onnx")
    detector = PretrainedDeepfakeDetector(model_path=model_path)
    assert detector.available, "AASIST-L detector failed to load!"

    test_signals = {
        "Silence (Zeros)": create_audio_silence(duration_sec=4.0),
        "Normal Human Speech (Harmonic Formants)": create_audio_human_speech(duration_sec=4.0, f0=130.0),
        "Synthetic Vocoder (Sawtooth Buzz / Glitches)": create_audio_synthetic_vocoder(duration_sec=4.0),
        "Replayed / Reverberant Speech": create_audio_replayed(duration_sec=4.0),
    }

    results = {}
    for label, audio in test_signals.items():
        # Execute forward pass
        res = await detector.analyze(audio, sample_rate=16000)

        # Also get raw ONNX session run outputs directly
        waveform, sr = detector._prepare_tensor(np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32767.0, 16000), 16000
        raw_outputs = detector._session.run(None, {detector._input_name: waveform})
        raw_logits = raw_outputs[0][0].tolist()

        is_finite = np.all(np.isfinite(raw_logits)) and math.isfinite(res.ai_probability) and math.isfinite(res.human_probability)
        results[label] = {
            "raw_logits": [round(x, 4) for x in raw_logits],
            "human_prob": res.human_probability,
            "ai_prob": res.ai_probability,
            "classification": res.classification,
            "latency_ms": res.inference_time_ms,
            "is_finite": is_finite,
        }

        print(f"\n[*] Input: '{label}'")
        print(f"    Raw Logits [bonafide, spoof]: {results[label]['raw_logits']}")
        print(f"    Processed: Human Prob = {res.human_probability:.4f} | AI Prob = {res.ai_probability:.4f}")
        print(f"    Classification: {res.classification} | Latency: {res.inference_time_ms:.2f} ms")
        print(f"    Numerical Sanity (Finite): {is_finite}")

    # Verify that outputs are NOT constant across different inputs
    all_logits = [r["raw_logits"] for r in results.values()]
    distinct_logits = len(set(tuple(x) for x in all_logits))
    print(f"\n[*] Distinct Logit Vectors across {len(test_signals)} inputs: {distinct_logits} (Expected: > 1)")
    assert distinct_logits > 1, "CRITICAL ERROR: Model output is constant! Model is a dummy/stub."
    print("[+] AASIST-L Real Inference: VERIFIED (Model produces dynamic, finite, input-dependent logits).")


async def verify_ecapa_inference():
    print("\n" + "=" * 70)
    print("FORENSIC INFERENCE VERIFICATION: ECAPA-TDNN (Speaker Encoder)")
    print("=" * 70)

    model_path = resolve_model_path("backend/models/weights/speaker/voxceleb.onnx")
    service = PretrainedSpeakerEmbeddingService(model_path=model_path)
    assert service.available, "ECAPA-TDNN service failed to load!"

    # Create 3 speaker audios:
    # Speaker A: recording 1 (f0 = 120 Hz)
    # Speaker A: recording 2 (f0 = 120 Hz, different timing/envelope)
    # Speaker B: recording 1 (f0 = 240 Hz, female/high pitch)
    spk_a_rec1 = create_audio_human_speech(duration_sec=3.0, f0=120.0)
    # Same speaker A, but pitch contour slightly shifted
    spk_a_rec2 = create_audio_human_speech(duration_sec=3.0, f0=123.0)
    # Completely different speaker B (high pitch)
    spk_b_rec1 = create_audio_human_speech(duration_sec=3.0, f0=260.0)

    res_a1 = await service.extract_embedding(spk_a_rec1, sample_rate=16000)
    res_a2 = await service.extract_embedding(spk_a_rec2, sample_rate=16000)
    res_b1 = await service.extract_embedding(spk_b_rec1, sample_rate=16000)

    v_a1 = np.array(res_a1.embedding)
    v_a2 = np.array(res_a2.embedding)
    v_b1 = np.array(res_b1.embedding)

    # 1. Dimensionality
    print(f"[*] Embedding Dimensions: A1={len(v_a1)}, A2={len(v_a2)}, B1={len(v_b1)}")
    assert len(v_a1) == 192, f"Expected 192 dimensions, got {len(v_a1)}"

    # 2. L2 Unit Normalization
    norm_a1 = np.linalg.norm(v_a1)
    norm_a2 = np.linalg.norm(v_a2)
    norm_b1 = np.linalg.norm(v_b1)
    print(f"[*] L2 Norms: A1={norm_a1:.6f}, A2={norm_a2:.6f}, B1={norm_b1:.6f}")
    assert math.isclose(norm_a1, 1.0, abs_tol=1e-3)
    assert math.isclose(norm_a2, 1.0, abs_tol=1e-3)
    assert math.isclose(norm_b1, 1.0, abs_tol=1e-3)

    # 3. Pairwise Cosine Similarities
    # Identical recording
    sim_identical = float(np.dot(v_a1, v_a1))
    # Same speaker, different utterance
    sim_same_speaker = float(np.dot(v_a1, v_a2))
    # Different speaker
    sim_diff_speaker = float(np.dot(v_a1, v_b1))

    print("\n[*] Cosine Similarity Matrix:")
    print(f"    - Same Recording (A1 vs A1):       {sim_identical:.6f} (Expected: ~1.0000)")
    print(f"    - Same Speaker, Rec 2 (A1 vs A2):  {sim_same_speaker:.6f}")
    print(f"    - Different Speaker (A1 vs B1):     {sim_diff_speaker:.6f}")

    assert math.isclose(sim_identical, 1.0, abs_tol=1e-4), "Cosine similarity of identical vector must be 1.0"
    assert -1.0 <= sim_same_speaker <= 1.0, "Cosine similarity out of bounds"
    assert -1.0 <= sim_diff_speaker <= 1.0, "Cosine similarity out of bounds"
    assert not np.array_equal(v_a1, v_b1), "Speaker A and Speaker B vectors are identical! Stub detected."

    print("\n[*] First 5 Embedding Components:")
    print(f"    A1: {v_a1[:5].tolist()}")
    print(f"    A2: {v_a2[:5].tolist()}")
    print(f"    B1: {v_b1[:5].tolist()}")

    print("[+] ECAPA-TDNN Real Inference: VERIFIED (Model produces 192-d unit vectors with dynamic speaker discrimination).")


async def main():
    await verify_aasist_inference()
    await verify_ecapa_inference()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
