"""VoxShield AI — Call Lifecycle & Telemetry Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_call_lifecycle_full_flow(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    # 1. Alice initiates call to Bob
    init_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_bob.id},
        headers=auth_headers_alice,
    )
    assert init_resp.status_code == 201
    call = init_resp.json()["data"]
    call_id = call["id"]
    assert call["caller_id"] == test_user_alice.id
    assert call["receiver_id"] == test_user_bob.id
    assert call["status"] == "RINGING"

    # 2. Bob accepts the call
    accept_resp = await client.post(
        f"/api/v1/calls/{call_id}/accept",
        headers=auth_headers_bob,
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == "ACCEPTED"
    assert accept_resp.json()["data"]["started_at"] is not None

    # 3. Ingest real-time security event during the call
    sec_payload = {
        "event_type": "AI_VOICE_DETECTED",
        "severity": "CRITICAL",
        "threat_score": 91.0,
        "ai_probability": 0.94,
        "speaker_match_score": 0.42,
        "liveness_score": 0.35,
        "metadata": {"cue": "neural_vocoder_glitch"},
    }
    sec_resp = await client.post(
        f"/api/v1/calls/{call_id}/security-events",
        json=sec_payload,
        headers=auth_headers_alice,
    )
    assert sec_resp.status_code == 201
    sec_data = sec_resp.json()["data"]
    assert sec_data["event_type"] == "AI_VOICE_DETECTED"
    assert sec_data["threat_score"] == 91.0

    # 4. List security events for this call
    list_sec = await client.get(
        f"/api/v1/calls/{call_id}/security-events",
        headers=auth_headers_alice,
    )
    assert list_sec.status_code == 200
    assert len(list_sec.json()["data"]) >= 1

    # 5. Alice ends the call
    end_resp = await client.post(
        f"/api/v1/calls/{call_id}/end",
        headers=auth_headers_alice,
    )
    assert end_resp.status_code == 200
    assert end_resp.json()["data"]["status"] == "ENDED"
    assert end_resp.json()["data"]["ended_at"] is not None


async def test_callee_rejects_call(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    init_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_bob.id},
        headers=auth_headers_alice,
    )
    call_id = init_resp.json()["data"]["id"]

    # Bob rejects
    reject_resp = await client.post(
        f"/api/v1/calls/{call_id}/reject",
        headers=auth_headers_bob,
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["data"]["status"] == "REJECTED"


async def test_cannot_call_self(client: AsyncClient, test_user_alice, auth_headers_alice):
    response = await client.post(
        "/api/v1/calls",
        json={"receiver_id": test_user_alice.id},
        headers=auth_headers_alice,
    )
    assert response.status_code == 422
