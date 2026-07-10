from typing import Annotated, Optional

from fastapi import Header
from supabase import Client, create_client

from core.config import get_settings
from core.auth import _extract_bearer
from schemas.error import ErrorCode, raise_http_exception
from functools import lru_cache


def _new_client(*, use_service_role: bool) -> Client:
    """Create a fresh Supabase client (never share mutable auth headers across requests)."""
    settings = get_settings()
    key = (
        settings.SUPABASE_SERVICE_ROLE_KEY
        if use_service_role
        else settings.SUPABASE_ANON_KEY
    )
    return create_client(settings.SUPABASE_URL, key)


@lru_cache()
def _service_role_client() -> Client:
    """Process-wide service-role client (ETL / health only — never user JWT)."""
    return _new_client(use_service_role=True)


def get_supabase_service_client() -> Client:
    """Client with full privileges (for ETL, admin operations)."""
    return _service_role_client()


def get_supabase_anon_client() -> Client:
    """
    Fresh anon client for guest / public-read RLS.

    A new instance every call so Authorization headers set on user-scoped
    clients cannot leak into guest requests (postgrest.auth mutates headers).
    """
    return _new_client(use_service_role=False)


def client_with_user_jwt(access_token: str) -> Client:
    """Fresh anon client scoped to one user's JWT (RLS applies)."""
    client = _new_client(use_service_role=False)
    client.postgrest.auth(access_token)
    return client


def get_supabase_public_read(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Client:
    """
    Read routes: Bearer token → user-scoped RLS; no token → anon public-read RLS.
    """
    token = _extract_bearer(authorization)
    if token:
        return client_with_user_jwt(token)
    return get_supabase_anon_client()


def get_supabase(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Client:
    """
    Legacy FastAPI dependency (prefer get_supabase_public_read / get_user_supabase).

    - Bearer token present → fresh user-scoped anon client (RLS).
    - No token + REQUIRE_AUTH=false → service role (local dev footgun — avoid new use).
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
