"""Lightweight Supabase client mock for API integration tests."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any


@dataclass
class MockExecuteResult:
    data: list[dict[str, Any]]
    count: int | None = None


class _NotProxy:
    def __init__(self, builder: "_QueryBuilder") -> None:
        self._builder = builder

    def is_(self, column: str, value: str) -> "_QueryBuilder":
        if value == "null":
            self._builder._not_null.add(column)
        return self._builder


class _QueryBuilder:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._source = rows
        self._eq: dict[str, Any] = {}
        self._in: dict[str, list[Any]] = {}
        self._not_null: set[str] = set()
        self._limit: int | None = None
        self._order: str | None = None
        self._range: tuple[int, int] | None = None
        self._count_exact = False

    @property
    def not_(self) -> _NotProxy:
        return _NotProxy(self)

    def select(self, *columns: str, count: str | None = None) -> "_QueryBuilder":
        if count == "exact":
            self._count_exact = True
        return self

    def eq(self, column: str, value: Any) -> "_QueryBuilder":
        self._eq[column] = value
        return self

    def in_(self, column: str, values: list[Any]) -> "_QueryBuilder":
        self._in[column] = values
        return self

    def limit(self, value: int) -> "_QueryBuilder":
        self._limit = value
        return self

    def order(self, column: str) -> "_QueryBuilder":
        self._order = column
        return self

    def range(self, start: int, end: int) -> "_QueryBuilder":
        self._range = (start, end)
        return self

    def execute(self) -> MockExecuteResult:
        rows = [deepcopy(row) for row in self._source]

        for column, value in self._eq.items():
            rows = [row for row in rows if row.get(column) == value]

        for column, values in self._in.items():
            rows = [row for row in rows if row.get(column) in values]

        for column in self._not_null:
            rows = [
                row
                for row in rows
                if row.get(column) is not None
            ]

        if self._order:
            rows = sorted(rows, key=lambda row: row.get(self._order) or "")

        total = len(rows)

        if self._range is not None:
            start, end = self._range
            rows = rows[start : end + 1]

        if self._limit is not None:
            rows = rows[: self._limit]

        if self._count_exact:
            return MockExecuteResult(data=rows, count=total)

        return MockExecuteResult(data=rows)


class MockSupabaseClient:
    def __init__(self, tables: dict[str, list[dict[str, Any]]]) -> None:
        self._tables = tables

    def table(self, name: str) -> _QueryBuilder:
        return _QueryBuilder(self._tables.get(name, []))


def demo_fixture() -> dict[str, list[dict[str, Any]]]:
    """Minimal La Liga 2020/21-shaped dataset for integration tests."""
    return {
        "competitions": [{"id": 1, "name": "La Liga"}],
        "seasons": [{"id": 10, "competition_id": 1, "year": "2020/2021"}],
        "teams": [
            {"id": 100, "name": "Barcelona"},
            {"id": 101, "name": "Real Madrid"},
        ],
        "matches": [
            {
                "id": 1000,
                "match_date": "2020-10-01",
                "home_score": 2,
                "away_score": 1,
                "match_week": 1,
                "home_team_id": 100,
                "away_team_id": 101,
                "competition_id": 1,
                "season_id": 10,
                "home_team": {"name": "Barcelona"},
                "away_team": {"name": "Real Madrid"},
            }
        ],
        "events": [
            {
                "match_id": 1000,
                "x": 80.0,
                "y": 40.0,
                "details": {"team": {"name": "Barcelona"}},
            },
            {
                "match_id": 1000,
                "x": 20.0,
                "y": 50.0,
                "details": {"team": {"name": "Real Madrid"}},
            },
            {
                "match_id": 1000,
                "x": 55.0,
                "y": 45.0,
                "details": {"team": {"name": "Barcelona"}},
            },
        ],
    }