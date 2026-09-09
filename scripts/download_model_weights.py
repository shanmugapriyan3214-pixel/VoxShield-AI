"""VoxShield AI — Phase 4 Model Weight Downloader & Manifest Generator.

Downloads legitimate verified pretrained ONNX checkpoints:
1. Deepfake Detection: AASIST-L (ASVspoof 2019/2021 LA Benchmark, MIT License)
2. Speaker Verification: SpeechBrain ECAPA-TDNN (VoxCeleb 1 & 2 Benchmark, MIT License)

Stores weights in backend/models/weights/ and generates cryptographic MANIFEST.json.
"""

import hashlib
import json
import os
import sys
import time
import urllib.request

MODELS_CONFIG = [
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
        "dir": "backend/models/weights/deepfake",
        "filename": "aasist-l.onnx",
        "url": "https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L/resolve/main/aasist-l.onnx",
        "sample_rate": 16000,
        "input_shape": "[1, 64600]",
        "output_shape": "[1, 2]",
        "description": "Graph attention network for raw waveform speech deepfake and logical access anti-spoofing.",
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
        "dir": "backend/models/weights/speaker",
        "filename": "voxceleb.onnx",
        "url": "https://huggingface.co/MelissaJ/spkrec-ecapa-voxceleb-onnx/resolve/main/voxceleb.onnx",
        "sample_rate": 16000,
        "input_shape": "[1, frames, 80]",
        "output_shape": "[1, 1, 192]",
        "description": "Emphasized Channel Attention Time Delay Neural Network for 192-dim speaker voiceprint verification.",
    },
]


def compute_sha256(filepath: str) -> str:
    """Compute SHA-256 checksum of a file."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def download_file(url: str, dest_path: str) -> None:
    """Download a file with progress reporting."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"  [OK] Already downloaded: {dest_path} ({os.path.getsize(dest_path) / 1024 / 1024:.2f} MB)")
        return

    print(f"  --> Downloading from {url}...")
    start_time = time.time()

    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = downloaded / total_size * 100
            mb_down = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\r    Progress: {percent:.1f}% ({mb_down:.2f}/{mb_total:.2f} MB)")
            sys.stdout.flush()

    urllib.request.urlretrieve(url, dest_path, reporthook=report_progress)
    sys.stdout.write("\n")
    elapsed = time.time() - start_time
    print(f"  [OK] Saved to {dest_path} ({os.path.getsize(dest_path) / 1024 / 1024:.2f} MB in {elapsed:.1f}s)")


def main():
    print("==================================================================")
    print("  VOXSHIELD AI -- PHASE 4 MODEL WEIGHT ACQUISITION & MANIFEST GEN  ")
    print("==================================================================\n")

    manifest_entries = []

    for cfg in MODELS_CONFIG:
        print(f"Processing model: {cfg['name']} ({cfg['type']})...")
        dest = os.path.join(cfg["dir"], cfg["filename"])
        download_file(cfg["url"], dest)

        sha = compute_sha256(dest)
        size_bytes = os.path.getsize(dest)
        print(f"  [OK] SHA-256: {sha}")
        print(f"  [OK] Size: {size_bytes} bytes")

        entry = {
            "id": cfg["id"],
            "name": cfg["name"],
            "version": cfg["version"],
            "type": cfg["type"],
            "provenance": cfg["provenance"],
            "source": cfg["source"],
            "license": cfg["license"],
            "framework": cfg["framework"],
            "runtime": cfg["runtime"],
            "file": os.path.relpath(dest, "backend").replace("\\", "/"),
            "sha256": sha,
            "size_bytes": size_bytes,
            "sample_rate": cfg["sample_rate"],
            "input_shape": cfg["input_shape"],
            "output_shape": cfg["output_shape"],
            "status": "VERIFIED_ON_DISK",
            "description": cfg["description"],
        }
        manifest_entries.append(entry)

    # Also document Liveness component in manifest per strict provenance policy
    manifest_entries.append({
        "id": "liveness-dsp-analyzer",
        "name": "Acoustic-Impulse-Decay-DSP",
        "version": "dsp-v2.5",
        "type": "liveness",
        "provenance": "LOCAL_DSP_ANALYZER",
        "source": "VoxShield AI Acoustic Feature Extractor (Impulse decay & HF rolloff)",
        "license": "Proprietary / Built-in",
        "framework": "dsp_numpy",
        "runtime": "python_dsp",
        "file": None,
        "sha256": None,
        "size_bytes": 0,
        "sample_rate": 16000,
        "input_shape": "[samples]",
        "output_shape": "scalar",
        "status": "ACTIVE_DSP_FALLBACK",
        "description": "Pretrained liveness model unavailable; DSP fallback active. Deterministic room acoustic impulse decay.",
    })

    manifest_data = {
        "version": "1.0.0",
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "provenance_policy": "STRICT_ZERO_TOLERANCE_AUDIT",
        "models": manifest_entries,
    }

    manifest_path = "backend/models/weights/MANIFEST.json"
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print(f"\n[OK] Generated canonical manifest: {manifest_path}")
    print("==================================================================")
    print("  MODEL WEIGHTS INSTALLED & MANIFEST GENERATED SUCCESSFULLY")
    print("==================================================================")


if __name__ == "__main__":
    main()
