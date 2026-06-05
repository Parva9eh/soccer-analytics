import logging

from postgrest.exceptions import APIError

from schemas.error import ErrorCode, raise_http_exception

logger = logging.getLogger(__name__)


def _combined_message(exc: APIError) -> str:
    parts = [exc.message, exc.details, exc.hint]
    return " ".join(p for p in parts if p).lower()


def raise_for_supabase_error(
    exc: Exception,
    *,
    fallback_detail: str,
    log_context: str,
) -> None:
    """Map PostgREST/Postgres errors to API responses with actionable detail."""
    if isinstance(exc, APIError):
        text = _combined_message(exc)
        code = (exc.code or "").upper()

        if (
            code in {"42P01", "PGRST205", "PGRST200"}
            or "does not exist" in text
            or "could not find the table" in text
        ):
            raise_http_exception(
                status_code=503,
                detail=(
                    "Workspace tables are not available. "
                    "Apply Supabase migrations from supabase/migrations/ (see supabase/README.md)."
                ),
                code=ErrorCode.SERVICE_UNAVAILABLE,
            )

        if code == "42P17" or "infinite recursion" in text:
            raise_http_exception(
                status_code=503,
                detail=(
                    "Workspace security policies need an update. "
                    "Apply migration 20250604170000_fix_workspace_rls_recursion.sql."
                ),
                code=ErrorCode.SERVICE_UNAVAILABLE,
            )

        if code in {"42501", "PGRST301"} or "permission denied" in text:
            raise_http_exception(
                status_code=403,
                detail=(
                    "Workspace access was denied by database policies. "
                    "Apply migration 20250604190000_workspaces_create_policy_fix.sql "
                    "(and 20250604170000_fix_workspace_rls_recursion.sql if not already applied)."
                ),
                code=ErrorCode.FORBIDDEN,
            )

        logger.warning("%s: %s", log_context, exc)
        raise_http_exception(
            status_code=502,
            detail=exc.message or fallback_detail,
            code=ErrorCode.SERVICE_UNAVAILABLE,
        )

    logger.exception(log_context)
    raise_http_exception(
        status_code=500,
        detail=fallback_detail,
        code=ErrorCode.INTERNAL_SERVER_ERROR,
    )