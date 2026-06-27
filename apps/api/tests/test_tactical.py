from analytics.tactical import (
    is_counter_pattern,
    is_final_third_location,
    is_set_piece_pattern,
    play_pattern_name,
)


def test_play_pattern_name_from_details():
    details = {"play_pattern": {"name": "From Corner"}}
    assert play_pattern_name(details) == "From Corner"


def test_play_pattern_name_missing():
    assert play_pattern_name(None) is None
    assert play_pattern_name({"play_pattern": "invalid"}) is None


def test_set_piece_and_counter_patterns():
    assert is_set_piece_pattern("From Free Kick") is True
    assert is_set_piece_pattern("Regular Play") is False
    assert is_counter_pattern("From Counter") is True
    assert is_counter_pattern("Regular Play") is False


def test_final_third_boundaries():
    assert is_final_third_location(40) is True
    assert is_final_third_location(80) is True
    assert is_final_third_location(60) is False
    assert is_final_third_location(None) is False