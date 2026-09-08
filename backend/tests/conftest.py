"""VoxShield AI — Pytest Fixtures and Test Harness."""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from typing import AsyncGenerator, Dict
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.models.user import User
from app.db.session import get_db
from app.main import app

# In-memory test SQLite engine
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create session-scoped event loop."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create fresh database schema per test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client with overridden database dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_user_alice(db_session: AsyncSession) -> User:
    """Create primary test user Alice."""
    user = User(
        email="alice@voxshield.io",
        username="alice",
        display_name="Alice Vance",
        password_hash=get_password_hash("StrongP@ssw0rd123!"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def test_user_bob(db_session: AsyncSession) -> User:
    """Create secondary test user Bob."""
    user = User(
        email="bob@voxshield.io",
        username="bob",
        display_name="Bob Miller",
        password_hash=get_password_hash("StrongP@ssw0rd456!"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers_alice(test_user_alice: User) -> Dict[str, str]:
    """Return valid Authorization Bearer header for Alice."""
    token = create_access_token(
        subject=test_user_alice.id,
        extra_claims={"username": test_user_alice.username, "email": test_user_alice.email},
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_bob(test_user_bob: User) -> Dict[str, str]:
    """Return valid Authorization Bearer header for Bob."""
    token = create_access_token(
        subject=test_user_bob.id,
        extra_claims={"username": test_user_bob.username, "email": test_user_bob.email},
    )
    return {"Authorization": f"Bearer {token}"}
