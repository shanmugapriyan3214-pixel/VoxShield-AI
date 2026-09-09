"""VoxShield AI — Phase 4 Automated Sanity & Provenance Test Suite.

Verifies:
- Checksum integrity of downloaded real ONNX models against MANIFEST.json
- Session initialization with ONNX Runtime
- Tensor input/output shapes and signature verification
- Numerical sanity: finite outputs, valid probabilities [0, 1]
- Unit L2-norm normalization for speaker embeddings (norm == 1.0)
- Cosine identity verification bounds [-1, 1]
- Transparent fallback to LOCAL_DSP_ANALYZER on missing weights
- Provenance taxonomy accuracy in ModelMetadata
- Truthful liveness DSP classification without false neural claims
"""

import hashlib
import json
import os
from pathlib import Path
import numpy as np
import pytest

from app.ai.config import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
    ai_settings,
    resolve_model_path,
)
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector
from app.ai.liveness.detector import LocalLivenessDetector
from app.ai.registry import ModelMetadata, model_registry
from app.ai.speaker.embedding import LocalSpeakerEmbeddingService
from app.ai.speaker.pretrained_embedding import PretrainedSpeakerEmbeddingService


def _generate_synthetic_pcm(duration_sec: float = 2.0, freq: float = 220.0, sample_rate: int = 16000) -> bytes:
    num_samples = int(duration_sec * sample_rate)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)
    sig = 0.5 * np.sin(2 * np.pi * freq * t)
    pcm = (sig * 32767).astype(np.int16)
    return pcm.tobytes()


def _file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


@pytest.fixture
def manifest_data():
    manifest_path = resolve_model_path("backend/models/weights/MANIFEST.json")
    if not manifest_path or not os.path.exists(manifest_path):
        manifest_path = "models/weights/MANIFEST.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_models_by_type(manifest_data):
    return {m["type"]: m for m in manifest_data["models"]}


def test_aasist_l_file_exists_and_sha256(manifest_data):
    """Verify AASIST-L ONNX model file exists and matches the manifest SHA-256 hash."""
    models = _get_models_by_type(manifest_data)
    assert "deepfake" in models
    rel_path = models["deepfake"]["file"]
    model_path = resolve_model_path(rel_path)
    assert model_path is not None, f"Cannot resolve path for {rel_path}"
    assert os.path.exists(model_path), f"File does not exist: {model_path}"

    expected_sha256 = models["deepfake"]["sha256"]
    actual_sha256 = _file_sha256(model_path)
    assert actual_sha256 == expected_sha256, f"SHA-256 mismatch! Expected {expected_sha256}, got {actual_sha256}"


def test_ecapa_tdnn_file_exists_and_sha256(manifest_data):
    """Verify ECAPA-TDNN ONNX model file exists and matches the manifest SHA-256 hash."""
    models = _get_models_by_type(manifest_data)
    assert "speaker" in models
    rel_path = models["speaker"]["file"]
    model_path = resolve_model_path(rel_path)
    assert model_path is not None, f"Cannot resolve path for {rel_path}"
    assert os.path.exists(model_path), f"File does not exist: {model_path}"

    expected_sha256 = models["speaker"]["sha256"]
    actual_sha256 = _file_sha256(model_path)
    assert actual_sha256 == expected_sha256, f"SHA-256 mismatch! Expected {expected_sha256}, got {actual_sha256}"


def test_manifest_schema_and_validity(manifest_data):
    """Verify MANIFEST.json has required schema, sample rates, and open source licenses."""
    assert "version" in manifest_data
    assert "models" in manifest_data
    assert isinstance(manifest_data["models"], list)

    models = _get_models_by_type(manifest_data)
    assert "deepfake" in models
    assert "speaker" in models
    assert "liveness" in models

    df_info = models["deepfake"]
    assert df_info["sample_rate"] == 16000
    assert df_info["framework"].lower() == "onnx"
    assert "license" in df_info

    spk_info = models["speaker"]
    assert spk_info["sample_rate"] == 16000
    assert spk_info["framework"].lower() == "onnx"
    assert "license" in spk_info


def test_aasist_l_onnx_session_loads():
    """Verify PretrainedDeepfakeDetector loads ONNX session successfully."""
    path = resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH)
    detector = PretrainedDeepfakeDetector(model_path=path)
    assert detector.available is True
    assert detector.status == "LOADED"
    assert detector.engine_type == ENGINE_REAL_PRETRAINED
    assert detector._session is not None


def test_ecapa_tdnn_onnx_session_loads():
    """Verify PretrainedSpeakerEmbeddingService loads ONNX session successfully."""
    path = resolve_model_path(ai_settings.SPEAKER_MODEL_PATH)
    service = PretrainedSpeakerEmbeddingService(model_path=path)
    assert service.available is True
    assert service.status == "LOADED"
    assert service.engine_type == ENGINE_REAL_PRETRAINED
    assert service._session is not None


def test_aasist_l_input_output_shapes():
    """Verify AASIST-L ONNX inputs and outputs are correctly recognized."""
    path = resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH)
    detector = PretrainedDeepfakeDetector(model_path=path)
    input_meta = detector._session.get_inputs()[0]
    output_meta = detector._session.get_outputs()[0]

    assert input_meta.name == "wav"
    assert output_meta.name == "logits"
    assert detector._input_shape is not None


def test_ecapa_tdnn_input_output_shapes():
    """Verify ECAPA-TDNN ONNX inputs and outputs are correctly recognized."""
    path = resolve_model_path(ai_settings.SPEAKER_MODEL_PATH)
    service = PretrainedSpeakerEmbeddingService(model_path=path)
    input_meta = service._session.get_inputs()[0]
    output_meta = service._session.get_outputs()[0]

    assert input_meta.name == "audio_input"
    assert output_meta.name == "embedding_output"


@pytest.mark.asyncio
async def test_aasist_l_inference_numerical_sanity():
    """Verify AASIST-L inference produces finite, non-NaN values."""
    path = resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH)
    detector = PretrainedDeepfakeDetector(model_path=path)
    audio = _generate_synthetic_pcm(duration_sec=2.0)

    result = await detector.analyze(audio, sample_rate=16000)
    assert not np.isnan(result.ai_probability)
    assert not np.isinf(result.ai_probability)
    assert not np.isnan(result.human_probability)
    assert not np.isinf(result.human_probability)
    assert result.engine_type == ENGINE_REAL_PRETRAINED
    assert result.is_mock is False


@pytest.mark.asyncio
async def test_aasist_l_probabilities_in_range():
    """Verify AASIST-L returns probabilities bounded within [0, 1] that sum to ~1.0."""
    path = resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH)
    detector = PretrainedDeepfakeDetector(model_path=path)
    audio = _generate_synthetic_pcm(duration_sec=2.0)

    result = await detector.analyze(audio, sample_rate=16000)
    assert 0.0 <= result.ai_probability <= 1.0
    assert 0.0 <= result.human_probability <= 1.0
    assert pytest.approx(result.ai_probability + result.human_probability, abs=0.01) == 1.0


@pytest.mark.asyncio
async def test_ecapa_tdnn_embedding_dimension_and_l2_norm():
    """Verify ECAPA-TDNN produces 192-d embedding with exact unit L2 norm."""
    path = resolve_model_path(ai_settings.SPEAKER_MODEL_PATH)
    service = PretrainedSpeakerEmbeddingService(model_path=path)
    audio = _generate_synthetic_pcm(duration_sec=2.0)

    result = await service.extract_embedding(audio, sample_rate=16000)
    assert result.dimension == 192
    assert len(result.embedding) == 192
    norm = np.linalg.norm(result.embedding)
    assert pytest.approx(norm, abs=1e-3) == 1.0


@pytest.mark.asyncio
async def test_ecapa_tdnn_cosine_similarity():
    """Verify cosine similarity of identical audio is ~1.0, and distinct audio is in [-1, 1]."""
    path = resolve_model_path(ai_settings.SPEAKER_MODEL_PATH)
    service = PretrainedSpeakerEmbeddingService(model_path=path)
    audio_a = _generate_synthetic_pcm(duration_sec=2.0, freq=220.0)
    audio_b = _generate_synthetic_pcm(duration_sec=2.0, freq=880.0)

    res_a1 = await service.extract_embedding(audio_a, sample_rate=16000)
    res_a2 = await service.extract_embedding(audio_a, sample_rate=16000)
    res_b = await service.extract_embedding(audio_b, sample_rate=16000)

    v_a1 = np.array(res_a1.embedding)
    v_a2 = np.array(res_a2.embedding)
    v_b = np.array(res_b.embedding)

    sim_identical = float(np.dot(v_a1, v_a2))
    sim_distinct = float(np.dot(v_a1, v_b))

    assert pytest.approx(sim_identical, abs=1e-4) == 1.0
    assert -1.0 <= sim_distinct <= 1.0


def test_detector_fallback_on_missing_weights():
    """Verify LocalDeepfakeDetector falls back honestly to LOCAL_DSP_ANALYZER if weights are missing."""
    detector = LocalDeepfakeDetector(
        model_path="backend/models/weights/nonexistent/missing.onnx",
        fallback_mode="dsp",
    )
    assert detector.engine_type == ENGINE_LOCAL_DSP
    assert detector.available is True
    assert detector.metadata.provenance == ENGINE_LOCAL_DSP
    assert detector.metadata.weights_installed is False


def test_speaker_fallback_on_missing_weights():
    """Verify LocalSpeakerEmbeddingService falls back honestly to LOCAL_DSP_ANALYZER if weights are missing."""
    service = LocalSpeakerEmbeddingService(
        model_path="backend/models/weights/nonexistent/missing.onnx",
        fallback_mode="dsp",
    )
    assert service.engine_type == ENGINE_LOCAL_DSP
    assert service.available is True
    assert service.metadata.provenance == ENGINE_LOCAL_DSP
    assert service.metadata.weights_installed is False


def test_provenance_taxonomy_accuracy():
    """Verify ModelMetadata.to_dict formats provenance, engine, and weights safely."""
    # Real pretrained record
    real_meta = ModelMetadata(
        model_name="AASIST-L-AntiSpoof-ONNX",
        engine_type=ENGINE_REAL_PRETRAINED,
        framework="onnxruntime",
        model_path=resolve_model_path(ai_settings.DEEPFAKE_MODEL_PATH),
    )
    d_real = real_meta.to_dict()
    assert d_real["provenance"] == ENGINE_REAL_PRETRAINED
    assert d_real["weights_installed"] is True
    assert d_real["weights_loaded"] is True
    assert d_real["model_path"] == "[RESTRICTED_SERVER_PATH]"  # Security invariant

    # DSP analyzer record
    dsp_meta = ModelMetadata(
        model_name="Acoustic-DSP-Heuristic",
        engine_type=ENGINE_LOCAL_DSP,
        framework="dsp_numpy",
    )
    d_dsp = dsp_meta.to_dict()
    assert d_dsp["provenance"] == ENGINE_LOCAL_DSP
    assert d_dsp["weights_installed"] is False

    # Mock demo record
    mock_meta = ModelMetadata(
        model_name="Simulated-Deepfake-Mock",
        engine_type=ENGINE_MOCK_DEMO,
        framework="mock",
    )
    d_mock = mock_meta.to_dict()
    assert d_mock["provenance"] == ENGINE_MOCK_DEMO
    assert d_mock["weights_installed"] is False


def test_liveness_detector_truthful_dsp():
    """Verify LocalLivenessDetector honestly declares LOCAL_DSP_ANALYZER without pretending to be a real model."""
    liveness = LocalLivenessDetector()
    assert liveness.engine_type == ENGINE_LOCAL_DSP
    assert liveness.available is True
    meta = model_registry.get("liveness_detector")
    assert meta is not None
    assert meta.provenance == ENGINE_LOCAL_DSP
    assert meta.weights_installed is False
    assert "Pretrained liveness model unavailable" in meta.description
