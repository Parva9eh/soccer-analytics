import logging
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from core.auth import AuthUser
from core.config import get_settings
from core.deps import get_current_user_required, get_user_supabase
from core.supabase_errors import raise_for_supabase_error
from core.workspace_access import normalize_email, require_workspace_admin
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.workspace import (
    InvitationAccept,
    InvitationAcceptResponse,
    InvitationCreate,
    InvitationResponse,
    InvitationStatus,
    WorkspaceRole,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def _invitation_to_response(row: dict) -> InvitationResponse:
    settings = get_settings()
    token = row.get("token")
    invite_url = (
        f"{settings.web_app_url}/invitations/accept?token={token}"
        if token
        else None
    )
    return InvitationResponse(
        id=row["id"],
        workspace_id=row["workspace_id"],
        email=row["email"],
        role=WorkspaceRole(row["role"]),
        status=InvitationStatus(row["status"]),
        created_at=row["created_at"],
        expires_at=row["expires_at"],
        invite_url=invite_url,
    )


def _member_exists_for_email(
    supabase: Client,
    workspace_id: str,
    email: str,
) -> bool:
    members = (
        supabase.table("workspace_members")
        .select("user_id, profiles(email)")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    target = normalize_email(email)
    for row in members.data or []:
        profile = row.get("profiles") or {}
        profile_email = profile.get("email")
        if profile_email and normalize_email(profile_email) == target:
            return True
    return False


@router.post(
    "/invitations/accept",
    response_model=InvitationAcceptResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def accept_invitation(
    body: InvitationAccept,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> InvitationAcceptResponse:
    """Accept a pending invitation (signed-in email must match invite)."""
    if not user.email:
        raise_http_exception(
            status_code=400,
            detail="Your account has no email; cannot accept invitations",
            code=ErrorCode.BAD_REQUEST,
        )

    try:
        result = supabase.rpc(
            "accept_workspace_invitation",
            {"p_token": body.token.strip()},
        ).execute()

        rows = result.data or []
        if not rows:
            raise_http_exception(
                status_code=500,
                detail="Failed to accept invitation",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )

        row = rows[0] if isinstance(rows, list) else rows
        return InvitationAcceptResponse(
            workspace_id=row["workspace_id"],
            workspace_name=row["workspace_name"] or "Workspace",
            role=WorkspaceRole(row["role"]),
        )

    except HTTPException:
        raise
    except APIError as exc:
        message = (exc.message or "").lower()
        if "not found" in message or exc.code == "P0002":
            raise_http_exception(
                status_code=404,
                detail="Invitation not found or no longer valid",
                code=ErrorCode.NOT_FOUND,
            )
        if "expired" in message:
            raise_http_exception(
                status_code=410,
                detail="Invitation has expired",
                code=ErrorCode.BAD_REQUEST,
            )
        if "email address that received" in message or exc.code == "42501":
            raise_http_exception(
                status_code=403,
                detail="Sign in with the email address that received this invitation",
                code=ErrorCode.FORBIDDEN,
            )
        if "PGRST202" in str(exc.code) or "accept_workspace_invitation" in message:
            raise_http_exception(
                status_code=503,
                detail=(
                    "Invitation accept function is missing. "
                    "Apply migration 20250604220000_accept_workspace_invitation_rpc.sql."
                ),
                code=ErrorCode.SERVICE_UNAVAILABLE,
            )
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to accept invitation",
            log_context="accept_invitation",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to accept invitation",
            log_context="accept_invitation",
        )


@router.get(
    "/{workspace_id}/invitations",
    response_model=list[InvitationResponse],
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def list_invitations(
    workspace_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> list[InvitationResponse]:
    """List pending invitations (admins only)."""
    ws_id = str(workspace_id)
    try:
        require_workspace_admin(supabase, user.id, ws_id)
        result = (
            supabase.table("workspace_invitations")
            .select("id, workspace_id, email, role, status, token, created_at, expires_at")
            .eq("workspace_id", ws_id)
            .eq("status", InvitationStatus.pending.value)
            .order("created_at", desc=True)
            .execute()
        )
        return [_invitation_to_response(row) for row in result.data or []]
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list invitations",
            log_context="list_invitations",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list invitations",
            log_context="list_invitations",
        )


@router.post(
    "/{workspace_id}/invitations",
    response_model=InvitationResponse,
    status_code=201,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def create_invitation(
    workspace_id: UUID,
    body: InvitationCreate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> InvitationResponse:
    """Invite someone by email (admins only). Returns a shareable invite link."""
    ws_id = str(workspace_id)
    email = normalize_email(body.email)

    try:
        require_workspace_admin(supabase, user.id, ws_id)

        if user.email and normalize_email(user.email) == email:
            raise_http_exception(
                status_code=409,
                detail="You are already a member of this workspace",
                code=ErrorCode.CONFLICT,
            )

        if _member_exists_for_email(supabase, ws_id, email):
            raise_http_exception(
                status_code=409,
                detail="That email is already a workspace member",
                code=ErrorCode.CONFLICT,
            )

        pending = (
            supabase.table("workspace_invitations")
            .select("id")
            .eq("workspace_id", ws_id)
            .eq("email", email)
            .eq("status", InvitationStatus.pending.value)
            .limit(1)
            .execute()
        )
        if pending.data:
            raise_http_exception(
                status_code=409,
                detail="A pending invitation already exists for this email",
                code=ErrorCode.CONFLICT,
            )

        token = secrets.token_urlsafe(24)
        inserted = (
            supabase.table("workspace_invitations")
            .insert(
                {
                    "workspace_id": ws_id,
                    "email": email,
                    "role": body.role.value,
                    "invited_by": user.id,
                    "token": token,
                }
            )
            .execute()
        )
        if not inserted.data:
            raise_http_exception(
                status_code=500,
                detail="Failed to create invitation",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )

        return _invitation_to_response(inserted.data[0])

    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to create invitation",
            log_context="create_invitation",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to create invitation",
            log_context="create_invitation",
        )


@router.delete(
    "/{workspace_id}/invitations/{invitation_id}",
    status_code=204,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def revoke_invitation(
    workspace_id: UUID,
    invitation_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> None:
    """Revoke a pending invitation (admins only)."""
    ws_id = str(workspace_id)
    try:
        require_workspace_admin(supabase, user.id, ws_id)
        updated = (
            supabase.table("workspace_invitations")
            .update({"status": InvitationStatus.revoked.value})
            .eq("id", str(invitation_id))
            .eq("workspace_id", ws_id)
            .eq("status", InvitationStatus.pending.value)
            .execute()
        )
        if not updated.data:
            raise_http_exception(
                status_code=404,
                detail="Invitation not found",
                code=ErrorCode.NOT_FOUND,
            )
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to revoke invitation",
            log_context="revoke_invitation",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to revoke invitation",
            log_context="revoke_invitation",
        )