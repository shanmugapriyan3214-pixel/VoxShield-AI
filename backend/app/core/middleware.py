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
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter for development & single-instance deployments."""

    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
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
    """Intercepts requests to enforce rate limits per client IP."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for static docs or health checks
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/health", "/api/v1/health"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        is_auth_route = request.url.path.startswith("/api/v1/auth")
        limit = settings.AUTH_RATE_LIMIT_PER_MINUTE if is_auth_route else settings.RATE_LIMIT_PER_MINUTE

        key = f"{client_ip}:{request.url.path if is_auth_route else 'general'}"
        if rate_limiter.is_rate_limited(key, limit):
            req_id = request_id_ctx.get("-")
            res = ApiResponse.fail(
                code="RATE_LIMIT_EXCEEDED",
                message="Too many requests. Please slow down and retry in a moment.",
                request_id=req_id,
            )
            return JSONResponse(status_code=429, content=res.model_dump())

        return await call_next(request)
