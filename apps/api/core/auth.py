import logging
from dataclasses import dataclass
from typing import Annotated, Any, Optional

import httpx
import jwt
from fastapi import Depends, Header
from jwt import InvalidTokenError, PyJWKClient

from core.config import get_settings
from schemas.error import ErrorCode, raise_http_exception

logger = logging.getLogger(__name__)

_JWKS_CLIENT: PyJWKClient | None = None


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


def _payload_to_user(payload: dict[str, Any]) -> AuthUser:
    sub = payload.get("sub")
    if not sub:
        raise InvalidTokenError("missing sub claim")
    return AuthUser(
        id=str(sub),
        email=payload.get("email"),
        role=str(payload.get("role", "authenticated")),
    )


def _decode_with_audience_fallback(
    token: str,
    key: Any,
    algorithms: list[str],
) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience="authenticated",
        )
    except InvalidTokenError:
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            options={"verify_aud": False},
        )


def _decode_hs256(token: str, secret: str) -> dict[str, Any]:
    return _decode_with_audience_fallback(token, secret, ["HS256"])


def _decode_jwks(token: str, jwks_url: str) -> dict[str, Any]:
    global _JWKS_CLIENT
    if _JWKS_CLIENT is None or getattr(_JWKS_CLIENT, "uri", None) != jwks_url:
        _JWKS_CLIENT = PyJWKClient(jwks_url, cache_keys=True)
    signing_key = _JWKS_CLIENT.get_signing_key_from_jwt(token)
    return _decode_with_audience_fallback(
        token,
        signing_key.key,
        ["ES256", "RS256", "EdDSA", "HS256"],
    )


def _fetch_user_via_supabase_auth(token: str) -> AuthUser:
    settings = get_settings()
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    try:
        response = httpx.get(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise InvalidTokenError(f"auth user request failed: {exc}") from exc

    if response.status_code != 200:
        raise InvalidTokenError(f"auth user status {response.status_code}")

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise InvalidTokenError("auth user missing id")

    return AuthUser(
        id=str(user_id),
        email=data.get("email"),
        role="authenticated",
    )


def decode_access_token(token: str) -> AuthUser:
    """
    Verify Supabase access tokens for /auth/me and similar routes.

    Data routes use postgrest.auth(token); Supabase validates those server-side.
    Prefer the Auth API first (same trust model), then JWKS / legacy HS256.
    """
    settings = get_settings()

    try:
        return _fetch_user_via_supabase_auth(token)
    except InvalidTokenError as exc:
        logger.debug("Supabase user verify failed: %s", exc)

    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        return _payload_to_user(_decode_jwks(token, jwks_url))
    except InvalidTokenError as exc:
        logger.debug("JWKS verify failed: %s", exc)

    if settings.SUPABASE_JWT_SECRET:
        try:
            return _payload_to_user(_decode_hs256(token, settings.SUPABASE_JWT_SECRET))
        except InvalidTokenError as exc:
            logger.debug("HS256 verify failed: %s", exc)

    raise_http_exception(
        status_code=401,
        detail="Invalid or expired access token",
        code=ErrorCode.UNAUTHORIZED,
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