"""VoxShield AI — User Profile Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_get_profile_me(client: AsyncClient, test_user_alice, auth_headers_alice):
    response = await client.get("/api/v1/users/me", headers=auth_headers_alice)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == test_user_alice.id
    assert data["username"] == "alice"
    assert data["display_name"] == "Alice Vance"
    assert "password_hash" not in data


async def test_update_profile_me(client: AsyncClient, test_user_alice, auth_headers_alice):
    payload = {
        "display_name": "Alice Vance Ph.D.",
        "avatar_url": "https://voxshield.io/avatars/alice.png",
    }
    response = await client.patch("/api/v1/users/me", json=payload, headers=auth_headers_alice)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["display_name"] == "Alice Vance Ph.D."
    assert data["avatar_url"] == "https://voxshield.io/avatars/alice.png"


async def test_get_public_profile_safe_redaction(
    client: AsyncClient,
    test_user_alice,
    test_user_bob,
    auth_headers_alice,
):
    response = await client.get(f"/api/v1/users/{test_user_bob.id}", headers=auth_headers_alice)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == test_user_bob.id
    assert data["username"] == "bob"
    assert data["display_name"] == "Bob Miller"
    # Verify strict omission of private fields
    assert "email" not in data
    assert "password_hash" not in data
    assert "is_verified" not in data


async def test_unauthenticated_request_rejected(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["success"] is False
