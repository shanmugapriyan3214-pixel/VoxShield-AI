"""VoxShield AI — Database Engine and Session Management."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base

# Determine connect args (e.g. check_same_thread for SQLite)
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["check_same_thread"] = False

# Create asynchronous database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG and settings.ENVIRONMENT == "development",
    connect_args=connect_args,
    future=True,
)

# Async session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session with automatic cleanup."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize all database schema tables with non-destructive migrations."""
    # Import all models so metadata discovers them
    import app.db.models  # noqa: F401
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Check if voxshield_id exists in users table
        try:
            if "sqlite" in settings.DATABASE_URL:
                cols_res = await conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = [row[1] for row in cols_res.fetchall()]
                if "voxshield_id" not in existing_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN voxshield_id VARCHAR(20)"))
                    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_voxshield_id ON users (voxshield_id)"))
                # Backfill any null voxshield_ids
                await conn.execute(
                    text("UPDATE users SET voxshield_id = 'VS-' || UPPER(SUBSTR(REPLACE(id, '-', ''), 1, 8)) WHERE voxshield_id IS NULL")
                )
            else:
                # PostgreSQL or other dialect
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS voxshield_id VARCHAR(20)"))
                await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_voxshield_id ON users (voxshield_id)"))
                await conn.execute(
                    text("UPDATE users SET voxshield_id = 'VS-' || UPPER(SUBSTR(REPLACE(id, '-', ''), 1, 8)) WHERE voxshield_id IS NULL")
                )
        except Exception:
            # Table might not exist yet or dialect-specific variation; handled gracefully
            pass
