"""VoxShield AI — Security Hardening & Health Test Suite."""

import pytest
from httpx import AsyncClient
from app.core.middleware import InMemoryRateLimiter
from app.core.security import get_password_hash, verify_password

def test_argon2id_hashing():
    password = "SuperSecretPassword123!@#"
    hashed = get_password_hash(password)
    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


@pytest.mark.asyncio
async def test_security_headers_and_request_id(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    # 1. Basic probe
    res1 = await client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "ok"

    # 2. Deep probe
    res2 = await client.get("/api/v1/health")
    assert res2.status_code == 200
    data = res2.json()["data"]
    assert data["status"] in ("HEALTHY", "DEGRADED")
    assert "database" in data["components"]
    assert "ai_engine" in data["components"]
    assert "blockchain" in data["components"]


def test_in_memory_rate_limiter():
    limiter = InMemoryRateLimiter(requests_per_minute=3)
    key = "192.168.1.1:test"

    assert limiter.is_rate_limited(key, 3) is False
    assert limiter.is_rate_limited(key, 3) is False
    assert limiter.is_rate_limited(key, 3) is False
    # 4th request exceeds limit
    assert limiter.is_rate_limited(key, 3) is True
