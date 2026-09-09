# VoxShield AI — Model Installation & Setup Guide

## 1. Prerequisites & Dependencies

VoxShield AI utilizes **ONNX Runtime** for high-performance, cross-platform neural model execution on standard CPU hardware without requiring heavy PyTorch/CUDA overhead.

- **Python Version**: 3.11 – 3.13
- **ONNX Runtime**: `>= 1.20.0` (installed: `1.29.0`)
- **NumPy**: `>= 2.0.0` (installed: `2.5.3`)
- **SoundFile / Scipy**: Standard audio I/O libraries

Verify dependencies:
```bash
python -c "import onnxruntime as ort, numpy as np; print('ONNX Runtime:', ort.__version__, 'NumPy:', np.__version__)"
```

---

## 2. Directory Hierarchy

Model weight checkpoints are organized in dedicated subdirectories under `backend/models/weights/`:

```
backend/
├── models/
│   └── weights/
│       ├── MANIFEST.json                          # Cryptographic checksum manifest
│       ├── deepfake/
│       │   └── aasist-l.onnx                     # AASIST-L Deepfake Spoof Model (0.73 MB)
│       └── speaker/
│           └── voxceleb.onnx                     # ECAPA-TDNN Speaker Encoder (80.24 MB)
```

> **Note:** `.onnx` weight checkpoints are ignored in Git commits via `.gitignore` (`*.onnx`, `backend/models/weights/**/*.onnx`). Only `MANIFEST.json` is committed to repository version control.

---

## 3. Automated Checkpoint Download

Run the dedicated model download and verification script from the repository root:

```bash
python scripts/download_model_weights.py
```

The script automatically:
1. Downloads `aasist-l.onnx` from Hugging Face (`SpeechAntiSpoofingBenchmarks/AASIST-L`).
2. Downloads `voxceleb.onnx` from Hugging Face (`MelissaJ/spkrec-ecapa-voxceleb-onnx`).
3. Computes the cryptographic SHA-256 hash of each downloaded file.
4. Matches the computed hashes against `backend/models/weights/MANIFEST.json`.
5. Emits an error if checksum verification fails.

---

## 4. Manual Checkpoint Verification

To manually verify model integrity:

```powershell
# Verify AASIST-L SHA-256
Get-FileHash backend/models/weights/deepfake/aasist-l.onnx -Algorithm SHA256
# Expected: f43f0a638b52846f5d0e630c0a738d10e9306325945127c6f8662d559585f218

# Verify ECAPA-TDNN SHA-256
Get-FileHash backend/models/weights/speaker/voxceleb.onnx -Algorithm SHA256
# Expected: 2ef890f0212dbeb5684622c42c03b4df80ef4cc171da004d2ec754247a3cf3f9
```

---

## 5. Configuration & Environment Variables

Model execution behavior is configured in `.env` or system environment variables:

| Variable | Default Value | Options | Purpose |
| :--- | :--- | :--- | :--- |
| `AI_MODE` | `local` | `local`, `mock` | Global AI operating mode. |
| `AI_BACKEND` | `auto` | `auto`, `pretrained`, `dsp`, `mock`, `none` | Engine selection policy (`auto` loads ONNX weights if present, falls back gracefully). |
| `AI_DEVICE` | `cpu` | `cpu`, `cuda` | Hardware accelerator target. |
| `AI_FALLBACK_MODE` | `dsp` | `dsp`, `mock`, `none` | Fallback mechanism if neural weights file is missing. |
| `DEEPFAKE_MODEL_PATH` | `backend/models/weights/deepfake/aasist-l.onnx` | File path | Path to deepfake detection ONNX checkpoint. |
| `SPEAKER_MODEL_PATH` | `backend/models/weights/speaker/voxceleb.onnx` | File path | Path to speaker verification ONNX checkpoint. |
| `LIVENESS_MODEL_PATH` | `None` | File path or `None` | Path to liveness model (None = active DSP fallback). |

---

## 6. Verification Test

Run the automated model verification test suite:

```bash
pytest backend/tests/test_real_models.py -v
```
All 15 tests should pass with green status.
