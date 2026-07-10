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


@router.get("/ready")
def readiness_check(
    supabase: Client = Depends(get_supabase_service_client),
    request_id: str = Depends(get_request_id),
):
    """Readiness probe — boolean only (no row counts on the public surface)."""
    try:
        # Prove DB connectivity without leaking inventory size.
        supabase.table("matches").select("id").limit(1).execute()
        settings = get_settings()
        return {
            "status": "ready",
            "service": "Soccer Analytics API",
            "environment": settings.ENVIRONMENT,
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id if request_id != "-" else None,
        }
    except Exception:
        logger.exception("Readiness check failed")
        raise_http_exception(
            status_code=503,
            detail="Service not ready — database unavailable",
            code=ErrorCode.SERVICE_UNAVAILABLE,
        )


@router.get("/supabase")
def test_supabase_connection(
    supabase: Client = Depends(get_supabase_service_client),
    request_id: str = Depends(get_request_id)
):
    """Test Supabase connection (boolean only)."""
    try:
        supabase.table("matches").select("id").limit(1).execute()
        settings = get_settings()
        return {
            "status": "connected",
            "service": "supabase",
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id if request_id != "-" else None,
        }
    except Exception:
        logger.exception("Supabase connection test failed")
        raise_http_exception(
            status_code=503,
            detail="Unable to connect to the database",
            code=ErrorCode.SERVICE_UNAVAILABLE
        )
