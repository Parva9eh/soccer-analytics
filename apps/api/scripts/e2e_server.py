"""Run FastAPI with mocked Supabase for Playwright smoke tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Annotated, Optional

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
    "http://localhost:3456,http://127.0.0.1:3456,"
    "http://localhost:3457,http://127.0.0.1:3457"
)

from fastapi import Header

from main import app
from core.auth import AuthUser, _extract_bearer, get_optional_auth_user
from core.deps import get_user_supabase
from core.supabase_client import get_supabase_public_read, get_supabase_service_client
from tests.mock_supabase import E2E_USER_ID, MockSupabaseClient, e2e_fixture

E2E_ACCESS_TOKEN = os.environ.get("E2E_ACCESS_TOKEN", "e2e-smoke-token")
E2E_USER = AuthUser(
    id=E2E_USER_ID,
    email="e2e@soccer-analytics.test",
    role="authenticated",
)

_mock = MockSupabaseClient(e2e_fixture())


def _e2e_optional_auth_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[AuthUser]:
    token = _extract_bearer(authorization)
    if token == E2E_ACCESS_TOKEN:
        return E2E_USER
    return None


def _e2e_user_supabase() -> MockSupabaseClient:
    return _mock


app.dependency_overrides[get_supabase_public_read] = lambda: _mock
app.dependency_overrides[get_supabase_service_client] = lambda: _mock
app.dependency_overrides[get_optional_auth_user] = _e2e_optional_auth_user
app.dependency_overrides[get_user_supabase] = _e2e_user_supabase

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("E2E_API_PORT", "8000"))
    host = os.environ.get("E2E_API_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port, log_level="warning")