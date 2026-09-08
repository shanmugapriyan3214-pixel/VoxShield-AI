"""VoxShield AI — Phase 2.5 Model Registry Test Suite."""

import pytest
from httpx import AsyncClient

from app.ai.base import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
)
from app.ai.registry import ModelMetadata, ModelRegistry, model_registry


def test_model_registry_registration_and_retrieval():
    """Verify registry stores, updates, and retrieves component metadata."""
    registry = ModelRegistry()

    meta = ModelMetadata(
        component_name="test_deepfake_detector",
        model_name="AASIST-L-ONNX",
        model_version="1.0.0",
        engine_type=ENGINE_REAL_PRETRAINED,
        framework="onnxruntime",
        device="cpu",
        status="LOADED",
        available=True,
        input_shape="[batch, 64600]",
        output_shape="[batch, 2]",
        model_path="models/weights/test.onnx",
    )

    registry.register(meta)

    retrieved = registry.get("test_deepfake_detector")
    assert retrieved is not None
    assert retrieved.model_name == "AASIST-L-ONNX"
    assert retrieved.engine_type == ENGINE_REAL_PRETRAINED

    # Test masking of sensitive internal paths
    public_dict = retrieved.to_dict(mask_sensitive=True)
    assert public_dict["model_path"] == "[RESTRICTED_SERVER_PATH]"
    assert public_dict["engine_type"] == ENGINE_REAL_PRETRAINED
    assert public_dict["framework"] == "onnxruntime"

    internal_dict = retrieved.to_dict(mask_sensitive=False)
    assert internal_dict["model_path"] == "models/weights/test.onnx"


def test_model_registry_benchmark_recording():
    """Test recording and calculation of moving average benchmark inference times."""
    registry = ModelRegistry()
    meta = ModelMetadata(
        component_name="test_encoder",
        model_name="ECAPA-TDNN",
        engine_type=ENGINE_REAL_PRETRAINED,
    )
    registry.register(meta)

    registry.record_benchmark("test_encoder", 12.0)
    registry.record_benchmark("test_encoder", 16.0)

    updated = registry.get("test_encoder")
    assert updated is not None
    assert updated.benchmark_avg_ms == 14.0


@pytest.mark.asyncio
async def test_ai_status_endpoint_reports_model_registry(client: AsyncClient):
    """Test that GET /api/v1/ai/status exposes model registry without leaking paths."""
    resp = await client.get("/api/v1/ai/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    data = body["data"]

    assert "models" in data
    assert "fallback_mode" in data
    models = data["models"]

    # Verify standard AI components are present in registry
    assert "deepfake_detector" in models
    assert "speaker_encoder" in models
    assert "liveness_detector" in models
    assert "speaker_verification" in models

    for component, meta in models.items():
        assert meta["engine_type"] in (
            ENGINE_REAL_PRETRAINED,
            ENGINE_LOCAL_DSP,
            ENGINE_MOCK_DEMO,
        )
        assert meta["framework"] in ("onnxruntime", "numpy_dsp", "mock_simulation", "dsp_numpy", "mock")
        # Ensure model_path is masked in public API
        assert meta.get("model_path") in (None, "[RESTRICTED_SERVER_PATH]")


def test_global_model_registry_defaults():
    """Verify default global model registry includes all core subsystems."""
    from app.ai.pipeline import ai_pipeline  # triggers registry sync
    summary = model_registry.get_summary(mask_sensitive=True)
    assert "deepfake_detector" in summary
    assert "speaker_encoder" in summary
    assert "liveness_detector" in summary
    assert "speaker_verification" in summary
