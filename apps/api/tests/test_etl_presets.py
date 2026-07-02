from unittest.mock import patch

import pytest

from etl.presets import EXPANSION_DATASET, GUEST_DEMO_DATASET, RECOMMENDED_DATASETS
from etl.resolve import normalize_season_name, resolve_statsbomb_competition_season


def test_recommended_datasets_include_demo_and_expansion():
    roles = {d.role for d in RECOMMENDED_DATASETS}
    assert "guest_demo" in roles
    assert "expansion" in roles
    assert GUEST_DEMO_DATASET.competition == "La Liga"
    assert EXPANSION_DATASET.competition == "Premier League"
    assert EXPANSION_DATASET.season == "2003/2004"


def test_normalize_season_name_case_insensitive():
    available = ["2020/2021", "2019/2020"]
    assert normalize_season_name("2020/2021", available) == "2020/2021"
    assert normalize_season_name(" 2020/2021 ", available) == "2020/2021"
    assert normalize_season_name("missing", available) is None


@patch("etl.resolve.fetch_json")
@patch("etl.resolve.get_available_seasons")
def test_resolve_statsbomb_competition_season(mock_seasons, mock_fetch):
    mock_seasons.return_value = ["2003/2004", "2015/2016"]
    mock_fetch.return_value = [
        {
            "competition_id": 2,
            "season_id": 44,
            "competition_name": "Premier League",
            "season_name": "2003/2004",
            "competition_gender": "male",
        }
    ]

    comp_id, season_id, matched = resolve_statsbomb_competition_season(
        "Premier League",
        "2003/2004",
    )

    assert comp_id == 2
    assert season_id == 44
    assert matched == "2003/2004"


@patch("etl.resolve.get_available_seasons")
def test_resolve_statsbomb_unknown_season_raises(mock_seasons):
    mock_seasons.return_value = ["2003/2004"]
    with pytest.raises(ValueError, match="not found"):
        resolve_statsbomb_competition_season("Premier League", "2099/2100")