from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import AuthUser, require_auth_user
from schemas.error import COMMON_ERROR_RESPONSES, ErrorResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"


@router.get(
    "/me",
    response_model=AuthMeResponse,
    responses={
        401: {"model": ErrorResponse},
        **COMMON_ERROR_RESPONSES,
    },
)
def get_current_user(
    user: AuthUser = Depends(require_auth_user),
) -> AuthMeResponse:
    """Return the authenticated user from a valid Supabase access token."""
    return AuthMeResponse(id=user.id, email=user.email, role=user.role)