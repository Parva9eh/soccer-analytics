"""Run FastAPI with mocked Supabase for Playwright smoke tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["REQUIRE_AUTH"] = "false"
os.environ["CORS_ORIGINS"] = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3456,http://127.0.0.1:3456"
)

from main import app
from core.supabase_client import get_supabase_public_read, get_supabase_service_client
from tests.mock_supabase import MockSupabaseClient, e2e_fixture

_mock = MockSupabaseClient(e2e_fixture())
app.dependency_overrides[get_supabase_public_read] = lambda: _mock
app.dependency_overrides[get_supabase_service_client] = lambda: _mock

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("E2E_API_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")