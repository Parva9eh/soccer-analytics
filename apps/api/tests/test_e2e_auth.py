from fastapi.testclient import TestClient

from tests.mock_supabase import E2E_USER_ID, E2E_WORKSPACE_ID, MockSupabaseClient, e2e_fixture

E2E_TOKEN = "e2e-smoke-token"


def test_auth_me_with_e2e_token():
    from main import app
    from core.auth import get_optional_auth_user
    from core.deps import get_user_supabase
    from core.supabase_client import get_supabase_public_read, get_supabase_service_client
    from core.auth import AuthUser, _extract_bearer
    from fastapi import Header
    from typing import Annotated, Optional

    mock = MockSupabaseClient(e2e_fixture())
    e2e_user = AuthUser(id=E2E_USER_ID, email="e2e@soccer-analytics.test")

    def _optional_auth(
        authorization: Annotated[Optional[str], Header()] = None,
    ) -> Optional[AuthUser]:
        if _extract_bearer(authorization) == E2E_TOKEN:
            return e2e_user
        return None

    app.dependency_overrides[get_supabase_public_read] = lambda: mock
    app.dependency_overrides[get_supabase_service_client] = lambda: mock
    app.dependency_overrides[get_optional_auth_user] = _optional_auth
    app.dependency_overrides[get_user_supabase] = lambda: mock

    client = TestClient(app)
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {E2E_TOKEN}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == E2E_USER_ID
    assert payload["active_workspace_id"] == E2E_WORKSPACE_ID
    assert payload["active_workspace_name"] == "E2E Workspace"

    app.dependency_overrides.clear()