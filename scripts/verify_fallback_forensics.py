import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ai.config import ai_settings, resolve_model_path
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService


def test_explicit_modes():
    print("\n--- 1. TESTING EXPLICIT BACKEND MODES ---")

    # Mode: dsp
    ai_settings.AI_BACKEND = "dsp"
    df = LocalDeepfakeDetector()
    spk = LocalSpeakerEmbeddingService()
    print(f"[*] AI_BACKEND=dsp: df={df.engine_type} (avail={df.available}), spk={spk.engine_type} (avail={spk.available})")
    assert df.engine_type == "LOCAL_DSP_ANALYZER" and df.available is True
    assert spk.engine_type == "LOCAL_DSP_ANALYZER" and spk.available is True

    # Mode: mock
    ai_settings.AI_BACKEND = "mock"
    df = LocalDeepfakeDetector()
    spk = LocalSpeakerEmbeddingService()
    print(f"[*] AI_BACKEND=mock: df={df.engine_type} (avail={df.available}), spk={spk.engine_type} (avail={spk.available})")
    assert df.engine_type == "MOCK_DEMO_MODEL" and df.available is True
    assert spk.engine_type == "MOCK_DEMO_MODEL" and spk.available is True

    # Mode: none
    ai_settings.AI_BACKEND = "none"
    df = LocalDeepfakeDetector()
    spk = LocalSpeakerEmbeddingService()
    print(f"[*] AI_BACKEND=none: df={df.engine_type} (avail={df.available}, status={df.status}), spk={spk.engine_type} (avail={spk.available}, status={spk.status})")
    assert df.available is False
    assert spk.available is False


def test_missing_weights_fallback():
    print("\n--- 2. TESTING MISSING WEIGHTS FALLBACK IN AUTO MODE ---")
    df_path = Path(resolve_model_path("backend/models/weights/deepfake/aasist-l.onnx"))
    spk_path = Path(resolve_model_path("backend/models/weights/speaker/voxceleb.onnx"))

    df_bak = df_path.with_suffix(".onnx.bak")
    spk_bak = spk_path.with_suffix(".onnx.bak")

    try:
        # Temporarily rename weights
        df_path.rename(df_bak)
        spk_path.rename(spk_bak)
        print(f"[*] Temporarily renamed weights to .bak: df_exists={df_path.exists()}, spk_exists={spk_path.exists()}")

        # Case A: AI_BACKEND=auto, AI_FALLBACK_MODE=dsp
        ai_settings.AI_BACKEND = "auto"
        ai_settings.AI_FALLBACK_MODE = "dsp"
        df = LocalDeepfakeDetector()
        spk = LocalSpeakerEmbeddingService()
        print(f"[*] Auto with fallback=dsp:")
        print(f"    - Deepfake: engine={df.engine_type}, status={df.status}, weights_installed={df.metadata.weights_installed}")
        print(f"    - Speaker:  engine={spk.engine_type}, status={spk.status}, weights_installed={spk.metadata.weights_installed}")
        assert df.engine_type == "LOCAL_DSP_ANALYZER" and df.status == "FALLBACK_DSP" and df.metadata.weights_installed is False
        assert spk.engine_type == "LOCAL_DSP_ANALYZER" and spk.status == "FALLBACK_DSP" and spk.metadata.weights_installed is False

        # Case B: AI_BACKEND=auto, AI_FALLBACK_MODE=none
        ai_settings.AI_BACKEND = "auto"
        ai_settings.AI_FALLBACK_MODE = "none"
        df_none = LocalDeepfakeDetector()
        spk_none = LocalSpeakerEmbeddingService()
        print(f"[*] Auto with fallback=none:")
        print(f"    - Deepfake: avail={df_none.available}, status={df_none.status}")
        print(f"    - Speaker:  avail={spk_none.available}, status={spk_none.status}")
        assert df_none.available is False and df_none.status == "ADAPTER_READY_NO_WEIGHTS"
        assert spk_none.available is False and spk_none.status == "ADAPTER_READY_NO_WEIGHTS"

    finally:
        # Restore weights
        if df_bak.exists():
            df_bak.rename(df_path)
        if spk_bak.exists():
            spk_bak.rename(spk_path)
        print(f"[*] Restored weights: df_exists={df_path.exists()}, spk_exists={spk_path.exists()}")

    # Confirm return to REAL_PRETRAINED_MODEL
    ai_settings.AI_BACKEND = "auto"
    ai_settings.AI_FALLBACK_MODE = "dsp"
    df_restored = LocalDeepfakeDetector()
    spk_restored = LocalSpeakerEmbeddingService()
    print(f"\n--- 3. VERIFYING RESTORATION TO REAL_PRETRAINED_MODEL ---")
    print(f"[*] Deepfake: engine={df_restored.engine_type}, status={df_restored.status}, weights_installed={df_restored.metadata.weights_installed}")
    print(f"[*] Speaker:  engine={spk_restored.engine_type}, status={spk_restored.status}, weights_installed={spk_restored.metadata.weights_installed}")
    assert df_restored.engine_type == "REAL_PRETRAINED_MODEL" and df_restored.status == "LOADED" and df_restored.metadata.weights_installed is True
    assert spk_restored.engine_type == "REAL_PRETRAINED_MODEL" and spk_restored.status == "LOADED" and spk_restored.metadata.weights_installed is True
    print("[+] All Fallback & Restoration Transitions VERIFIED successfully!")


def main():
    print("=" * 70)
    print("FORENSIC FALLBACK & RESTORATION AUDIT")
    print("=" * 70)
    test_explicit_modes()
    test_missing_weights_fallback()


if __name__ == "__main__":
    main()
