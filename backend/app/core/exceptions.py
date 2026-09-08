"""VoxShield AI — Domain Exceptions and Global Handlers."""

from typing import Any, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx
from app.schemas.common import ApiErrorDetail, ApiResponse


class VoxShieldException(Exception):
    """Base domain exception for VoxShield AI."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[List[ApiErrorDetail]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


class AuthenticationException(VoxShieldException):
    def __init__(self, message: str = "Authentication failed.", details: Optional[List[ApiErrorDetail]] = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class PermissionDeniedException(VoxShieldException):
    def __init__(self, message: str = "Permission denied.", details: Optional[List[ApiErrorDetail]] = None):
        super().__init__(
            message=message,
            code="PERMISSION_DENIED",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ResourceNotFoundException(VoxShieldException):
    def __init__(self, message: str = "Resource not found.", details: Optional[List[ApiErrorDetail]] = None):
        super().__init__(
            message=message,
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictException(VoxShieldException):
    def __init__(self, message: str = "Resource conflict.", details: Optional[List[ApiErrorDetail]] = None):
        super().__init__(
            message=message,
            code="RESOURCE_CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationException(VoxShieldException):
    def __init__(self, message: str = "Validation failed.", details: Optional[List[ApiErrorDetail]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_FAILED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class RateLimitExceededException(VoxShieldException):
    def __init__(self, message: str = "Rate limit exceeded. Please retry later."):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register uniform JSON exception handlers with FastAPI."""

    @app.exception_handler(VoxShieldException)
    async def voxshield_exception_handler(request: Request, exc: VoxShieldException) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        response_model = ApiResponse.fail(
            code=exc.code,
            message=exc.message,
            request_id=req_id,
            details=exc.details,
        )
        return JSONResponse(status_code=exc.status_code, content=response_model.model_dump())

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        details = [
            ApiErrorDetail(
                field=" -> ".join(str(loc) for loc in err.get("loc", [])),
                message=err.get("msg", "Invalid value"),
            )
            for err in exc.errors()
        ]
        response_model = ApiResponse.fail(
            code="REQUEST_VALIDATION_ERROR",
            message="The request payload failed schema validation.",
            request_id=req_id,
            details=details,
        )
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=response_model.model_dump())

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        code_map = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            429: "RATE_LIMITED",
            500: "SERVER_ERROR",
        }
        error_code = code_map.get(exc.status_code, "HTTP_ERROR")
        response_model = ApiResponse.fail(
            code=error_code,
            message=str(exc.detail),
            request_id=req_id,
        )
        return JSONResponse(status_code=exc.status_code, content=response_model.model_dump())

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        response_model = ApiResponse.fail(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected internal server error occurred.",
            request_id=req_id,
        )
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=response_model.model_dump())
