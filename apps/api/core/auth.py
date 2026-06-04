from dataclasses import dataclass
from typing import Annotated, Optional

import jwt
from fastapi import Depends, Header
from jwt import InvalidTokenError

from core.config import get_settings
from schemas.error import ErrorCode, raise_http_exception


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: Optional[str] = None
    role: str = "authenticated"


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def decode_access_token(token: str) -> AuthUser:
    settings = get_settings()
    if not settings.SUPABASE_JWT_SECRET:
        raise_http_exception(
            status_code=500,
            detail="SUPABASE_JWT_SECRET is not configured",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except InvalidTokenError:
        raise_http_exception(
            status_code=401,
            detail="Invalid or expired access token",
            code=ErrorCode.UNAUTHORIZED,
        )

    sub = payload.get("sub")
    if not sub:
        raise_http_exception(
            status_code=401,
            detail="Invalid token subject",
            code=ErrorCode.UNAUTHORIZED,
        )

    return AuthUser(
        id=str(sub),
        email=payload.get("email"),
        role=str(payload.get("role", "authenticated")),
    )


def get_optional_bearer_token(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[str]:
    return _extract_bearer(authorization)


def get_optional_auth_user(
    token: Annotated[Optional[str], Depends(get_optional_bearer_token)] = None,
) -> Optional[AuthUser]:
    if not token:
        return None
    return decode_access_token(token)


def require_auth_user(
    user: Annotated[Optional[AuthUser], Depends(get_optional_auth_user)] = None,
) -> AuthUser:
    if user is None:
        raise_http_exception(
            status_code=401,
            detail="Authentication required",
            code=ErrorCode.UNAUTHORIZED,
        )
    return user