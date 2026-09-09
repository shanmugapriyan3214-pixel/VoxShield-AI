import asyncio
import os
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService


async def main():
    print("=" * 60)
    print("VOXSHIELD AI — LIVE PROVENANCE & FALLBACK VERIFICATION")
    print("=" * 60)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Query /api/v1/ai/status
        resp = await client.get("/api/v1/ai/status")
        assert resp.status_code == 200
        data = resp.json()["data"]
        print("\n[Step 1] Live GET /api/v1/ai/status Response:")
        for name, meta in data["models"].items():
            print(f"  --> {name}:")
            print(f"      engine_type:       {meta.get('engine_type')}")
            print(f"      provenance:        {meta.get('provenance')}")
            print(f"      engine:            {meta.get('engine')}")
            print(f"      weights_installed: {meta.get('weights_installed')}")
            print(f"      weights_loaded:    {meta.get('weights_loaded')}")
            print(f"      status:            {meta.get('status')}")

        # 2. Test DSP Fallback
        print("\n[Step 2] Testing Graceful DSP Fallback (missing.onnx):")
        df_dsp = LocalDeepfakeDetector(fallback_mode="dsp", model_path="missing.onnx")
        spk_dsp = LocalSpeakerEmbeddingService(fallback_mode="dsp", model_path="missing.onnx")
        print(f"  --> Deepfake Fallback: {df_dsp.engine_type} (status: {df_dsp.status}, weights_installed: {df_dsp.metadata.weights_installed})")
        print(f"  --> Speaker Fallback:  {spk_dsp.engine_type} (status: {spk_dsp.status}, weights_installed: {spk_dsp.metadata.weights_installed})")
        assert df_dsp.engine_type == "LOCAL_DSP_ANALYZER"
        assert spk_dsp.engine_type == "LOCAL_DSP_ANALYZER"

        # 3. Test Real Model Execution
        print("\n[Step 3] Testing Real Pretrained Model Re-engagement:")
        df_real = LocalDeepfakeDetector()
        spk_real = LocalSpeakerEmbeddingService()
        print(f"  --> Deepfake Real: {df_real.engine_type} (status: {df_real.status}, weights_installed: {df_real.metadata.weights_installed})")
        print(f"  --> Speaker Real:  {spk_real.engine_type} (status: {spk_real.status}, weights_installed: {spk_real.metadata.weights_installed})")
        assert df_real.engine_type == "REAL_PRETRAINED_MODEL"
        assert spk_real.engine_type == "REAL_PRETRAINED_MODEL"

    print("\n[OK] Live Provenance & Fallback Verification Completed Successfully!")


if __name__ == "__main__":
    asyncio.run(main())
