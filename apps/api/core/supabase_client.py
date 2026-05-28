from supabase import create_client, Client
from core.config import get_settings
from fastapi import Depends
from functools import lru_cache


@lru_cache()
def _create_supabase_client(use_service_role: bool = True) -> Client:
    """Create a Supabase client (cached)."""
    settings = get_settings()
    key = settings.SUPABASE_SERVICE_ROLE_KEY if use_service_role else settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


def get_supabase_service_client() -> Client:
    """Client with full privileges (for ETL, admin operations)."""
    return _create_supabase_client(use_service_role=True)


def get_supabase_anon_client() -> Client:
    """Client with anon key (respects Row Level Security)."""
    return _create_supabase_client(use_service_role=False)


# FastAPI dependency — used in routers
# Defaults to service role for now (we can make this smarter once we have auth)
def get_supabase() -> Client:
    return get_supabase_service_client()
