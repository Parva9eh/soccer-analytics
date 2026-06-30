"""API integration tests with mocked Supabase (no live database)."""

import pytest
from fastapi.testclient import TestClient

from tests.mock_supabase import MockSupabaseClient, demo_fixture


@pytest.fixture
def api_client(mock_supabase: MockSupabaseClient) -> TestClient:
    from main import app
    from core.supabase_client import (
        get_supabase_public_read,
        get_supabase_service_client,
    )

    app.dependency_overrides[get_supabase_public_read] = lambda: mock_supabase
    app.dependency_overrides[get_supabase_service_client] = lambda: mock_supabase
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_matches_list_returns_team_names(api_client: TestClient):
    response = api_client.get(
        "/matches/",
        params={"competition": "La Liga", "season": "2020/2021", "limit": 10},
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["home_team"] == "Barcelona"
    assert payload[0]["away_team"] == "Real Madrid"
    assert payload[0]["competition"] == "La Liga"
    assert payload[0]["season"] == "2020/2021"


def test_competitions_catalog_groups_seasons(api_client: TestClient):
    response = api_client.get("/competitions/")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "La Liga"
    assert payload[0]["seasons"] == ["2020/2021"]


def test_health_supabase_uses_mock_count(api_client: TestClient):
    response = api_client.get("/health/supabase")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "connected"
    assert payload["matches_count"] == 1


def test_season_zones_aggregates_mock_events(api_client: TestClient):
    response = api_client.get(
        "/analytics/zones/season",
        params={"competition": "La Liga", "season": "2020/2021"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["competition"] == "La Liga"
    assert payload["season"] == "2020/2021"
    teams = {row["team"]: row for row in payload["teams"]}
    assert teams["Barcelona"]["total_events"] == 2
    assert teams["Real Madrid"]["total_events"] == 1