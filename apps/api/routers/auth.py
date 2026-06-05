import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from postgrest.exceptions import APIError
from supabase import Client

from core.auth import AuthUser
from core.deps import get_current_user_required, get_user_supabase
from core.supabase_errors import raise_for_supabase_error
from schemas.auth import AuthMeResponse, AuthMeUpdate
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, ErrorResponse, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _is_workspace_member(supabase: Client, user_id: str, workspace_id: str) -> bool:
    result = (
        supabase.table("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def _load_profile_row(supabase: Client, user_id: str) -> dict | None:
    columns = "display_name, email, active_workspace_id"
    try:
        result = (
            supabase.table("profiles")
            .select(columns)
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        if "active_workspace_id" in _combined_api_message(exc):
            result = (
                supabase.table("profiles")
                .select("display_name, email")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
        else:
            raise
    if not result.data:
        return None
    return result.data[0]


def _combined_api_message(exc: APIError) -> str:
    parts = [exc.message, exc.details, exc.hint]
    return " ".join(p for p in parts if p).lower()


def _workspace_name(supabase: Client, workspace_id: str) -> str | None:
    try:
        result = (
            supabase.table("workspaces")
            .select("name")
            .eq("id", workspace_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0].get("name")
    except Exception:
        logger.debug("Workspace name lookup failed for %s", workspace_id)
    return None


def _build_auth_me_response(
    user: AuthUser,
    supabase: Client,
) -> AuthMeResponse:
    display_name: str | None = None
    email = user.email
    active_workspace_id: UUID | None = None
    active_workspace_name: str | None = None

    row = _load_profile_row(supabase, user.id)
    if row:
        display_name = row.get("display_name")
        email = row.get("email") or email
        raw_active = row.get("active_workspace_id")
        if raw_active:
            active_workspace_id = UUID(str(raw_active))
            if _is_workspace_member(supabase, user.id, str(active_workspace_id)):
                active_workspace_name = _workspace_name(
                    supabase,
                    str(active_workspace_id),
                )
            else:
                active_workspace_id = None

    return AuthMeResponse(
        id=user.id,
        email=email,
        role=user.role,
        display_name=display_name,
        active_workspace_id=active_workspace_id,
        active_workspace_name=active_workspace_name,
    )


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
    return _build_auth_me_response(user, supabase)


@router.patch(
    "/me",
    response_model=AuthMeResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        **COMMON_ERROR_RESPONSES,
    },
)
def update_current_user(
    body: AuthMeUpdate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> AuthMeResponse:
    """Update profile preferences (e.g. active workspace)."""
    if "active_workspace_id" not in body.model_fields_set:
        return _build_auth_me_response(user, supabase)

    if body.active_workspace_id is not None:
        ws_id = str(body.active_workspace_id)
        if not _is_workspace_member(supabase, user.id, ws_id):
            raise_http_exception(
                status_code=403,
                detail="You are not a member of that workspace",
                code=ErrorCode.FORBIDDEN,
            )

    try:
        supabase.table("profiles").update(
            {"active_workspace_id": str(body.active_workspace_id) if body.active_workspace_id else None}
        ).eq("id", user.id).execute()
    except Exception:
        logger.exception("Failed to update profile for user %s", user.id)
        raise_http_exception(
            status_code=500,
            detail="Failed to update profile",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )

    return _build_auth_me_response(user, supabase)