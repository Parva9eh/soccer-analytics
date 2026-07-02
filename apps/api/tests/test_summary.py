from routers import summary as summary_module


def test_normalize_rpc_row_list():
    assert summary_module._normalize_rpc_row([{"total_matches": 3}]) == {
        "total_matches": 3,
    }


def test_build_summary_prefers_data_snapshot_rpc():
    calls: list[str] = []

    class FakeClient:
        def rpc(self, name, _params=None):
            calls.append(name)

            class R:
                def execute(self):
                    if name == "data_summary_snapshot":
                        return type(
                            "E",
                            (),
                            {
                                "data": {
                                    "total_matches": 73,
                                    "total_events": 134492,
                                    "total_players": 915,
                                    "status": "healthy",
                                },
                            },
                        )()
                    raise RuntimeError(f"unexpected rpc: {name}")

            return R()

    out = summary_module._build_summary(FakeClient())

    assert calls == ["data_summary_snapshot"]
    assert out["total_matches"] == 73
    assert out["total_events"] == 134492
    assert out["total_players"] == 915


def test_build_summary_falls_back_to_match_chunks(monkeypatch):
    calls: list[str] = []

    class FakeRpc:
        def execute(self):
            raise RuntimeError("rpc missing")

    class FakeClient:
        def rpc(self, name, _params=None):
            calls.append(name)
            return FakeRpc()

        def table(self, name):
            if name == "matches":
                return self._matches_query()
            if name == "events":
                return self._events_query()
            if name == "players":
                return self._players_query()
            raise AssertionError(name)

        def _matches_query(self):
            class Q:
                def select(self, *_args, **_kwargs):
                    return self

                def limit(self, _n):
                    return self

                def execute(self):
                    return type("R", (), {"data": [{"id": 1}, {"id": 2}]})()

            return Q()

        def _events_query(self):
            class Q:
                def select(self, *_args, **_kwargs):
                    return self

                def in_(self, _column, values):
                    self.values = list(values)
                    return self

                def execute(self):
                    return type("R", (), {"count": len(self.values) * 10})()

            return Q()

        def _players_query(self):
            class Q:
                def select(self, *_args, **_kwargs):
                    return self

                def limit(self, _n):
                    return self

                def execute(self):
                    return type("R", (), {"count": 5})()

            return Q()

    out = summary_module._build_summary(FakeClient())

    assert calls == ["data_summary_snapshot"]
    assert out == {
        "total_matches": 2,
        "total_events": 20,
        "total_players": 5,
        "status": "healthy",
    }