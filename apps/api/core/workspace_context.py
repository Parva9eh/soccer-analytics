from typing import Optional

from fastapi import HTTPException
from supabase import Client

from schemas.error import ErrorCode, raise_http_exception


def try_resolve_active_workspace_id(supabase: Client, user_id: str) -> Optional[str]:
    """Active workspace id, or None when the user has no workspace yet."""
    try:
        return resolve_active_workspace_id(supabase, user_id)
    except HTTPException:
        return None


def resolve_active_workspace_id(supabase: Client, user_id: str) -> str:
    """Active workspace from profile, validated membership, or first membership."""
    profile = (
        supabase.table("profiles")
        .select("active_workspace_id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = profile.data or []
    active = rows[0].get("active_workspace_id") if rows else None

    if active:
        membership = (
            supabase.table("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", str(active))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if membership.data:
            return str(active)

    fallback = (
        supabase.table("workspace_members")
        .select("workspace_id")
        .eq("user_id", user_id)
        .order("joined_at")
        .limit(1)
        .execute()
    )
    if not fallback.data:
        raise_http_exception(
            status_code=400,
            detail="Join or create a workspace before using this feature",
            code=ErrorCode.BAD_REQUEST,
        )

    return str(fallback.data[0]["workspace_id"])