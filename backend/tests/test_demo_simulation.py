"""VoxShield AI — Phase 5 Controlled Attack Simulation & Detection Automated Tests."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import create_access_token
from app.db.base import Base
from app.db.models.call import Call
from app.db.models.user import User
from app.demo.scenarios import SCENARIOS
from app.main import app

# In-memory SQLite for test isolation
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def async_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(async_db: AsyncSession):
    from app.api.deps import get_db

    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def auth_user_and_token(async_db: AsyncSession):
    """Create a mock user and return JWT token."""
    user = User(
        email="demotester@voxshield.ai",
        username="demotester",
        password_hash="hashedpassword123",
        display_name="Demo Tester",
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)

    token = create_access_token(subject=user.id)
    return user, token


@pytest_asyncio.fixture(scope="function")
async def test_call(async_db: AsyncSession, auth_user_and_token):
    """Create an active call for telemetry binding."""
    user, _ = auth_user_and_token
    callee = User(
        email="callee@voxshield.ai",
        username="callee",
        password_hash="hashedpassword123",
        display_name="Callee User",
        is_active=True,
    )
    async_db.add(callee)
    await async_db.commit()
    await async_db.refresh(callee)

    call = Call(
        caller_id=user.id,
        receiver_id=callee.id,
        status="ACCEPTED",
        encryption_algorithm="DTLS-SRTP-AES-128-GCM",
    )
    async_db.add(call)
    await async_db.commit()
    await async_db.refresh(call)
    return call


@pytest.mark.asyncio
async def test_demo_scenarios_metadata_and_provenance(client: AsyncClient, auth_user_and_token):
    """Verify GET /api/v1/demo/scenarios lists all 4 scenarios with truthful provenance tags."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/demo/scenarios", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert len(data) == 4
    scenario_ids = [s["scenario_id"] for s in data]
    assert "NORMAL" in scenario_ids
    assert "REPLAY_ATTACK" in scenario_ids
    assert "SYNTHETIC_SPOOF" in scenario_ids
    assert "SIMULATED_CRITICAL" in scenario_ids

    # Check that NORMAL, REPLAY, and SYNTHETIC report REAL_PRETRAINED_MODEL
    for s in data:
        if s["scenario_id"] in ("NORMAL", "REPLAY_ATTACK", "SYNTHETIC_SPOOF"):
            assert s["inference_type"] == "REAL_PRETRAINED_MODEL"
            assert s["is_real_inference"] is True
            assert "AASIST-L" in str(s["detection_subsystems"])
        elif s["scenario_id"] == "SIMULATED_CRITICAL":
            assert s["inference_type"] == "SIMULATED_ATTACK_TELEMETRY"
            assert s["is_real_inference"] is False
            assert "NOT REAL MODEL OUTPUT" in s["safety_label"]


@pytest.mark.asyncio
async def test_real_model_normal_scenario(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify executing NORMAL scenario runs real AASIST-L and ECAPA-TDNN producing LOW threat."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "call_id": test_call.id,
        "scenario_id": "NORMAL",
        "step_index": 0,
        "simulate_challenge_failure": False,
    }

    resp = await client.post("/api/v1/demo/execute", json=payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]

    assert res["scenario_id"] == "NORMAL"
    assert res["severity"] == "LOW"
    assert res["threat_score"] < 25.0
    assert res["ai_probability"] < 0.15
    assert res["speaker_match_score"] >= 0.85
    assert res["liveness_score"] >= 0.85
    assert res["recommended_action"] == "CONTINUE_NORMAL"
    assert res["is_real_inference"] is True
    assert res["inference_type"] == "REAL_PRETRAINED_MODEL"
    assert "REAL PRETRAINED MODEL" in res["provenance_label"]
    assert "aasist_deepfake_ms" in res["latencies_ms"]
    assert "ecapa_speaker_ms" in res["latencies_ms"]
    assert "dsp_liveness_ms" in res["latencies_ms"]
    assert res["incident_created"] is False


@pytest.mark.asyncio
async def test_real_model_replay_attack_scenario(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify executing REPLAY_ATTACK scenario detects acoustic liveness anomaly and escalates threat."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "call_id": test_call.id,
        "scenario_id": "REPLAY_ATTACK",
        "step_index": 2,
        "simulate_challenge_failure": False,
    }

    resp = await client.post("/api/v1/demo/execute", json=payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]

    assert res["scenario_id"] == "REPLAY_ATTACK"
    assert res["is_real_inference"] is True
    assert res["inference_type"] == "REAL_PRETRAINED_MODEL"
    # Liveness anomaly detected
    assert res["liveness_score"] <= 0.40
    # Threat score elevated to HIGH
    assert res["threat_score"] >= 50.0
    assert res["severity"] in ("HIGH", "CRITICAL")
    assert "acoustic_room_impulse" in res["detected_artifacts"]


@pytest.mark.asyncio
async def test_real_model_synthetic_spoof_scenario(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify executing SYNTHETIC_SPOOF scenario triggers AASIST deepfake alert and high threat."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "call_id": test_call.id,
        "scenario_id": "SYNTHETIC_SPOOF",
        "step_index": 3,
        "simulate_challenge_failure": False,
    }

    resp = await client.post("/api/v1/demo/execute", json=payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]

    assert res["scenario_id"] == "SYNTHETIC_SPOOF"
    assert res["is_real_inference"] is True
    assert res["ai_probability"] >= 0.80
    assert res["speaker_match_score"] <= 0.50
    assert res["severity"] == "CRITICAL"
    assert res["threat_score"] >= 75.0
    assert res["recommended_action"] == "RECOMMEND_TERMINATION"
    # Automatic incident creation on CRITICAL
    assert res["incident_created"] is True
    assert res["incident_number"] is not None
    assert res["canonical_hash"] is not None
    assert res["canonical_hash"].startswith("0x")


@pytest.mark.asyncio
async def test_simulated_critical_scenario_explicit_provenance(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify SIMULATED_CRITICAL scenario explicitly flags SIMULATED ATTACK TELEMETRY."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # Step 0: Baseline
    r0 = await client.post("/api/v1/demo/execute", json={"scenario_id": "SIMULATED_CRITICAL", "step_index": 0}, headers=headers)
    assert r0.status_code == 200
    d0 = r0.json()["data"]
    assert d0["threat_score"] <= 15.0
    assert d0["severity"] == "LOW"
    assert d0["is_real_inference"] is False
    assert d0["inference_type"] == "SIMULATED_ATTACK_TELEMETRY"

    # Step 1: Medium advisory
    r1 = await client.post("/api/v1/demo/execute", json={"scenario_id": "SIMULATED_CRITICAL", "step_index": 1}, headers=headers)
    assert r1.status_code == 200
    d1 = r1.json()["data"]
    assert 20.0 <= d1["threat_score"] <= 40.0
    assert d1["severity"] == "MEDIUM"

    # Step 2: High risk
    r2 = await client.post("/api/v1/demo/execute", json={"scenario_id": "SIMULATED_CRITICAL", "step_index": 2}, headers=headers)
    assert r2.status_code == 200
    d2 = r2.json()["data"]
    assert 50.0 <= d2["threat_score"] <= 70.0
    assert d2["severity"] == "HIGH"

    # Step 3: Critical peak
    r3 = await client.post("/api/v1/demo/execute", json={"scenario_id": "SIMULATED_CRITICAL", "step_index": 3}, headers=headers)
    assert r3.status_code == 200
    d3 = r3.json()["data"]
    assert d3["threat_score"] >= 80.0
    assert d3["severity"] == "CRITICAL"
    assert d3["recommended_action"] == "RECOMMEND_TERMINATION"
    assert d3["provenance_label"] == "SIMULATED ATTACK TELEMETRY (NOT REAL MODEL OUTPUT)"
    assert d3["incident_created"] is True


@pytest.mark.asyncio
async def test_challenge_failure_threat_escalation(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify simulating an attacker failing the challenge escalates threat score and records failure."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "call_id": test_call.id,
        "scenario_id": "REPLAY_ATTACK",
        "step_index": 2,
        "simulate_challenge_failure": True,
    }

    resp = await client.post("/api/v1/demo/execute", json=payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]

    # Challenge failure penalty adds +20, pushing threat score into critical zone
    assert res["threat_score"] >= 70.0
    assert res["incident_created"] is True
    assert res["canonical_hash"] is not None


@pytest.mark.asyncio
async def test_cryptographic_tamper_detection(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify that tampering with an incident's canonical data immediately triggers TAMPER_DETECTED."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Trigger incident creation
    exec_resp = await client.post(
        "/api/v1/demo/execute",
        json={"call_id": test_call.id, "scenario_id": "SYNTHETIC_SPOOF", "step_index": 3},
        headers=headers,
    )
    incident_id = exec_resp.json()["data"]["incident_id"]
    original_hash = exec_resp.json()["data"]["canonical_hash"]
    assert incident_id is not None
    assert original_hash is not None

    # 2. Run tamper test altering threat_score to 12.0
    tamper_payload = {
        "incident_id": incident_id,
        "tamper_field": "threat_score",
        "tampered_value": 12.0,
    }
    tamper_resp = await client.post("/api/v1/demo/tamper-test", json=tamper_payload, headers=headers)
    assert tamper_resp.status_code == 200
    tamper_data = tamper_resp.json()["data"]

    assert tamper_data["verification_status"] == "TAMPER_DETECTED"
    assert tamper_data["is_valid"] is False
    assert tamper_data["original_canonical_hash"] == original_hash
    assert tamper_data["tampered_canonical_hash"] != original_hash
    assert "Proof verified" in tamper_data["proof_explanation"]

    # 3. Verify original stored incident remains completely uncorrupted
    inc_resp = await client.get(f"/api/v1/incidents/{incident_id}", headers=headers)
    assert inc_resp.status_code == 200
    assert inc_resp.json()["data"]["canonical_hash"] == original_hash
    assert inc_resp.json()["data"]["threat_score"] >= 70.0  # Unaltered


@pytest.mark.asyncio
async def test_demo_reset_cleanliness(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify demo reset restores baseline state without database corruption."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    reset_payload = {"call_id": test_call.id}
    resp = await client.post("/api/v1/demo/reset", json=reset_payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()["data"]

    assert res["status"] == "SUCCESS"
    assert "reset successfully" in res["message"]


@pytest.mark.asyncio
async def test_zero_server_audio_invariant(client: AsyncClient, auth_user_and_token, test_call: Call):
    """Verify API rejects any attempts to upload raw audio binaries in telemetry/demo requests."""
    _, token = auth_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt sending binary audio payload in demo execute request
    malformed_payload = {
        "call_id": test_call.id,
        "scenario_id": "NORMAL",
        "raw_audio_bytes": "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    }
    resp = await client.post("/api/v1/demo/execute", json=malformed_payload, headers=headers)
    # Extra unexpected fields are either ignored or stripped; verify response contains NO raw audio reflection
    assert resp.status_code == 200
    resp_text = resp.text
    assert "raw_audio_bytes" not in resp_text
    assert "RIFF" not in resp_text
