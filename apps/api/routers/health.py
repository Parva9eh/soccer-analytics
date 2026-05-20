from fastapi import APIRouter, HTTPException
from core.supabase_client import supabase

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
def health_check():
    """Basic health check."""
    return {"status": "healthy", "service": "Soccer Analytics API"}


@router.get("/supabase")
def test_supabase_connection():
    """Test Supabase connection."""
    try:
        response = supabase.table("matches").select("id", count="exact").limit(0).execute()
        return {
            "status": "connected",
            "message": "Supabase connection successful",
            "matches_count": response.count
        }
    except Exception as e:
        print(f"[Health] Supabase connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to the database"
        )