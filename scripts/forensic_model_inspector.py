import hashlib
import json
import os
import sys
from pathlib import Path
import onnxruntime as ort

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ai.config import resolve_model_path


def get_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def inspect_model(name: str, rel_path: str, manifest_entry: dict):
    filepath = Path(resolve_model_path(rel_path))
    print("\n" + "=" * 70)
    print(f"FORENSIC INSPECTION: {name}")
    print("=" * 70)

    # 1. Existence
    exists = filepath.exists()
    print(f"[*] Path:               {filepath}")
    print(f"[*] Exists:             {exists}")
    if not exists:
        print("[!] ERROR: File does not exist!")
        return

    # 2. File size
    size_bytes = filepath.stat().st_size
    size_mb = size_bytes / (1024 * 1024)
    print(f"[*] File Size (Bytes):  {size_bytes:,} bytes ({size_mb:.2f} MB)")
    print(f"[*] Manifest Size:      {manifest_entry.get('size_bytes'):,} bytes")
    print(f"[*] Size Match:         {size_bytes == manifest_entry.get('size_bytes')}")

    # 3. Checksum
    actual_sha = get_sha256(filepath)
    manifest_sha = manifest_entry.get("sha256")
    print(f"[*] Actual SHA-256:     {actual_sha}")
    print(f"[*] Manifest SHA-256:   {manifest_sha}")
    sha_match = (actual_sha == manifest_sha)
    print(f"[*] Checksum Match:     {sha_match}")

    # 4. Placeholder / Minimal model check
    # A genuine deepfake graph or speaker embedding model is hundreds of KB to tens of MB.
    # An empty or stub model is usually < 5 KB.
    is_placeholder = size_bytes < 10000
    print(f"[*] Is Placeholder:     {is_placeholder} (Size: {size_bytes} bytes)")

    # 5. ONNX Runtime Loading
    try:
        session = ort.InferenceSession(str(filepath), providers=["CPUExecutionProvider"])
        print("[*] ONNX Runtime Load:  SUCCESS")
    except Exception as e:
        print(f"[!] ONNX Runtime Load:  FAILED ({e})")
        return

    # 6. Model Metadata
    meta = session.get_modelmeta()
    print("[*] Model Metadata:")
    for attr in ["producer_name", "domain", "description", "graph_name", "graph_description", "version", "custom_metadata_map"]:
        val = getattr(meta, attr, None)
        print(f"    - {attr}: {val}")

    # 7. Inputs
    print("[*] Model Inputs:")
    for inp in session.get_inputs():
        print(f"    - Name: '{inp.name}' | Shape: {inp.shape} | Type: {inp.type}")

    # 8. Outputs
    print("[*] Model Outputs:")
    for out in session.get_outputs():
        print(f"    - Name: '{out.name}' | Shape: {out.shape} | Type: {out.type}")

    # 9. Initializers / Overridable Initializers
    try:
        overridable = session.get_overridable_initializers()
        print(f"[*] Overridable Inits:  {len(overridable)} item(s)")
    except Exception as e:
        print(f"[*] Overridable Inits:  N/A ({e})")

    # 10. Providers
    print(f"[*] Active Providers:   {session.get_providers()}")


def main():
    manifest_path = Path(resolve_model_path("backend/models/weights/MANIFEST.json"))
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    models_map = {m["type"]: m for m in manifest["models"]}

    inspect_model("AASIST-L Deepfake Anti-Spoofing", "models/weights/deepfake/aasist-l.onnx", models_map.get("deepfake", {}))
    inspect_model("ECAPA-TDNN Speaker Identification", "models/weights/speaker/voxceleb.onnx", models_map.get("speaker", {}))


if __name__ == "__main__":
    main()
