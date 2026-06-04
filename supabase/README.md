# Supabase — migrations & auth

Versioned SQL for schema and Row Level Security (Phase 3.2+) lives under `migrations/`.

## Auth setup (Phase 3.1)

1. In the [Supabase dashboard](https://supabase.com/dashboard), enable **Email** provider under Authentication → Providers.
2. Copy project URL, anon key, service role key, and **JWT Secret** (Settings → API) into:
   - `apps/web/.env.local` — see `apps/web/.env.example`
   - `apps/api/.env` — see `apps/api/.env.example`
3. In Supabase → Authentication → URL configuration, set:
   - **Site URL:** `http://localhost:3000` (dev)
   - **Redirect URLs:** `http://localhost:3000/auth/callback`

## Enabling auth locally

**Web** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**API** (`apps/api/.env`):

```env
REQUIRE_AUTH=true
SUPABASE_JWT_SECRET=your-jwt-secret
```

With both flags on, the app redirects unauthenticated users to `/login`, `apiFetch` sends the Supabase access token, and the API uses an RLS-scoped anon client.

Leave flags `false` (default) to keep the Phase 2 open-API developer workflow.

## Migrations (Phase 3.2)

Migration `20250604120000_rls_authenticated_read.sql` enables RLS and grants **SELECT** to the `authenticated` role on:

`competitions`, `seasons`, `teams`, `matches`, `events`, `players`

ETL and admin scripts continue to use the **service role** (bypasses RLS).

### Apply via Supabase CLI

```bash
supabase link --project-ref <ref>
supabase db push
```

### Apply via SQL Editor

Copy the migration file into Supabase → SQL → New query → Run.

### Verify RLS

1. Enable auth flags (see above) and sign in on the web app.
2. Open browser DevTools → Network → any API request → confirm `Authorization: Bearer …`.
3. `curl -H "Authorization: Bearer <token>" http://localhost:8000/matches/` should return data.
4. Without a token and `REQUIRE_AUTH=true`, the API should return **401**.

```sql
-- Dashboard check: policies attached
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```