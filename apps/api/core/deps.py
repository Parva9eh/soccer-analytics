from typing import Annotated

from fastapi import Depends
from supabase import Client

from core.auth import get_optional_bearer_token, require_auth_user, AuthUser
from core.supabase_client import client_with_user_jwt
from schemas.error import ErrorCode, raise_http_exception


def require_bearer_token(
    token: Annotated[str | None, Depends(get_optional_bearer_token)] = None,
) -> str:
    if not token:
        raise_http_exception(
            status_code=401,
            detail="Authentication required",
            code=ErrorCode.UNAUTHORIZED,
        )
    return token


def get_user_supabase(
    token: Annotated[str, Depends(require_bearer_token)],
) -> Client:
    """Supabase client scoped to the authenticated user (RLS enforced)."""
    return client_with_user_jwt(token)


def get_current_user_required(
    user: Annotated[AuthUser, Depends(require_auth_user)],
) -> AuthUser:
    return user