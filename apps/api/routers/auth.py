import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from core.auth import AuthUser
from core.deps import get_current_user_required, get_user_supabase
from schemas.error import COMMON_ERROR_RESPONSES, ErrorResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    display_name: str | None = None


@router.get(
    "/me",
    response_model=AuthMeResponse,
    responses={
        401: {"model": ErrorResponse},
        **COMMON_ERROR_RESPONSES,
    },
)
def get_current_user(
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> AuthMeResponse:
    """Return the authenticated user and profile from a valid access token."""
    display_name: str | None = None
    email = user.email

    try:
        result = (
            supabase.table("profiles")
            .select("display_name, email")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            display_name = row.get("display_name")
            email = row.get("email") or email
    except Exception:
        logger.debug("Profile row not available for user %s", user.id)

    return AuthMeResponse(
        id=user.id,
        email=email,
        role=user.role,
        display_name=display_name,
    )