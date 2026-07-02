from routers import summary as summary_module


def test_normalize_rpc_row_list():
    assert summary_module._normalize_rpc_row([{"total_matches": 3}]) == {
        "total_matches": 3,
    }


def test_build_summary_prefers_workspace_rpc(monkeypatch):
    calls: list[str] = []

    class FakeClient:
        def rpc(self, name, _params=None):
            calls.append(name)

            class R:
                def execute(self):
                    if name == "workspace_report_snapshot":
                        return type(
                            "E",
                            (),
                            {
                                "data": {
                                    "total_matches": 73,
                                    "total_events": 134492,
                                },
                            },
                        )()
                    raise RuntimeError("should not reach data_summary")

            return R()

    out = summary_module._build_summary(FakeClient(), has_user_token=True)

    assert calls == ["workspace_report_snapshot"]
    assert out["total_matches"] == 73
    assert out["total_events"] == 134492


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
    total = summary_module._count_events_for_matches(FakeClient(), [1, 2, 3, 4, 5])

    assert total == 50
    assert calls == [[1, 2], [3, 4], [5]]