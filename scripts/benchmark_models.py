"""VoxShield AI — Phase 4 AI Model Performance Benchmark.

Executes 100 benchmark inference iterations on real pretrained ONNX models:
- AASIST-L Deepfake Spoof Detector
- ECAPA-TDNN Speaker Identity Encoder

Measures cold start latency, warm-up latency, p50, p95, p99, min, max, and throughput.
"""

import asyncio
import json
import math
import os
import sys
import time
from pathlib import Path
import numpy as np

# Ensure backend directory is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService


def generate_synthetic_audio(duration_sec: float = 2.0, sample_rate: int = 16000) -> bytes:
    """Generate 16-bit PCM mono synthetic speech-like multi-tone audio."""
    num_samples = int(duration_sec * sample_rate)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)
    # Fundamental frequency + formants (120 Hz, 800 Hz, 1800 Hz, 2800 Hz)
    sig = (
        0.40 * np.sin(2 * np.pi * 120 * t)
        + 0.25 * np.sin(2 * np.pi * 800 * t)
        + 0.20 * np.sin(2 * np.pi * 1800 * t)
        + 0.15 * np.sin(2 * np.pi * 2800 * t)
    )
    sig = np.clip(sig, -1.0, 1.0)
    pcm = (sig * 32767).astype(np.int16)
    return pcm.tobytes()


def calculate_stats(latencies_ms: list[float]) -> dict:
    arr = np.array(latencies_ms)
    return {
        "runs": len(latencies_ms),
        "mean_ms": round(float(np.mean(arr)), 2),
        "std_ms": round(float(np.std(arr)), 2),
        "min_ms": round(float(np.min(arr)), 2),
        "p50_ms": round(float(np.percentile(arr, 50)), 2),
        "p95_ms": round(float(np.percentile(arr, 95)), 2),
        "p99_ms": round(float(np.percentile(arr, 99)), 2),
        "max_ms": round(float(np.max(arr)), 2),
        "throughput_fps": round(1000.0 / float(np.mean(arr)), 2) if np.mean(arr) > 0 else 0,
    }


async def benchmark_deepfake(detector: LocalDeepfakeDetector, audio_bytes: bytes, runs: int = 100) -> dict:
    print("\n" + "=" * 60)
    print(f"BENCHMARKING: {detector.model_name} ({detector.engine_type})")
    print("=" * 60)

    # 1. Cold start
    t0 = time.perf_counter()
    cold_res = await detector.analyze(audio_bytes, sample_rate=16000)
    cold_start_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    print(f"[*] Cold Start Latency: {cold_start_ms:.2f} ms")
    print(f"    Classification: {cold_res.classification} (AI Prob: {cold_res.ai_probability:.4f})")

    # 2. Warm-up runs (5 runs)
    warmup_times = []
    for _ in range(5):
        t_start = time.perf_counter()
        await detector.analyze(audio_bytes, sample_rate=16000)
        warmup_times.append((time.perf_counter() - t_start) * 1000.0)
    warmup_avg_ms = round(float(np.mean(warmup_times)), 2)
    print(f"[*] Warm-up Average (5 runs): {warmup_avg_ms:.2f} ms")

    # 3. Benchmark runs
    latencies = []
    for i in range(runs):
        t_start = time.perf_counter()
        res = await detector.analyze(audio_bytes, sample_rate=16000)
        elapsed = (time.perf_counter() - t_start) * 1000.0
        latencies.append(elapsed)

    stats = calculate_stats(latencies)
    stats["cold_start_ms"] = cold_start_ms
    stats["warmup_avg_ms"] = warmup_avg_ms
    stats["engine"] = detector.engine_type
    stats["model_name"] = detector.model_name
    stats["model_version"] = detector.model_version
    stats["framework"] = detector.framework

    print(f"[*] Completed {runs} iterations:")
    print(f"    - Mean:   {stats['mean_ms']} ms")
    print(f"    - P50:    {stats['p50_ms']} ms")
    print(f"    - P95:    {stats['p95_ms']} ms")
    print(f"    - P99:    {stats['p99_ms']} ms")
    print(f"    - Min:    {stats['min_ms']} ms")
    print(f"    - Max:    {stats['max_ms']} ms")
    print(f"    - Throughput: {stats['throughput_fps']} inferences/sec")
    return stats


async def benchmark_speaker(service: LocalSpeakerEmbeddingService, audio_bytes: bytes, runs: int = 100) -> dict:
    print("\n" + "=" * 60)
    print(f"BENCHMARKING: {service.model_name} ({service.engine_type})")
    print("=" * 60)

    # 1. Cold start
    t0 = time.perf_counter()
    cold_res = await service.extract_embedding(audio_bytes, sample_rate=16000)
    cold_start_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    print(f"[*] Cold Start Latency: {cold_start_ms:.2f} ms")
    print(f"    Dimension: {cold_res.dimension} (First 3 components: {cold_res.embedding[:3]})")

    # 2. Warm-up runs (5 runs)
    warmup_times = []
    for _ in range(5):
        t_start = time.perf_counter()
        await service.extract_embedding(audio_bytes, sample_rate=16000)
        warmup_times.append((time.perf_counter() - t_start) * 1000.0)
    warmup_avg_ms = round(float(np.mean(warmup_times)), 2)
    print(f"[*] Warm-up Average (5 runs): {warmup_avg_ms:.2f} ms")

    # 3. Benchmark runs
    latencies = []
    for i in range(runs):
        t_start = time.perf_counter()
        res = await service.extract_embedding(audio_bytes, sample_rate=16000)
        elapsed = (time.perf_counter() - t_start) * 1000.0
        latencies.append(elapsed)

    stats = calculate_stats(latencies)
    stats["cold_start_ms"] = cold_start_ms
    stats["warmup_avg_ms"] = warmup_avg_ms
    stats["engine"] = service.engine_type
    stats["model_name"] = service.model_name
    stats["model_version"] = service.model_version
    stats["framework"] = service.framework

    print(f"[*] Completed {runs} iterations:")
    print(f"    - Mean:   {stats['mean_ms']} ms")
    print(f"    - P50:    {stats['p50_ms']} ms")
    print(f"    - P95:    {stats['p95_ms']} ms")
    print(f"    - P99:    {stats['p99_ms']} ms")
    print(f"    - Min:    {stats['min_ms']} ms")
    print(f"    - Max:    {stats['max_ms']} ms")
    print(f"    - Throughput: {stats['throughput_fps']} inferences/sec")
    return stats


async def main():
    print("VoxShield AI — Phase 4 Real Model Benchmark Runner")
    print("Initializing components...")

    audio = generate_synthetic_audio(duration_sec=2.0, sample_rate=16000)
    print(f"Generated {len(audio)} bytes of 16kHz PCM audio ({len(audio)/32000:.2f} seconds)")

    deepfake_detector = LocalDeepfakeDetector()
    speaker_service = LocalSpeakerEmbeddingService()

    df_stats = await benchmark_deepfake(deepfake_detector, audio, runs=100)
    spk_stats = await benchmark_speaker(speaker_service, audio, runs=100)

    import platform
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environment": {
            "os": platform.platform(),
            "python": platform.python_version(),
            "processor": platform.processor(),
            "cpu_identifier": os.environ.get("PROCESSOR_IDENTIFIER", "Unknown"),
            "execution_provider": "CPUExecutionProvider",
            "sample_rate_hz": 16000,
            "audio_duration_sec": 2.0,
            "warmup_runs": 5,
            "benchmark_runs": 100,
        },
        "deepfake_model": df_stats,
        "speaker_model": spk_stats,
    }

    out_file = REPO_ROOT / "docs" / "benchmark_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Benchmark results saved to {out_file}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
