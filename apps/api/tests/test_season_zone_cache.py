"""Tests for season zone TTL cache."""

import time

from core.season_zone_cache import SeasonScopeCache, clear_season_zone_caches


def test_scope_key_is_stable_for_match_id_order():
    key_a = SeasonScopeCache.scope_key("zones", "La Liga", "2020/2021", [3, 1, 2])
    key_b = SeasonScopeCache.scope_key("zones", "La Liga", "2020/2021", [1, 2, 3])
    assert key_a == key_b


def test_scope_key_differs_when_match_scope_changes():
    full = SeasonScopeCache.scope_key("zones", "La Liga", "2020/2021", [1, 2])
    partial = SeasonScopeCache.scope_key("zones", "La Liga", "2020/2021", [1])
    assert full != partial


def test_cache_expires_after_ttl(monkeypatch):
    clear_season_zone_caches()
    cache: SeasonScopeCache[str] = SeasonScopeCache(ttl_seconds=1)
    key = "test:key"

    now = 1000.0
    monkeypatch.setattr(time, "monotonic", lambda: now)
    cache.set(key, "payload")
    assert cache.get(key) == "payload"

    monkeypatch.setattr(time, "monotonic", lambda: now + 1.1)
    assert cache.get(key) is None