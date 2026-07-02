import pytest

from etl.preflight import EtlPreflightError, verify_events_upsert_ready


def test_preflight_raises_when_column_missing(monkeypatch):
    class FakeTable:
        def select(self, *_args, **_kwargs):
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def execute(self):
            raise RuntimeError("column events.statsbomb_event_id does not exist")

    class FakeClient:
        def table(self, name):
            assert name == "events"
            return FakeTable()

    monkeypatch.setattr(
        "etl.preflight.get_supabase_service_client",
        lambda: FakeClient(),
    )

    with pytest.raises(EtlPreflightError, match="statsbomb_event_id column is missing"):
        verify_events_upsert_ready()


def test_preflight_raises_on_42p10(monkeypatch):
    class FakeNot:
        def __init__(self, table):
            self.table = table

        def is_(self, *_args, **_kwargs):
            return self.table

    class FakeTable:
        def __init__(self, name):
            self.name = name
            self.not_ = FakeNot(self)
            self._mode = None

        def select(self, *_args, **_kwargs):
            self._mode = "select"
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def upsert(self, *_args, **_kwargs):
            self._mode = "upsert"
            return self

        def execute(self):
            if self.name == "events" and self._mode == "select":
                return type("R", (), {"data": [{"statsbomb_event_id": None}]})()
            if self.name == "matches" and self._mode == "select":
                return type("R", (), {"data": [{"id": 1}]})()
            if self.name == "events" and self._mode == "upsert":
                raise RuntimeError(
                    "{'code': '42P10', 'message': 'there is no unique or exclusion constraint "
                    "matching the ON CONFLICT specification'}"
                )
            raise AssertionError(f"unexpected execute: {self.name} {self._mode}")

    class FakeClient:
        def table(self, name):
            return FakeTable(name)

    monkeypatch.setattr(
        "etl.preflight.get_supabase_service_client",
        lambda: FakeClient(),
    )

    with pytest.raises(EtlPreflightError, match="42P10"):
        verify_events_upsert_ready()