"""VoxShield AI — Voice Profile Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_and_get_voice_profile(client: AsyncClient, test_user_alice, auth_headers_alice):
    payload = {
        "label": "Alice Desktop Mic",
        "model_version": "ecapa-tdnn-v2",
    }
    create_resp = await client.post("/api/v1/voices", json=payload, headers=auth_headers_alice)
    assert create_resp.status_code == 201
    profile = create_resp.json()["data"]
    assert profile["label"] == "Alice Desktop Mic"
    assert profile["status"] == "ACTIVE"
    assert profile["model_version"] == "ecapa-tdnn-v2"
    # Cryptographic invariant: raw embedding must never be exposed
    assert "encrypted_embedding" not in profile
    assert "raw_embedding" not in profile

    profile_id = profile["id"]

    # Fetch by ID
    get_resp = await client.get(f"/api/v1/voices/{profile_id}", headers=auth_headers_alice)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == profile_id


async def test_list_voice_profiles(client: AsyncClient, test_user_alice, auth_headers_alice):
    # Create two profiles
    await client.post("/api/v1/voices", json={"label": "Profile 1"}, headers=auth_headers_alice)
    await client.post("/api/v1/voices", json={"label": "Profile 2"}, headers=auth_headers_alice)

    list_resp = await client.get("/api/v1/voices", headers=auth_headers_alice)
    assert list_resp.status_code == 200
    profiles = list_resp.json()["data"]
    assert len(profiles) >= 2


async def test_update_and_delete_voice_profile(client: AsyncClient, test_user_alice, auth_headers_alice):
    create_resp = await client.post("/api/v1/voices", json={"label": "Profile to edit"}, headers=auth_headers_alice)
    profile_id = create_resp.json()["data"]["id"]

    # Update
    update_resp = await client.patch(
        f"/api/v1/voices/{profile_id}",
        json={"label": "Updated Label", "status": "SUSPENDED"},
        headers=auth_headers_alice,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["label"] == "Updated Label"
    assert update_resp.json()["data"]["status"] == "SUSPENDED"

    # Delete
    del_resp = await client.delete(f"/api/v1/voices/{profile_id}", headers=auth_headers_alice)
    assert del_resp.status_code == 200

    # Ensure deleted
    get_del = await client.get(f"/api/v1/voices/{profile_id}", headers=auth_headers_alice)
    assert get_del.status_code == 404


async def test_voice_profile_user_isolation(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    # Alice creates a profile
    create_resp = await client.post("/api/v1/voices", json={"label": "Alice Private Voice"}, headers=auth_headers_alice)
    profile_id = create_resp.json()["data"]["id"]

    # Bob attempts to read Alice's profile -> 403 Forbidden
    bob_resp = await client.get(f"/api/v1/voices/{profile_id}", headers=auth_headers_bob)
    assert bob_resp.status_code == 403
    assert bob_resp.json()["error"]["code"] == "PERMISSION_DENIED"
