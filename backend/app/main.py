"""VoxShield AI — Master FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    ai,
    analysis,
    auth,
    calls,
    health,
    incidents,
    signaling,
    threats,
    trusted_voices,
    users,
    voices,
)
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger
from app.core.middleware import (
    RateLimitingMiddleware,
    RequestCorrelationMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown events."""
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode...")
    # Initialize database tables
    try:
        await init_db()
        logger.info("Database schema verified and tables initialized.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


def create_application() -> FastAPI:
    """Build and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=(
            "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks.\n\n"
            "**Core Privacy Principle**: Raw voice call media is strictly peer-to-peer and encrypted "
            "(DTLS-SRTP). Unencrypted call audio NEVER reaches the VoxShield AI backend."
        ),
        version="1.0.0",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. Register Global Exception Handlers
    register_exception_handlers(app)

    # 2. Add Custom Cybersecurity Middleware
    app.add_middleware(RequestCorrelationMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitingMiddleware)

    # 3. Add CORS Middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"],
        )

    # 4. Root Liveness Probe
    @app.get("/health", tags=["Health"], summary="Basic liveness check")
    async def root_health():
        return {"status": "ok", "service": settings.PROJECT_NAME}

    # 5. Assemble API v1 Routers
    app.include_router(auth.router, prefix=settings.API_V1_STR)
    app.include_router(users.router, prefix=settings.API_V1_STR)
    app.include_router(voices.router, prefix=settings.API_V1_STR)
    app.include_router(trusted_voices.router, prefix=settings.API_V1_STR)
    app.include_router(analysis.router, prefix=settings.API_V1_STR)
    app.include_router(ai.router, prefix=settings.API_V1_STR)
    app.include_router(calls.router, prefix=settings.API_V1_STR)
    app.include_router(signaling.router, prefix=settings.API_V1_STR)
    app.include_router(threats.router, prefix=settings.API_V1_STR)
    app.include_router(incidents.router, prefix=settings.API_V1_STR)
    app.include_router(health.router, prefix=settings.API_V1_STR)

    return app


app = create_application()
