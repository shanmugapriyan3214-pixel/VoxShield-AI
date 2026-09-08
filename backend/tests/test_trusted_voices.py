"""VoxShield AI — Trusted Voices Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_and_get_trusted_voice(client: AsyncClient, test_user_alice, auth_headers_alice):
    payload = {
        "display_name": "Father",
        "relationship": "Father",
    }
    create_resp = await client.post("/api/v1/trusted-voices", json=payload, headers=auth_headers_alice)
    assert create_resp.status_code == 201
    contact = create_resp.json()["data"]
    assert contact["display_name"] == "Father"
    assert contact["relationship"] == "Father"
    assert contact["status"] == "VERIFIED"

    contact_id = contact["id"]

    # Fetch
    get_resp = await client.get(f"/api/v1/trusted-voices/{contact_id}", headers=auth_headers_alice)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == contact_id


async def test_update_and_delete_trusted_voice(client: AsyncClient, test_user_alice, auth_headers_alice):
    create_resp = await client.post(
        "/api/v1/trusted-voices",
        json={"display_name": "Brother", "relationship": "Brother"},
        headers=auth_headers_alice,
    )
    contact_id = create_resp.json()["data"]["id"]

    # Update
    update_resp = await client.patch(
        f"/api/v1/trusted-voices/{contact_id}",
        json={"display_name": "Elder Brother", "status": "SUSPENDED"},
        headers=auth_headers_alice,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["display_name"] == "Elder Brother"
    assert update_resp.json()["data"]["status"] == "SUSPENDED"

    # Delete
    del_resp = await client.delete(f"/api/v1/trusted-voices/{contact_id}", headers=auth_headers_alice)
    assert del_resp.status_code == 200

    # Ensure removed
    get_del = await client.get(f"/api/v1/trusted-voices/{contact_id}", headers=auth_headers_alice)
    assert get_del.status_code == 404


async def test_trusted_voice_user_isolation(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
    auth_headers_bob,
):
    create_resp = await client.post(
        "/api/v1/trusted-voices",
        json={"display_name": "Alice's Sister", "relationship": "Sister"},
        headers=auth_headers_alice,
    )
    contact_id = create_resp.json()["data"]["id"]

    # Bob attempts to view Alice's contact -> 403 Forbidden
    bob_resp = await client.get(f"/api/v1/trusted-voices/{contact_id}", headers=auth_headers_bob)
    assert bob_resp.status_code == 403
    assert bob_resp.json()["error"]["code"] == "PERMISSION_DENIED"
