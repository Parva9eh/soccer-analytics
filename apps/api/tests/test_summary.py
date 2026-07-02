from routers import summary as summary_module


def test_count_events_for_matches_chunks(monkeypatch):
    calls: list[list[int]] = []

    class FakeQuery:
        def __init__(self):
            self.values: list[int] = []

        def select(self, *_args, **_kwargs):
            return self

        def in_(self, _column, values):
            self.values = list(values)
            calls.append(self.values)
            return self

        def execute(self):
            return type("R", (), {"count": len(self.values) * 10})()

    class FakeClient:
        def table(self, name):
            assert name == "events"
            return FakeQuery()

    monkeypatch.setattr(summary_module, "_EVENT_COUNT_CHUNK", 2)
    match_ids = [1, 2, 3, 4, 5]

    total = summary_module._count_events_for_matches(FakeClient(), match_ids)

    assert total == 50
    assert calls == [[1, 2], [3, 4], [5]]


def test_accessible_match_ids_single_fetch():
    class FakeQuery:
        def select(self, *_args, **_kwargs):
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def execute(self):
            return type(
                "R",
                (),
                {"data": [{"id": 1}, {"id": 2}, {"id": None}, {}]},
            )()

    class FakeClient:
        def table(self, name):
            assert name == "matches"
            return FakeQuery()

    ids = summary_module._accessible_match_ids(FakeClient())

    assert ids == [1, 2]