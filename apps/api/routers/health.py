import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from supabase import Client

from core.supabase_client import get_supabase_service_client
from core.config import get_settings
from core.logging import get_request_id
from schemas.error import ErrorCode, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
def health_check(
    request: Request,
    request_id: str = Depends(get_request_id)
):
    """Basic health check with observability metadata."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "Soccer Analytics API",
        "version": request.app.version,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id if request_id != "-" else None,
    }


@router.get("/supabase")
def test_supabase_connection(
    supabase: Client = Depends(get_supabase_service_client),
    request_id: str = Depends(get_request_id)
):
    """Test Supabase connection."""
    try:
        response = supabase.table("matches").select("id", count="exact").limit(0).execute()
        settings = get_settings()
        return {
            "status": "connected",
            "service": "supabase",
            "environment": settings.ENVIRONMENT,
            "matches_count": response.count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        logger.exception("Supabase connection test failed")
        raise_http_exception(
            status_code=503,
            detail="Unable to connect to the database",
            code=ErrorCode.SERVICE_UNAVAILABLE
        )