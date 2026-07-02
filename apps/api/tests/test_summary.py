from postgrest.exceptions import APIError as PostgrestAPIError

from routers import summary as summary_module


def test_normalize_rpc_row_list():
    assert summary_module._normalize_rpc_row([{"total_matches": 3}]) == {
        "total_matches": 3,
    }


def test_summary_from_data_snapshot_parses_rpc_row():
    class FakeClient:
        def rpc(self, name, _params=None):
            assert name == "data_summary_snapshot"

            class R:
                def execute(self):
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

            return R()

    out = summary_module._summary_from_data_snapshot(FakeClient())
    assert out["total_matches"] == 73
    assert out["total_events"] == 134492
    assert out["total_players"] == 915


def test_is_missing_rpc_error_detects_postgrest_code():
    exc = PostgrestAPIError({"message": "function missing", "code": "PGRST202"})
    assert summary_module._is_missing_rpc_error(exc) is True


def test_is_missing_rpc_error_detects_sql_message():
    assert (
        summary_module._is_missing_rpc_error(
            RuntimeError("function public.data_summary_snapshot() does not exist")
        )
        is True
    )