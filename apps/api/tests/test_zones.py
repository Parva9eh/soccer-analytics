from analytics.zones import (
    aggregate_team_heatmap,
    aggregate_team_zones,
    heatmap_bin,
    pitch_zone_from_x,
)


def _team_details(team_name: str) -> dict:
    return {"team": {"name": team_name}}


def test_pitch_zone_from_x():
    assert pitch_zone_from_x(10) == "left_third"
    assert pitch_zone_from_x(50) == "middle_third"
    assert pitch_zone_from_x(100) == "right_third"
    assert pitch_zone_from_x(None) is None


def test_heatmap_bin_corners():
    assert heatmap_bin(0, 0) == (0, 0)
    assert heatmap_bin(119.9, 79.9)[0] == 11
    assert heatmap_bin(119.9, 79.9)[1] == 7


def test_aggregate_team_zones():
    rows = [
        {"x": 10, "details": _team_details("Home FC")},
        {"x": 50, "details": _team_details("Home FC")},
        {"x": 90, "details": _team_details("Away FC")},
        {"x": 90, "y": 40, "details": _team_details("Away FC")},
    ]
    counts = aggregate_team_zones(rows)
    assert counts["Home FC"]["left_third"] == 1
    assert counts["Home FC"]["middle_third"] == 1
    assert counts["Home FC"]["total_events"] == 2
    assert counts["Away FC"]["right_third"] == 2


def test_aggregate_team_heatmap_filters_team():
    rows = [
        {"x": 60, "y": 40, "details": _team_details("Home FC")},
        {"x": 62, "y": 41, "details": _team_details("Home FC")},
        {"x": 80, "y": 20, "details": _team_details("Away FC")},
    ]
    bins, total = aggregate_team_heatmap(rows, "Home FC")
    assert total == 2
    assert sum(bins.values()) == 2