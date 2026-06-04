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

Apply with the Supabase CLI when policies are added:

```bash
supabase link --project-ref <ref>
supabase db push
```

Until RLS policies exist, `REQUIRE_AUTH=true` may return empty result sets for anon users — plan policies before enforcing auth in production.