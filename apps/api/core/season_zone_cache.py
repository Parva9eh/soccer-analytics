"""TTL cache for season-scoped zone aggregates (RLS-safe per match-id scope)."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

T = TypeVar("T")

_DEFAULT_TTL_SECONDS = 300


@dataclass
class _CacheEntry(Generic[T]):
    expires_at: float
    value: T


class SeasonScopeCache(Generic[T]):
    """In-memory cache keyed by competition, season, and accessible match ids."""

    def __init__(self, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> None:
        self._ttl_seconds = ttl_seconds
        self._entries: dict[str, _CacheEntry[T]] = {}

    @staticmethod
    def scope_key(prefix: str, competition: str, season: str, match_ids: list[int]) -> str:
        digest = hashlib.sha256(
            ",".join(str(match_id) for match_id in sorted(match_ids)).encode()
        ).hexdigest()[:16]
        return f"{prefix}:{competition}:{season}:{digest}"

    def get(self, key: str) -> T | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if time.monotonic() >= entry.expires_at:
            del self._entries[key]
            return None
        return entry.value

    def set(self, key: str, value: T) -> None:
        self._entries[key] = _CacheEntry(
            expires_at=time.monotonic() + self._ttl_seconds,
            value=value,
        )

    def clear(self) -> None:
        self._entries.clear()


_season_zones_cache: SeasonScopeCache[list[dict[str, Any]]] = SeasonScopeCache()
_positioned_events_cache: SeasonScopeCache[list[dict[str, Any]]] = SeasonScopeCache()


def get_cached_season_zones(key: str) -> list[dict[str, Any]] | None:
    return _season_zones_cache.get(key)


def set_cached_season_zones(key: str, teams: list[dict[str, Any]]) -> None:
    _season_zones_cache.set(key, teams)


def get_cached_positioned_events(key: str) -> list[dict[str, Any]] | None:
    return _positioned_events_cache.get(key)


def set_cached_positioned_events(key: str, rows: list[dict[str, Any]]) -> None:
    _positioned_events_cache.set(key, rows)


def clear_season_zone_caches() -> None:
    _season_zones_cache.clear()
    _positioned_events_cache.clear()