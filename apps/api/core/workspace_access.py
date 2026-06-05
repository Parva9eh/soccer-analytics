from supabase import Client

from schemas.error import ErrorCode, raise_http_exception
from schemas.workspace import WorkspaceRole


def require_workspace_admin(
    supabase: Client,
    user_id: str,
    workspace_id: str,
) -> WorkspaceRole:
    membership = (
        supabase.table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not membership.data:
        raise_http_exception(
            status_code=404,
            detail="Workspace not found",
            code=ErrorCode.NOT_FOUND,
        )

    role = WorkspaceRole(membership.data[0]["role"])
    if role != WorkspaceRole.admin:
        raise_http_exception(
            status_code=403,
            detail="Admin access required",
            code=ErrorCode.FORBIDDEN,
        )
    return role


def normalize_email(email: str) -> str:
    return email.strip().lower()