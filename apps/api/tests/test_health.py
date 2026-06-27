from fastapi.testclient import TestClient

from core.config import get_settings
from main import app

get_settings.cache_clear()

client = TestClient(app)


def test_health_check_returns_metadata():
    response = client.get("/health/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "Soccer Analytics API"
    assert payload["environment"] == "test"
    assert "timestamp" in payload