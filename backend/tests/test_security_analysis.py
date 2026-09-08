"""VoxShield AI — Live Security Analysis & Telemetry API Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_ai_status_endpoint(client: AsyncClient):
    resp = await client.get("/api/v1/ai/status")
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["status"] == "OPERATIONAL"
    assert "mode" in data
    assert "device" in data
    assert "streaming_window" in data
    assert data["streaming_window"]["window_duration_sec"] == 1.5
    assert "components" in data

    components = data["components"]
    assert "deepfake_detector" in components
    assert "speaker_embedding" in components
    assert "speaker_comparison" in components
    assert "liveness_detector" in components
    assert "threat_fusion" in components

    # Privacy verification: Ensure no server filepaths or model weights are exposed
    privacy = data["privacy_policy"]
    assert "zero_server_audio" in privacy
    assert "biometric_protection" in privacy

    resp_text = resp.text
    assert "weights" not in resp_text.lower()
    assert ".onnx" not in resp_text
    assert ".pt" not in resp_text


async def test_call_security_analysis_telemetry_flow(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    # 1. Initiate call Alice -> Bob
    init_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_bob.id},
        headers=auth_headers_alice,
    )
    assert init_resp.status_code == 201
    call_id = init_resp.json()["data"]["id"]

    # Bob accepts call
    accept_resp = await client.post(f"/api/v1/calls/{call_id}/accept", headers=auth_headers_bob)
    assert accept_resp.status_code == 200

    # 2. Alice sends benign real-time telemetry
    benign_telemetry = {
        "ai_generated_probability": 0.04,
        "speaker_match_probability": 0.95,
        "liveness_probability": 0.90,
        "window_duration_ms": 1500,
        "window_index": 1,
        "detected_artifacts": [],
    }
    telemetry_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-analysis",
        json=benign_telemetry,
        headers=auth_headers_alice,
    )
    assert telemetry_resp.status_code == 200
    telemetry_data = telemetry_resp.json()["data"]
    assert telemetry_data["threat_score"] <= 24.9
    assert telemetry_data["severity"] == "LOW"
    assert telemetry_data["recommended_action"] == "CONTINUE_NORMAL"
    assert telemetry_data["call_terminated"] is False

    # 3. Alice sends high synthetic threat telemetry (Voice Clone Attack)
    critical_telemetry = {
        "ai_generated_probability": 0.96,
        "speaker_match_probability": 0.28,
        "liveness_probability": 0.20,
        "window_duration_ms": 1500,
        "window_index": 2,
        "detected_artifacts": ["vocoder_phase_discontinuity", "unnatural_spectral_flatness"],
    }
    crit_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-analysis",
        json=critical_telemetry,
        headers=auth_headers_alice,
    )
    assert crit_resp.status_code == 200
    crit_data = crit_resp.json()["data"]
    assert crit_data["threat_score"] >= 75.0
    assert crit_data["severity"] == "CRITICAL"
    assert crit_data["recommended_action"] == "RECOMMEND_TERMINATION"
    assert crit_data["event_id"] is not None

    # Check security events list for this call
    events_resp = await client.get(f"/api/v1/calls/{call_id}/security-events", headers=auth_headers_alice)
    assert events_resp.status_code == 200
    events = events_resp.json()["data"]
    assert len(events) >= 1
    assert any(e["severity"] == "CRITICAL" for e in events)


async def test_security_analysis_authorization_and_validation(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    test_user_charlie,
    auth_headers_alice,
    auth_headers_bob,
    auth_headers_charlie,
):
    # Initiate call Alice -> Bob
    init_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_bob.id},
        headers=auth_headers_alice,
    )
    call_id = init_resp.json()["data"]["id"]

    # Charlie (eavesdropper/non-participant) tries to post telemetry -> 403 Forbidden
    unauth_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-analysis",
        json={"ai_generated_probability": 0.50},
        headers=auth_headers_charlie,
    )
    assert unauth_resp.status_code == 403

    # Invalid probability bounds (> 1.0) -> 422 Unprocessable
    invalid_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-analysis",
        json={"ai_generated_probability": 1.50},
        headers=auth_headers_alice,
    )
    assert invalid_resp.status_code == 422


async def test_challenge_response_workflow(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    # 1. Initiate and accept call
    init_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_bob.id},
        headers=auth_headers_alice,
    )
    call_id = init_resp.json()["data"]["id"]
    await client.post(f"/api/v1/calls/{call_id}/accept", headers=auth_headers_bob)

    # 2. Bob issues a challenge to Alice
    issue_resp = await client.post(
        f"/api/v1/calls/{call_id}/challenge",
        json={"timeout_seconds": 60},
        headers=auth_headers_bob,
    )
    assert issue_resp.status_code == 201
    challenge_data = issue_resp.json()["data"]
    assert "challenge_id" in challenge_data
    assert "passphrase" in challenge_data
    assert challenge_data["status"] == "PENDING"
    challenge_id = challenge_data["challenge_id"]
    passphrase = challenge_data["passphrase"]

    # 3. Query active challenge
    get_challenge_resp = await client.get(
        f"/api/v1/calls/{call_id}/challenge",
        headers=auth_headers_alice,
    )
    assert get_challenge_resp.status_code == 200
    active = get_challenge_resp.json()["data"]
    assert active["challenge_id"] == challenge_id

    # 4. Try incorrect phrase first
    fail_verify = await client.post(
        f"/api/v1/calls/{call_id}/challenge/verify",
        json={
            "challenge_id": challenge_id,
            "spoken_phrase": "Totally Wrong Words",
        },
        headers=auth_headers_alice,
    )
    assert fail_verify.status_code == 200
    fail_data = fail_verify.json()["data"]
    assert fail_data["verified"] is False

    # 5. Alice speaks the correct challenge phrase
    pass_verify = await client.post(
        f"/api/v1/calls/{call_id}/challenge/verify",
        json={
            "challenge_id": challenge_id,
            "spoken_phrase": passphrase,
            "liveness_score": 0.85,
        },
        headers=auth_headers_alice,
    )
    assert pass_verify.status_code == 200
    pass_data = pass_verify.json()["data"]
    assert pass_data["verified"] is True
    assert pass_data["status"] == "PASSED"
    assert pass_data["threat_score_impact"] < 0  # Threat mitigation bonus

    # 6. Subsequent telemetry reflects mitigation bonus
    telemetry_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-analysis",
        json={
            "ai_generated_probability": 0.30,
            "speaker_match_probability": 0.70,
            "liveness_probability": 0.75,
        },
        headers=auth_headers_alice,
    )
    assert telemetry_resp.status_code == 200
    t_data = telemetry_resp.json()["data"]
    assert any("challenge passed" in ind.lower() for ind in t_data["indicators"])


async def test_offline_analysis_demo_scenarios(
    client: AsyncClient,
    test_user_alice,
    auth_headers_alice,
):
    fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    # 1. Demo Scenario: voice_clone
    resp_clone = await client.post(
        "/api/v1/analysis/audio?demo_scenario=voice_clone",
        files={"file": ("sample.wav", fake_wav, "audio/wav")},
        headers=auth_headers_alice,
    )
    assert resp_clone.status_code == 200
    data_clone = resp_clone.json()["data"]
    assert data_clone["classification"] == "LIKELY_AI_GENERATED"
    assert data_clone["ai_probability"] >= 0.90

    # 2. Demo Scenario: normal
    resp_norm = await client.post(
        "/api/v1/analysis/audio?demo_scenario=normal",
        files={"file": ("sample.wav", fake_wav, "audio/wav")},
        headers=auth_headers_alice,
    )
    assert resp_norm.status_code == 200
    data_norm = resp_norm.json()["data"]
    assert data_norm["classification"] == "LIKELY_HUMAN"
    assert data_norm["ai_probability"] <= 0.10
