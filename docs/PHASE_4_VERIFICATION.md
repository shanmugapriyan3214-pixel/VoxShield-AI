# VoxShield AI — Phase 4 Verification & Audit Report

## 1. Phase Objective & Governance Compliance

**Phase 4 Goal:** Install, execute, benchmark, and verify REAL pretrained deepfake and speaker verification models under ONNX Runtime with a strict, auditable provenance taxonomy.

### Invariants Maintained:
- **Zero-Server-Audio Invariant**: Raw audio uploaded during WebRTC calls = **0 bytes**.
- **Model Provenance Invariant**: Strict 5-tier classification; no mock or DSP heuristic is reported as neural.
- **Liveness Transparency**: Liveness is honestly declared as `LOCAL_DSP_ANALYZER` with active DSP fallback.
- **Repository Cleanliness**: Binary weight checkpoints (`*.onnx`) are strictly excluded via `.gitignore`; only `MANIFEST.json` is committed.
- **Backward Compatibility**: All 69 Phase 1–3.1 tests preserved; total test count expanded to 84.

---

## 2. Model Checkpoint & Checksum Verification

Both pretrained models were downloaded and verified against cryptographic hashes defined in `backend/models/weights/MANIFEST.json`:

| Model ID | File Path | File Size | SHA-256 Checksum | License | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `deepfake-aasist-l` | `models/weights/deepfake/aasist-l.onnx` | 766,114 bytes (0.73 MB) | `f43f0a638b52846f5d0e630c0a738d10e9306325945127c6f8662d559585f218` | MIT | **MATCHED / VERIFIED** |
| `speaker-ecapa-tdnn` | `models/weights/speaker/voxceleb.onnx` | 84,139,323 bytes (80.24 MB) | `2ef890f0212dbeb5684622c42c03b4df80ef4cc171da004d2ec754247a3cf3f9` | MIT | **MATCHED / VERIFIED** |
| `liveness-dsp` | N/A (DSP Fallback) | 0 bytes | N/A | Proprietary | **VERIFIED DSP FALLBACK** |

---

## 3. Automated Test Suite Results

### 3.1 Backend Test Results (Pytest)
```
======================= 84 passed, 5 warnings in 12.79s =======================
```
- **Total Backend Tests**: 84 passed, 0 failed.
- **Baseline Tests (Phase 1–3.1)**: 69/69 passed.
- **Phase 4 Sanity & Provenance Tests (`test_real_models.py`)**: 15/15 passed:
  1. `test_aasist_l_file_exists_and_sha256` — PASSED
  2. `test_ecapa_tdnn_file_exists_and_sha256` — PASSED
  3. `test_manifest_schema_and_validity` — PASSED
  4. `test_aasist_l_onnx_session_loads` — PASSED
  5. `test_ecapa_tdnn_onnx_session_loads` — PASSED
  6. `test_aasist_l_input_output_shapes` — PASSED
  7. `test_ecapa_tdnn_input_output_shapes` — PASSED
  8. `test_aasist_l_inference_numerical_sanity` — PASSED
  9. `test_aasist_l_probabilities_in_range` — PASSED
  10. `test_ecapa_tdnn_embedding_dimension_and_l2_norm` — PASSED
  11. `test_ecapa_tdnn_cosine_similarity` — PASSED
  12. `test_detector_fallback_on_missing_weights` — PASSED
  13. `test_speaker_fallback_on_missing_weights` — PASSED
  14. `test_provenance_taxonomy_accuracy` — PASSED
  15. `test_liveness_detector_truthful_dsp` — PASSED

### 3.2 Frontend Test Results (Vitest)
```
 Test Files  8 passed (8)
      Tests  25 passed (25)
   Duration  286ms
```
- **Total Frontend Tests**: 25/25 passed.

### 3.3 Frontend Production Build
```
vite v6.4.3 building for production...
✓ 1607 modules transformed.
dist/index.html                   1.38 kB │ gzip:  0.76 kB
dist/assets/index-M4WI4Xan.css   38.28 kB │ gzip:  6.89 kB
dist/assets/index-D2X_uLA3.js   350.83 kB │ gzip: 90.71 kB
✓ built in 2.21s
```

---

## 4. Benchmark Performance Summary

| Subsystem | Model Name | Cold Start | P50 Latency | Mean Latency | P95 Latency | Throughput |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Deepfake Anti-Spoofing** | AASIST-L-AntiSpoof-ONNX | 214.07 ms | 74.77 ms | 75.63 ms | 84.96 ms | 13.22 fps |
| **Speaker Identification** | ECAPA-TDNN-VoxCeleb-ONNX | 220.40 ms | 42.21 ms | 43.96 ms | 54.28 ms | 22.75 fps |
| **Total Neural Latency** | Combined Pipeline | 434.47 ms | 116.98 ms | 119.59 ms | 139.24 ms | ~8.4 fps |

**Streaming Budget Utilization:** 119.59 ms / 1500 ms window = **7.97%** of budget utilized.

---

## 5. Graceful Fallback Verification

When checkpoints are moved, missing, or when `AI_BACKEND=dsp` is configured:
1. `LocalDeepfakeDetector` transparently selects `DSPDeepfakeDetector`.
2. Metadata reflects `engine_type="LOCAL_DSP_ANALYZER"`, `status="FALLBACK_DSP"`, `weights_installed=False`.
3. When weights are restored, the engine automatically re-engages `PretrainedDeepfakeDetector` (`REAL_PRETRAINED_MODEL`).
4. System operation is non-breaking and fully resilient to filesystem changes.
