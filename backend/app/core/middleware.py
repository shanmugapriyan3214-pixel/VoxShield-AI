"""VoxShield AI — Custom HTTP Middleware Components."""

import time
import uuid
from collections import defaultdict
from typing import Callable, Dict, List
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.logging import request_id_ctx
from app.schemas.common import ApiResponse


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """Ensures every HTTP request has a unique correlation ID for logging and tracing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(req_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            request_id_ctx.reset(token)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces essential cybersecurity HTTP response headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'"
        )
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response


class ZeroAudioCallGuardMiddleware(BaseHTTPMiddleware):
    """Guarantees the Zero-Server-Audio privacy invariant at the HTTP layer.
    
    Strictly forbids raw voice payloads (WAV, PCM, Opus, multipart audio)
    from hitting real-time call or WebSocket signaling endpoints.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path.startswith("/api/v1/calls/") or path.startswith("/api/v1/ws/signaling/"):
            content_type = (request.headers.get("Content-Type") or "").lower()
            if any(forbidden in content_type for forbidden in ["audio/", "multipart/form-data", "application/octet-stream"]):
                req_id = request_id_ctx.get("-")
                res = ApiResponse.fail(
                    code="AUDIO_UPLOAD_FORBIDDEN_PRIVACY_INVARIANT",
                    message="Raw audio upload is strictly forbidden for real-time calls under the Zero-Server-Audio privacy invariant.",
                    request_id=req_id,
                )
                return JSONResponse(status_code=415, content=res.model_dump())

        return await call_next(request)


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter for development & single-instance deployments."""

    def __init__(self, default_limit: int = 180, requests_per_minute: int | None = None):
        self.default_limit = requests_per_minute if requests_per_minute is not None else default_limit
        self.history: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, limit: int) -> bool:
        now = time.time()
        window_start = now - 60.0
        # Filter timestamps in the 1-minute window
        timestamps = [t for t in self.history[key] if t > window_start]
        if len(timestamps) >= limit:
            self.history[key] = timestamps
            return True
        timestamps.append(now)
        self.history[key] = timestamps
        return False


rate_limiter = InMemoryRateLimiter(settings.RATE_LIMIT_PER_MINUTE)


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Intercepts requests to enforce granular rate limits per client IP and route category."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for static docs or health checks
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/health", "/api/v1/health"]:
            return await call_next(request)

        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Determine granular rate limit by endpoint family
        if path.startswith("/api/v1/auth"):
            limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
            category = "auth"
        elif "/challenge" in path:
            limit = settings.CHALLENGE_RATE_LIMIT_PER_MINUTE
            category = "challenge"
        elif path.startswith("/api/v1/incidents") and request.method == "POST":
            limit = settings.INCIDENT_RATE_LIMIT_PER_MINUTE
            category = "incident_write"
        elif path.startswith("/api/v1/demo"):
            limit = settings.DEMO_RATE_LIMIT_PER_MINUTE
            category = "demo"
        elif "/security-analysis" in path:
            limit = settings.TELEMETRY_RATE_LIMIT_PER_MINUTE
            category = "telemetry"
        else:
            limit = settings.RATE_LIMIT_PER_MINUTE
            category = "general"

        key = f"{client_ip}:{category}"
        if rate_limiter.is_rate_limited(key, limit):
            req_id = request_id_ctx.get("-")
            res = ApiResponse.fail(
                code="RATE_LIMIT_EXCEEDED",
                message=f"Rate limit exceeded for {category}. Please wait a moment before retrying.",
                request_id=req_id,
            )
            return JSONResponse(status_code=429, content=res.model_dump())

        return await call_next(request)
