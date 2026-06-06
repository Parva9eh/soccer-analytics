# Supabase — migrations & auth

Versioned SQL for schema and Row Level Security (Phase 3.2+) lives under `migrations/`.

## Auth setup (Phase 3.1)

1. In the [Supabase dashboard](https://supabase.com/dashboard), enable **Email** provider under Authentication → Providers.
2. Copy project URL, anon key, service role key, and **JWT Secret** (Settings → API) into:
   - `apps/web/.env.local` — see `apps/web/.env.example`
   - `apps/api/.env` — see `apps/api/.env.example`
3. In Supabase → Authentication → URL configuration, set:
   - **Site URL:** `http://localhost:3000` (dev)
   - **Redirect URLs:** `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`
4. In Supabase → Authentication → **Email templates** → **Confirm signup**, replace the confirmation link with the SSR-friendly template (required for invite signup):

   ```html
   <h2>Confirm your email</h2>
   <p>
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}">
       Confirm your email
     </a>
   </p>
   ```

   The app sets `emailRedirectTo` to the final destination (e.g. `/invitations/accept?token=…`). After confirmation, Supabase sends the user there with a signed-in session.

## OAuth (Google / GitHub)

The login page offers Google and GitHub buttons. Each provider must be **enabled in Supabase** and configured with OAuth credentials. If a provider is off, Supabase returns:

`Unsupported provider: provider is not enabled`

### Google

Full step-by-step: [PLAN.md § Google OAuth setup](../PLAN.md#google-oauth-setup-supabase-auth).

Summary:

1. Supabase → URL configuration (`http://localhost:3000`, `http://localhost:3000/auth/callback`).
2. Supabase → Providers → Google → Enable; copy **Callback URL**.
3. Google Cloud → OAuth client (Web): origins = `http://localhost:3000`; redirect URI = Supabase callback URL.
4. Paste Client ID/secret into Supabase → Save → test `/login`.

### GitHub

1. **GitHub** → Settings → Developer settings → [OAuth Apps](https://github.com/settings/developers) → New OAuth App.
   - **Authorization callback URL:** same Supabase callback URL as Google (`https://<project-ref>.supabase.co/auth/v1/callback`).
2. **Supabase** → Authentication → **Providers** → **GitHub** → Enable.
   - Paste **Client ID** and **Client Secret** from GitHub.
3. Save and retry.

Email/password works without OAuth setup. OAuth is optional on the free tier (subject to auth MAU limits).

**Production:** See [PLAN.md — Before production deploy](../PLAN.md#before-production-deploy-auth--oauth) (Supabase Site URL + redirect URLs, matching Google/GitHub app origins, JWT secret and keys from the same project).

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

Apply migrations **in filename order**:

| Migration | Purpose |
|-----------|---------|
| `20250604120000_rls_authenticated_read.sql` | RLS read on app data tables |
| `20250604130000_profiles.sql` | Profiles + signup trigger |
| `20250604140000_workspaces.sql` | Workspaces, members, roles |
| `20250604150000_profiles_workspace_peers.sql` | Peers can view profiles in shared workspaces |
| `20250604160000_profiles_active_workspace.sql` | `profiles.active_workspace_id` preference |
| `20250604170000_fix_workspace_rls_recursion.sql` | Fix workspace RLS infinite recursion on empty lists |
| `20250604180000_workspace_invitations.sql` | Email invitations with shareable token links |
| `20250604190000_workspaces_create_policy_fix.sql` | Let creators read/insert workspaces (fixes Google OAuth create) |
| `20250604200000_workspace_create_rpc.sql` | **Required for create** — RPC + table grants for `authenticated` |
| `20250604210000_fix_create_workspace_ambiguous_id.sql` | Fix `column reference "id" is ambiguous` on create RPC |
| `20250604220000_accept_workspace_invitation_rpc.sql` | **Required for accept** — RPC for invitees joining workspace |
| `20250604230000_workspace_datasets.sql` | **Required for scoped data** — link workspaces to competition/season + RLS |
| `20250604240000_workspace_create_seed_dataset.sql` | Seed default dataset when creating a workspace |
| `20250604250000_fix_seed_dataset_ambiguous_season_id.sql` | Fix ambiguous `season_id` in seed RPC (if `20250604230000` failed) |
| `20250604251000_fix_user_can_access_match_bigint.sql` | Fix `user_can_access_match` for bigint `matches.id` (if RLS policies fail) |
| `20250604252000_workspace_datasets_apply.sql` | **One-shot apply** — full datasets setup if earlier migrations failed partway |

**Workspace create failing?** Run `20250604200000_workspace_create_rpc.sql`, then `20250604210000_fix_create_workspace_ambiguous_id.sql` if you see an ambiguous `id` error. Restart the API after running migrations.

**Workspace datasets migrations failing?** Skip the patch files and run **`20250604252000_workspace_datasets_apply.sql`** once, then `20250604240000_workspace_create_seed_dataset.sql`.

### App data read access

`20250604120000_rls_authenticated_read.sql` enables RLS and grants **SELECT** to the `authenticated` role on:

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