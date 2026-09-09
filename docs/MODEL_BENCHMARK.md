# VoxShield AI — AI Model Performance Benchmark & Latency Profile

## 1. Executive Summary

This document presents empirical inference benchmark measurements for the real pretrained neural models integrated into VoxShield AI during Phase 4:
- **AASIST-L**: Speech Anti-Spoofing & Deepfake Detection
- **ECAPA-TDNN**: 192-dimensional Speaker Identity Verification

The benchmarks demonstrate that real neural inference comfortably meets the real-time telephony budget of the sliding window engine (1500 ms window / 1000 ms interval), consuming **< 8%** of available compute time on standard CPU hardware.

---

## 2. Test Environment & Methodology

- **Host OS**: Microsoft Windows (AMD64)
- **Runtime**: Python 3.13.14
- **Execution Engine**: ONNX Runtime v1.29.0 (`CPUExecutionProvider`)
- **Audio Payload**: 2.00-second synthetic multi-tone speech-like audio (16,000 Hz, 16-bit mono PCM, 64,000 bytes)
- **Iterations**: 100 benchmark iterations per model preceded by 5 warm-up iterations
- **Benchmark Script**: `scripts/benchmark_models.py`
- **Output Artifact**: `docs/benchmark_results.json`

---

## 3. Detailed Benchmark Results

### 3.1 Deepfake Detection Model — AASIST-L (`REAL_PRETRAINED_MODEL`)

- **Model Checkpoint**: `aasist-l.onnx` (766,114 bytes)
- **Input Dimension**: `[1, 64600]` (4.0375 seconds @ 16 kHz)
- **Output Dimension**: `[1, 2]` (logits for human vs spoof)

| Metric | Measured Value | Telemetry Context |
| :--- | :--- | :--- |
| **Cold Start Latency** | **214.07 ms** | Model loading, session graph optimization, and first forward pass |
| **Warm-up Average (5 runs)** | **100.95 ms** | Post-warmup execution baseline |
| **P50 Latency (Median)** | **74.77 ms** | Typical operational latency |
| **Mean Latency (Avg)** | **75.63 ms** | Standard average across 100 iterations |
| **P95 Latency** | **84.96 ms** | 95% of inferences complete below this threshold |
| **P99 Latency** | **89.09 ms** | Tail latency envelope |
| **Min Latency** | **66.94 ms** | Best observed forward pass |
| **Max Latency** | **105.92 ms** | Worst-case observed forward pass |
| **Standard Deviation** | **5.49 ms** | Extremely consistent timing profile |
| **Throughput** | **13.22 inferences/sec** | Maximum continuous evaluation rate |

---

### 3.2 Speaker Identity Verification Model — ECAPA-TDNN (`REAL_PRETRAINED_MODEL`)

- **Model Checkpoint**: `voxceleb.onnx` (84,139,323 bytes)
- **Input Dimension**: `[1, frames, 80]` (log Mel-filterbanks)
- **Output Dimension**: `[1, 1, 192]` (192-d normalized speaker vector)

| Metric | Measured Value | Telemetry Context |
| :--- | :--- | :--- |
| **Cold Start Latency** | **220.40 ms** | Model loading and session graph initialization |
| **Warm-up Average (5 runs)** | **91.89 ms** | Post-warmup execution baseline |
| **P50 Latency (Median)** | **42.21 ms** | Typical operational latency |
| **Mean Latency (Avg)** | **43.96 ms** | Standard average across 100 iterations |
| **P95 Latency** | **54.28 ms** | 95% of inferences complete below this threshold |
| **P99 Latency** | **83.35 ms** | Tail latency envelope |
| **Min Latency** | **30.69 ms** | Best observed forward pass |
| **Max Latency** | **130.61 ms** | Worst-case observed forward pass |
| **Standard Deviation** | **11.72 ms** | Consistent timing profile |
| **Throughput** | **22.75 inferences/sec** | Maximum continuous evaluation rate |

---

## 4. Real-Time Streaming Sliding Window Budget Analysis

VoxShield AI analyzes audio in sliding windows during active calls:
- **Sliding Window Duration**: `1500 ms`
- **Telemetry Evaluation Hop**: `1000 ms`
- **Combined Neural Model Latency (P50)**: `74.77 ms + 42.21 ms = 116.98 ms`
- **Combined Neural Model Latency (Mean)**: `75.63 ms + 43.96 ms = 119.59 ms`
- **Combined Tail Latency (P95)**: `84.96 ms + 54.28 ms = 139.24 ms`

### Budget Utilization Summary:

$$\text{Compute Budget Utilization} = \frac{119.59 \text{ ms}}{1500 \text{ ms}} \approx 7.97\%$$

Neural inference consumes less than **8%** of the sliding window time budget, leaving over **92%** of CPU resources available for WebRTC audio transport, signaling, feature extraction, and threat telemetry dispatch.
