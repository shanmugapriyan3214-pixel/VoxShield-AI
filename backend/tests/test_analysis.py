"""VoxShield AI — Audio Analysis & Voice Comparison Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_audio_file_upload_analysis(client: AsyncClient, test_user_alice, auth_headers_alice):
    # Simulate a minimal WAV header and audio frames
    fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("test_sample.wav", fake_wav, "audio/wav")}

    response = await client.post("/api/v1/analysis/audio", files=files, headers=auth_headers_alice)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "analysis_id" in data
    assert data["status"] == "COMPLETED"
    assert data["classification"] in ("LIKELY_HUMAN", "LIKELY_AI_GENERATED", "HUMAN", "AI_GENERATED", "SUSPICIOUS", "UNKNOWN", "UNCERTAIN")
    assert 0.0 <= data["ai_probability"] <= 1.0
    assert 0.0 <= data["human_probability"] <= 1.0
    assert data["is_mock"] in (True, False)
    assert "PRIVACY NOTICE" in data["warning"]

    analysis_id = data["analysis_id"]

    # Fetch analysis by ID
    get_resp = await client.get(f"/api/v1/analysis/{analysis_id}", headers=auth_headers_alice)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["analysis_id"] == analysis_id


async def test_unsupported_audio_format_rejected(client: AsyncClient, test_user_alice, auth_headers_alice):
    files = {"file": ("malicious.exe", b"\x4d\x5a\x90", "application/octet-stream")}
    response = await client.post("/api/v1/analysis/audio", files=files, headers=auth_headers_alice)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_FAILED"


async def test_voice_comparison_endpoint(client: AsyncClient, test_user_alice, auth_headers_alice):
    # Two synthetic 192-d vectors
    vec_a = [0.1] * 192
    vec_b = [0.1] * 192

    payload = {
        "reference_embedding": vec_a,
        "suspect_embedding": vec_b,
    }
    response = await client.post("/api/v1/analysis/compare", json=payload, headers=auth_headers_alice)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "speaker_match_score" in data
    assert data["speaker_match_score"] >= 0.95  # Identical vectors should have near 1.0 similarity
    assert data["is_match"] is True
    assert data["is_mock"] in (True, False)
