"""VoxShield AI — Threat Engine & Threat History Test Suite."""

import pytest
from httpx import AsyncClient
from app.ai.threat_engine import threat_engine
from app.services.threat_service import ThreatService

def test_threat_engine_benign_assessment():
    assessment = threat_engine.evaluate(
        ai_probability=0.04,
        speaker_match_score=0.92,
        liveness_score=0.88,
        is_claimed_trusted_contact=False,
    )
    assert assessment.threat_score <= 25.0
    assert assessment.severity == "LOW"
    assert "NORMAL" in assessment.recommendation


def test_threat_engine_critical_clone_attack():
    assessment = threat_engine.evaluate(
        ai_probability=0.95,
        speaker_match_score=0.40,
        liveness_score=0.35,
        is_claimed_trusted_contact=True,
        anomaly_flags=["vocoder_phase_discontinuity"],
    )
    assert assessment.threat_score >= 85.0
    assert assessment.severity == "CRITICAL"
    assert "CRITICAL THREAT" in assessment.recommendation
    assert any("trusted contact" in ind.lower() for ind in assessment.indicators)


@pytest.mark.asyncio
async def test_threat_history_apis(
    client: AsyncClient,
    test_user_alice,
    auth_headers_alice,
    db_session,
):
    # Record test threats directly via service
    await ThreatService.record_event(
        db_session,
        user_id=test_user_alice.id,
        event_type="AI_VOICE_DETECTED",
        severity="HIGH",
        threat_score=82.0,
        ai_probability=0.89,
        speaker_match_score=0.55,
        liveness_score=0.45,
    )
    await ThreatService.record_event(
        db_session,
        user_id=test_user_alice.id,
        event_type="CALL_VERIFIED",
        severity="LOW",
        threat_score=12.0,
        ai_probability=0.05,
        speaker_match_score=0.95,
        liveness_score=0.90,
    )

    # 1. List threats
    list_resp = await client.get("/api/v1/threats", headers=auth_headers_alice)
    assert list_resp.status_code == 200
    threats = list_resp.json()["data"]
    assert len(threats) >= 2

    # 2. Filter by severity
    filter_resp = await client.get("/api/v1/threats?severity=HIGH", headers=auth_headers_alice)
    assert filter_resp.status_code == 200
    filtered = filter_resp.json()["data"]
    assert all(t["severity"] == "HIGH" for t in filtered)

    # 3. Summary metrics
    summary_resp = await client.get("/api/v1/threats/summary", headers=auth_headers_alice)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()["data"]
    assert summary["total_events"] >= 2
    assert summary["high_count"] >= 1
    assert summary["low_count"] >= 1

    # 4. Timeline
    timeline_resp = await client.get("/api/v1/threats/timeline?days=7", headers=auth_headers_alice)
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()["data"]["timeline"]
    assert len(timeline) == 7
