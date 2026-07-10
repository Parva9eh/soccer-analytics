"""Ensure user JWT is never applied on a shared singleton client."""

from core.supabase_client import client_with_user_jwt, get_supabase_anon_client


def _authorization(client) -> str:
    headers = client.postgrest.headers
    return str(headers.get("authorization") or headers.get("Authorization") or "")


def test_user_jwt_clients_are_isolated_instances():
    a = client_with_user_jwt("token-user-a")
    b = client_with_user_jwt("token-user-b")
    guest = get_supabase_anon_client()

    assert a is not b
    assert a is not guest
    assert b is not guest

    assert _authorization(a) == "Bearer token-user-a"
    assert _authorization(b) == "Bearer token-user-b"

    guest_auth = _authorization(guest)
    assert "token-user-a" not in guest_auth
    assert "token-user-b" not in guest_auth


def test_guest_clients_are_not_shared_after_user_client():
    user = client_with_user_jwt("token-user-a")
    guest1 = get_supabase_anon_client()
    guest2 = get_supabase_anon_client()

    assert user is not guest1
    assert guest1 is not guest2
