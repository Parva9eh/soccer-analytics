import logging

from postgrest.exceptions import APIError
from supabase import Client

from core.auth import AuthUser

logger = logging.getLogger(__name__)


def ensure_profile(supabase: Client, user: AuthUser) -> None:
    """Ensure a profiles row exists (Google/OAuth users may lack the signup trigger row)."""
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("id", user.id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    try:
        supabase.table("profiles").insert(
            {
                "id": user.id,
                "email": user.email,
            }
        ).execute()
    except APIError as exc:
        if exc.code == "23505":
            return
        logger.warning("Could not create profile for %s: %s", user.id, exc)
        raise