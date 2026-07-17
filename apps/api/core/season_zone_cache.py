"""TTL + LRU cache for season-scoped zone aggregates (not raw event lists)."""

from __future__ import annotations

import hashlib
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from core.config import get_settings

T = TypeVar("T")

_DEFAULT_TTL_SECONDS = 300
_DEFAULT_MAX_ENTRIES = 64


@dataclass
class _CacheEntry(Generic[T]):
    expires_at: float
    value: T


class SeasonScopeCache(Generic[T]):
    """In-memory LRU cache keyed by competition, season, and accessible match ids."""

    def __init__(
        self,
        ttl_seconds: int | None = None,
        max_entries: int = _DEFAULT_MAX_ENTRIES,
    ) -> None:
        if ttl_seconds is None:
            try:
                ttl_seconds = int(get_settings().SEASON_ZONE_CACHE_TTL_SECONDS)
            except Exception:
                ttl_seconds = _DEFAULT_TTL_SECONDS
        self._ttl_seconds = max(1, ttl_seconds)
        self._max_entries = max(1, max_entries)
        self._entries: OrderedDict[str, _CacheEntry[T]] = OrderedDict()

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
        self._entries.move_to_end(key)
        return entry.value

    def set(self, key: str, value: T) -> None:
        if key in self._entries:
            del self._entries[key]
        self._entries[key] = _CacheEntry(
            expires_at=time.monotonic() + self._ttl_seconds,
            value=value,
        )
        while len(self._entries) > self._max_entries:
            self._entries.popitem(last=False)

    def clear(self) -> None:
        self._entries.clear()


def _build_zones_cache() -> SeasonScopeCache[list[dict[str, Any]]]:
    return SeasonScopeCache()


_season_zones_cache: SeasonScopeCache[list[dict[str, Any]]] = _build_zones_cache()


def get_cached_season_zones(key: str) -> list[dict[str, Any]] | None:
    return _season_zones_cache.get(key)


def set_cached_season_zones(key: str, teams: list[dict[str, Any]]) -> None:
    _season_zones_cache.set(key, teams)


def clear_season_zone_caches() -> None:
    _season_zones_cache.clear()


def reset_season_zone_caches_from_settings() -> None:
    """Rebuild caches after settings change (tests)."""
    global _season_zones_cache
    _season_zones_cache = _build_zones_cache()
