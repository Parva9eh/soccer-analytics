from fastapi import APIRouter
from core.supabase_client import supabase

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "Soccer Analytics API"}

@router.get("/supabase")
def test_supabase_connection():
    """Test connection to Supabase."""
    try:
        # Simple test query
        response = supabase.table("users").select("*", count="exact").limit(0).execute()
        return {
            "status": "connected",
            "message": "Supabase connection successful",
            "user_count": response.count
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
