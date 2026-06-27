import os

# Set required settings before the FastAPI app module is imported in tests.
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("REQUIRE_AUTH", "false")