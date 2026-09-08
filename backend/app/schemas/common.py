"""VoxShield AI — Common API Response Envelopes & Schemas."""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiErrorDetail(BaseModel):
    """Detailed validation or context error field."""
    field: Optional[str] = None
    message: str


class ApiError(BaseModel):
    """Standardized error object structure."""
    code: str = Field(..., description="Machine-readable error classification code")
    message: str = Field(..., description="Human-readable explanation of the error")
    details: List[ApiErrorDetail] = Field(default_factory=list, description="Specific error details")


class ApiResponse(BaseModel, Generic[T]):
    """Unified API response envelope."""
    success: bool = Field(..., description="Indicates whether the request was successful")
    data: Optional[T] = Field(default=None, description="Response payload on success")
    error: Optional[ApiError] = Field(default=None, description="Error payload on failure")
    request_id: str = Field(..., description="Correlation ID for tracing")

    @classmethod
    def ok(cls, data: T, request_id: str = "-") -> "ApiResponse[T]":
        return cls(success=True, data=data, error=None, request_id=request_id)

    @classmethod
    def fail(
        cls,
        code: str,
        message: str,
        request_id: str = "-",
        details: Optional[List[ApiErrorDetail]] = None,
    ) -> "ApiResponse[None]":
        return cls(
            success=False,
            data=None,
            error=ApiError(code=code, message=message, details=details or []),
            request_id=request_id,
        )
