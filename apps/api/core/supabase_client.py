from typing import Annotated, Optional

from fastapi import Depends, Header
from supabase import Client, create_client

from core.config import get_settings
from core.auth import _extract_bearer
from schemas.error import ErrorCode, raise_http_exception
from functools import lru_cache


@lru_cache()
def _create_supabase_client(use_service_role: bool = True) -> Client:
    """Create a Supabase client (cached)."""
    settings = get_settings()
    key = (
        settings.SUPABASE_SERVICE_ROLE_KEY
        if use_service_role
        else settings.SUPABASE_ANON_KEY
    )
    return create_client(settings.SUPABASE_URL, key)


def get_supabase_service_client() -> Client:
    """Client with full privileges (for ETL, admin operations)."""
    return _create_supabase_client(use_service_role=True)


def get_supabase_anon_client() -> Client:
    """Client with anon key (respects Row Level Security)."""
    return _create_supabase_client(use_service_role=False)


def client_with_user_jwt(access_token: str) -> Client:
    """Anon client scoped to the authenticated user (RLS applies)."""
    client = get_supabase_anon_client()
    client.postgrest.auth(access_token)
    return client


def get_supabase(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Client:
    """
    FastAPI dependency for route handlers.

    - Bearer token present → anon client with user JWT (RLS).
    - No token + REQUIRE_AUTH=false → service role (local dev / ETL-era default).
    - No token + REQUIRE_AUTH=true → 401.
    """
    settings = get_settings()
    token = _extract_bearer(authorization)

    if token:
        return client_with_user_jwt(token)

    if settings.REQUIRE_AUTH:
        raise_http_exception(
            status_code=401,
            detail="Authentication required",
            code=ErrorCode.UNAUTHORIZED,
        )

    return get_supabase_service_client()