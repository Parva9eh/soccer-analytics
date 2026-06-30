import pytest
from fastapi.testclient import TestClient

from core.config import get_settings
from tests.mock_supabase import MockSupabaseClient, demo_fixture


@pytest.fixture
def health_client() -> TestClient:
    from main import app
    from core.supabase_client import get_supabase_service_client

    mock = MockSupabaseClient(demo_fixture())
    app.dependency_overrides[get_supabase_service_client] = lambda: mock
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()


def test_health_check_returns_metadata(health_client: TestClient):
    response = health_client.get("/health/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "Soccer Analytics API"
    assert payload["environment"] == "test"
    assert "timestamp" in payload


def test_readiness_check_returns_ready(health_client: TestClient):
    response = health_client.get("/health/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["database"] == "connected"