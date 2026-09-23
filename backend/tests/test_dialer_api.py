"""VoxShield AI — Secure Dialer API & Attack Pattern Verification Test Suite."""

import pytest
from httpx import AsyncClient

from app.ai.fusion.threat_fusion import threat_fusion_engine

pytestmark = pytest.mark.asyncio


async def test_user_voxshield_id_generation(
    client: AsyncClient,
    auth_headers_alice,
):
    # 1. Fetch profile and verify voxshield_id exists and matches VS-XXXXXXXX
    resp = await client.get("/api/v1/users/me", headers=auth_headers_alice)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "voxshield_id" in data
    assert data["voxshield_id"] is not None
    assert data["voxshield_id"].startswith("VS-")
    assert len(data["voxshield_id"]) >= 6


async def test_user_lookup_by_username_and_voxshield_id(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
):
    # 1. Lookup Bob by username
    resp = await client.get(f"/api/v1/users/lookup?q={test_user_bob.username}", headers=auth_headers_alice)
    assert resp.status_code == 200
    results = resp.json()["data"]
    assert len(results) >= 1
    found_bob = any(u["id"] == test_user_bob.id for u in results)
    assert found_bob is True

    # 2. Lookup Bob by safe voxshield_id
    bob_vs_id = test_user_bob.safe_voxshield_id
    resp_vs = await client.get(f"/api/v1/users/lookup?q={bob_vs_id}", headers=auth_headers_alice)
    assert resp_vs.status_code == 200
    results_vs = resp_vs.json()["data"]
    assert len(results_vs) >= 1
    assert results_vs[0]["id"] == test_user_bob.id


async def test_initiate_call_using_voxshield_id(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    # Alice dials Bob using Bob's VoxShield ID instead of raw UUID
    bob_vs_id = test_user_bob.safe_voxshield_id
    call_resp = await client.post(
        "/api/v1/calls",
        json={"receiver_id": bob_vs_id},
        headers=auth_headers_alice,
    )
    assert call_resp.status_code == 201
    call_data = call_resp.json()["data"]
    assert call_data["caller_id"] == test_user_alice.id
    assert call_data["receiver_id"] == test_user_bob.id
    assert call_data["status"] == "RINGING"
    assert call_data["caller_name"] is not None
    assert call_data["receiver_name"] is not None

    # Callee accepts
    accept_resp = await client.post(
        f"/api/v1/calls/{call_data['id']}/accept",
        headers=auth_headers_bob,
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == "ACCEPTED"

    # Query dedicated call security endpoint
    sec_resp = await client.get(
        f"/api/v1/calls/{call_data['id']}/security",
        headers=auth_headers_alice,
    )
    assert sec_resp.status_code == 200
    sec_data = sec_resp.json()["data"]
    assert sec_data["call_id"] == call_data["id"]
    assert sec_data["encryption"] == "DTLS-SRTP-AES-GCM-128"

    # Callee ends call
    end_resp = await client.post(
        f"/api/v1/calls/{call_data['id']}/end",
        headers=auth_headers_bob,
    )
    assert end_resp.status_code == 200
    assert end_resp.json()["data"]["status"] == "ENDED"


async def test_contacts_api_first_router(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
):
    # Test /api/v1/contacts endpoint
    create_resp = await client.post(
        "/api/v1/contacts",
        json={
            "trusted_user_id": test_user_bob.id,
            "display_name": "Bob Emergency Contact",
            "relationship": "Colleague",
        },
        headers=auth_headers_alice,
    )
    assert create_resp.status_code == 201
    contact = create_resp.json()["data"]
    assert contact["display_name"] == "Bob Emergency Contact"

    # List contacts
    list_resp = await client.get("/api/v1/contacts", headers=auth_headers_alice)
    assert list_resp.status_code == 200
    contacts = list_resp.json()["data"]
    assert len(contacts) >= 1

    # Cleanup
    del_resp = await client.delete(f"/api/v1/contacts/{contact['id']}", headers=auth_headers_alice)
    assert del_resp.status_code == 200


async def test_threat_fusion_attack_patterns():
    # Evaluate with urgent money request and secrecy demand
    assessment = threat_fusion_engine.evaluate(
        ai_probability=0.25,
        speaker_match_score=0.75,
        liveness_score=0.80,
        anomaly_flags=["urgent_money_request", "secrecy_demand"],
    )
    assert assessment.social_engineering_risk is True
    assert "Potential social-engineering risk detected" in assessment.recommendation
    assert any("urgent financial transfer" in ind.lower() for ind in assessment.indicators)
