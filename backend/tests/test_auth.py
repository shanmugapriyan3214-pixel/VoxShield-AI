"""VoxShield AI — Authentication & Identity Test Suite."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_success(client: AsyncClient):
    payload = {
        "email": "newuser@voxshield.io",
        "username": "newuser",
        "display_name": "New User",
        "password": "SecurePassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["user"]["email"] == "newuser@voxshield.io"
    assert "password_hash" not in body["data"]["user"]
    assert "access_token" in body["data"]["tokens"]
    assert "refresh_token" in body["data"]["tokens"]


async def test_register_duplicate_email(client: AsyncClient, test_user_alice):
    payload = {
        "email": "alice@voxshield.io",
        "username": "different_username",
        "display_name": "Alice Duplicate",
        "password": "SecurePassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_CONFLICT"


async def test_register_duplicate_username(client: AsyncClient, test_user_alice):
    payload = {
        "email": "another@voxshield.io",
        "username": "alice",
        "display_name": "Alice Two",
        "password": "SecurePassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_CONFLICT"


async def test_login_success(client: AsyncClient, test_user_alice):
    payload = {
        "email": "alice@voxshield.io",
        "password": "StrongP@ssw0rd123!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["user"]["username"] == "alice"
    assert "access_token" in body["data"]["tokens"]
    assert "refresh_token" in body["data"]["tokens"]


async def test_login_invalid_password(client: AsyncClient, test_user_alice):
    payload = {
        "email": "alice@voxshield.io",
        "password": "WrongPassword999!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "AUTHENTICATION_FAILED"


async def test_refresh_token_lifecycle_and_rotation(client: AsyncClient, test_user_alice):
    # 1. Login to get initial tokens
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@voxshield.io", "password": "StrongP@ssw0rd123!"},
    )
    tokens = login_resp.json()["data"]["tokens"]
    initial_refresh = tokens["refresh_token"]

    # 2. Refresh token once
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()["data"]["tokens"]
    second_refresh = new_tokens["refresh_token"]
    assert second_refresh != initial_refresh

    # 3. Attempt to reuse initial refresh token -> triggers theft detection / family revocation!
    reuse_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert reuse_resp.status_code == 401
    assert "reuse detected" in reuse_resp.json()["error"]["message"].lower()


async def test_logout_and_revocation(client: AsyncClient, test_user_alice, auth_headers_alice):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@voxshield.io", "password": "StrongP@ssw0rd123!"},
    )
    tokens = login_resp.json()["data"]["tokens"]
    refresh_token = tokens["refresh_token"]

    # Logout
    logout_resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers=auth_headers_alice,
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True

    # Try to use logged-out token
    fail_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert fail_refresh.status_code == 401


async def test_get_current_user_me(client: AsyncClient, test_user_alice, auth_headers_alice):
    response = await client.get("/api/v1/auth/me", headers=auth_headers_alice)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["email"] == "alice@voxshield.io"
    assert "password_hash" not in body["data"]


async def test_change_password(client: AsyncClient, test_user_alice, auth_headers_alice):
    payload = {
        "current_password": "StrongP@ssw0rd123!",
        "new_password": "BrandNewSecurePassword789!",
    }
    response = await client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers=auth_headers_alice,
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify login with new password succeeds
    login_new = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@voxshield.io", "password": "BrandNewSecurePassword789!"},
    )
    assert login_new.status_code == 200

    # Old password fails
    login_old = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@voxshield.io", "password": "StrongP@ssw0rd123!"},
    )
    assert login_old.status_code == 401
