"""VoxShield AI — Incident Reporting & Blockchain Proof Test Suite."""

import pytest
from httpx import AsyncClient
from app.services.incident_service import IncidentService

pytestmark = pytest.mark.asyncio


async def test_create_incident_generates_canonical_hash(
    client: AsyncClient,
    test_user_alice,
    auth_headers_alice,
):
    payload = {
        "incident_type": "VOICE_CLONING_ATTEMPT",
        "severity": "CRITICAL",
        "threat_score": 94.5,
        "ai_probability": 0.96,
        "speaker_match_score": 0.38,
        "liveness_score": 0.25,
        "summary": "Suspected CEO impersonation voice clone detected during emergency fund transfer request.",
        "indicators": [
            "High synthetic vocoder probability (96%)",
            "Speaker mismatch against registered executive profile",
        ],
        "recommendations": [
            "Do not disburse funds",
            "Verify identity via in-person or corporate directory",
        ],
    }
    response = await client.post("/api/v1/incidents", json=payload, headers=auth_headers_alice)
    assert response.status_code == 201
    incident = response.json()["data"]

    assert incident["incident_number"].startswith("VOX-")
    assert incident["severity"] == "CRITICAL"
    assert incident["threat_score"] == 94.5
    # Ensure canonical hash was generated
    assert incident["canonical_hash"] is not None
    assert incident["canonical_hash"].startswith("0x")
    assert len(incident["canonical_hash"]) == 66  # 0x + 64 hex chars


async def test_blockchain_anchor_and_verification(
    client: AsyncClient,
    test_user_alice,
    auth_headers_alice,
    db_session,
):
    # 1. Create incident
    create_resp = await client.post(
        "/api/v1/incidents",
        json={
            "incident_type": "IMPERSONATION",
            "severity": "HIGH",
            "threat_score": 78.0,
            "ai_probability": 0.82,
            "summary": "Incoming call impersonating family member.",
        },
        headers=auth_headers_alice,
    )
    incident_id = create_resp.json()["data"]["id"]

    # 2. Verify prior to anchoring -> status: UNANCHORED
    pre_anchor = await client.get(f"/api/v1/incidents/{incident_id}/verification", headers=auth_headers_alice)
    assert pre_anchor.status_code == 200
    assert pre_anchor.json()["data"]["verification_status"] == "UNANCHORED"

    # 3. Anchor to blockchain (Mock/EVM)
    anchor_resp = await client.post(f"/api/v1/incidents/{incident_id}/anchor", headers=auth_headers_alice)
    assert anchor_resp.status_code == 200
    receipt = anchor_resp.json()["data"]
    assert receipt["status"] == "CONFIRMED"
    assert receipt["transaction_hash"].startswith("0x")
    assert receipt["block_number"] > 0

    # 4. Verify post-anchoring -> status: VERIFIED
    verify_resp = await client.get(f"/api/v1/incidents/{incident_id}/verification", headers=auth_headers_alice)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()["data"]
    assert v_data["verification_status"] == "VERIFIED"
    assert v_data["is_valid"] is True
    assert v_data["current_recomputed_hash"] == v_data["stored_canonical_hash"]


async def test_blockchain_tamper_detection(
    client: AsyncClient,
    test_user_alice,
    auth_headers_alice,
    db_session,
):
    # 1. Create and anchor incident
    create_resp = await client.post(
        "/api/v1/incidents",
        json={
            "incident_type": "SUSPICIOUS_VOICE",
            "severity": "MEDIUM",
            "threat_score": 50.0,
            "ai_probability": 0.52,
            "summary": "Original pristine summary.",
        },
        headers=auth_headers_alice,
    )
    incident_id = create_resp.json()["data"]["id"]
    await client.post(f"/api/v1/incidents/{incident_id}/anchor", headers=auth_headers_alice)

    # 2. Maliciously tamper with the database record post-anchoring
    incident = await IncidentService.get_incident(db_session, incident_id)
    incident.summary = "TAMPERED: Malicious actor altered evidence to cover up attack!"
    await db_session.commit()

    # 3. Run verification -> MUST DETECT TAMPERING!
    verify_resp = await client.get(f"/api/v1/incidents/{incident_id}/verification", headers=auth_headers_alice)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()["data"]
    assert v_data["verification_status"] == "TAMPERED"
    assert v_data["is_valid"] is False
    assert v_data["current_recomputed_hash"] != v_data["stored_canonical_hash"]
