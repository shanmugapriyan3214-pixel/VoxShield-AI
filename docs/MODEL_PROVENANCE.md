# VoxShield AI — Model Provenance & Cryptographic Lineage

## 1. Executive Summary & Zero-Tolerance Policy

VoxShield AI enforces a strict, zero-tolerance model provenance policy across all AI layers. Under this architecture, no simulated heuristic, digital signal processor (DSP), or placeholder mock is ever misrepresented as a pretrained neural network.

Every AI subsystem declares its cryptographic lineage, license, source dataset, and operational engine via the central `ModelRegistry` and the public `GET /api/v1/ai/status` endpoint.

---

## 2. Standardized 5-Tier Provenance Taxonomy

| Engine Type Code | Classification | Definition & Criteria |
| :--- | :--- | :--- |
| **`REAL_PRETRAINED_MODEL`** | Verified Neural Model | Pretrained neural network weights file (`.onnx`) exists on disk, cryptographic SHA-256 matches `MANIFEST.json`, and inference executes via ONNX Runtime. |
| **`LOCAL_DSP_ANALYZER`** | Signal Processing Fallback | Deterministic acoustic signal processing algorithms (energy, zero-crossing, spectral tilt/centroid, high-frequency rolloff, impulse decay). |
| **`ADAPTER_READY_NO_WEIGHTS`**| Architecture Adapter | Pretrained loader and tensor formatting adapter is compiled and ready, but weights file is not installed on disk. Inference is disabled. |
| **`MOCK_DEMO_MODEL`** | Test Simulation | Deterministic heuristic or mock generator used strictly in sandbox/demo environments. |
| **`UNAVAILABLE`** | Subsystem Offline | Component failed initialization, has unmet hardware dependencies, or is explicitly disabled by administrative policy. |

---

## 3. Active Checkpoint Lineage & Manifest

Every installed neural weight checkpoint is cryptographically anchored in `backend/models/weights/MANIFEST.json`:

```json
{
  "version": "1.0.0",
  "updated_at": "2026-09-09T00:53:18Z",
  "provenance_policy": "STRICT_ZERO_TOLERANCE_AUDIT",
  "models": [
    {
      "id": "deepfake-aasist-l",
      "name": "AASIST-L-AntiSpoof-ONNX",
      "version": "aasist-l-v1.0",
      "type": "deepfake",
      "provenance": "REAL_PRETRAINED_MODEL",
      "source": "SpeechAntiSpoofingBenchmarks/AASIST-L (ASVspoof 2019/2021 Logical Access)",
      "license": "MIT",
      "framework": "ONNX",
      "runtime": "onnxruntime",
      "file": "models/weights/deepfake/aasist-l.onnx",
      "sha256": "f43f0a638b52846f5d0e630c0a738d10e9306325945127c6f8662d559585f218",
      "size_bytes": 766114,
      "sample_rate": 16000,
      "input_shape": "[1, 64600]",
      "output_shape": "[1, 2]",
      "status": "VERIFIED_ON_DISK"
    },
    {
      "id": "speaker-ecapa-tdnn",
      "name": "ECAPA-TDNN-VoxCeleb-ONNX",
      "version": "ecapa-voxceleb-v1.0",
      "type": "speaker",
      "provenance": "REAL_PRETRAINED_MODEL",
      "source": "SpeechBrain / MelissaJ spkrec-ecapa-voxceleb-onnx (VoxCeleb 1 & 2)",
      "license": "MIT",
      "framework": "ONNX",
      "runtime": "onnxruntime",
      "file": "models/weights/speaker/voxceleb.onnx",
      "sha256": "2ef890f0212dbeb5684622c42c03b4df80ef4cc171da004d2ec754247a3cf3f9",
      "size_bytes": 84139323,
      "sample_rate": 16000,
      "input_shape": "[1, frames, 80]",
      "output_shape": "[1, 1, 192]",
      "status": "VERIFIED_ON_DISK"
    },
    {
      "id": "liveness-dsp-analyzer",
      "name": "Acoustic-Impulse-Decay-DSP",
      "version": "dsp-v2.5",
      "type": "liveness",
      "provenance": "LOCAL_DSP_ANALYZER",
      "source": "VoxShield AI Acoustic Feature Extractor (Impulse decay & HF rolloff)",
      "license": "Proprietary / Built-in",
      "framework": "dsp_numpy",
      "runtime": "python_dsp",
      "file": null,
      "sha256": null,
      "size_bytes": 0,
      "sample_rate": 16000,
      "input_shape": "[samples]",
      "output_shape": "scalar",
      "status": "ACTIVE_DSP_FALLBACK"
    }
  ]
}
```

---

## 4. Truthful Disclosure: Liveness Detection Subsystem

Unlike deepfake detection and speaker identity verification where real neural checkpoints are installed, VoxShield AI operates its **Replay & Liveness Detection** subsystem under an explicit, documented DSP fallback:

> **Official Provenance Statement:**
> *"Pretrained liveness model unavailable; DSP fallback active."*

The system analyzes impulse response decay, room reverberation patterns, and high-frequency spectral attenuation. Under NO circumstances is this classified as a neural network or pretrained machine learning model.

---

## 5. Security Invariant: Public Model Path Masking

To prevent server file system reconnaissance, `ModelMetadata.to_dict(mask_sensitive=True)` masks absolute internal disk paths before transmitting telemetry or API responses:

- Internal path: `D:\voiceREG\backend\models\weights\deepfake\aasist-l.onnx`
- Public API response: `[RESTRICTED_SERVER_PATH]`
- Model binaries (`*.onnx`) are excluded from Git commits via `.gitignore`.
