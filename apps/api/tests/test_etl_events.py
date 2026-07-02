from etl.events import _event_row


def test_event_row_includes_statsbomb_event_id():
    row = _event_row(
        71,
        {
            "id": "d78142c2-54c8-48fd-8346-67ab75d01a5e",
            "minute": 0,
            "second": 0,
            "type": {"name": "Pass"},
            "location": [60.0, 40.0],
        },
    )
    assert row is not None
    assert row["statsbomb_event_id"] == "d78142c2-54c8-48fd-8346-67ab75d01a5e"
    assert row["match_id"] == 71
    assert row["event_type"] == "Pass"


def test_event_row_returns_none_without_statsbomb_id():
    assert _event_row(1, {"minute": 1, "type": {"name": "Pass"}}) is None