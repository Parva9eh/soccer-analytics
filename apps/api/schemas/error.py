from pydantic import BaseModel
from typing import Optional


# Standard error codes used across the API
class ErrorCode:
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    BAD_REQUEST = "BAD_REQUEST"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

    # Domain-specific
    MATCH_NOT_FOUND = "MATCH_NOT_FOUND"
    EVENTS_FETCH_FAILED = "EVENTS_FETCH_FAILED"
    SUMMARY_GENERATION_FAILED = "SUMMARY_GENERATION_FAILED"


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    request_id: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "detail": "Match not found",
                "code": "MATCH_NOT_FOUND",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


# Reusable response schemas for common errors (use with the `responses` parameter on routes)
COMMON_ERROR_RESPONSES = {
    404: {"model": ErrorResponse},
    422: {"model": ErrorResponse},  # Validation errors (e.g. invalid query parameters)
    500: {"model": ErrorResponse},
}


from fastapi import HTTPException


def raise_http_exception(
    status_code: int, 
    detail: str, 
    code: Optional[str] = None
) -> None:
    """Convenience helper to raise an HTTPException using the standard ErrorResponse shape."""
    raise HTTPException(
        status_code=status_code,
        detail=ErrorResponse(detail=detail, code=code).dict()
    )

