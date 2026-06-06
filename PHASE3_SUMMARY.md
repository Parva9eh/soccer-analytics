# Phase 3: Authentication, Authorization & Collaboration Summary

**Branch:** `phase3/auth-foundation`  
**Status:** Complete  
**Date:** June 2026

## Purpose

Phase 3 turned the platform from an open local-dev API into a production-oriented multi-user system: Supabase Auth, Row Level Security, workspaces with invitations, workspace-scoped match data, private saved match views, workspace dashboards with CSV export, and guest read-only browsing when auth is enabled.

The stack supports two developer modes:

| Mode | Web | API | Who can use the app |
|------|-----|-----|---------------------|
| **Local open** | `NEXT_PUBLIC_AUTH_ENABLED=false` | `REQUIRE_AUTH=false` | Everyone; service-role reads |
| **Auth enabled** | `NEXT_PUBLIC_AUTH_ENABLED=true` | `REQUIRE_AUTH=true` | Guests browse demo data; signed-in users get full collaboration |

---

## 1. Authentication (Phase 3.1)

### Web

| Deliverable | Detail |
|-------------|--------|
| Supabase Auth | Email/password signup and login |
| OAuth | Google and GitHub on login/signup (`OAuthButtons`) |
| Routes | `/login`, `/signup`, `/auth/callback`, `/auth/confirm` |
| Session | `@supabase/ssr` cookie handling; Next.js `proxy.ts` refreshes session |
| Route guard | `AuthGate` + server proxy; collaboration routes require session when auth is on |
| Guest browsing | Explore routes (`/`, `/matches`, `/players`, `/analytics`) work without sign-in when auth is enabled |
| `apiFetch` | Attaches `Authorization: Bearer` when a session exists |
| Auth layout | Dedicated `(auth)` route group (no sidebar) |
| Sidebar user | Account label + sign-out when signed in; **Sign in** link for guests |

### Email confirmation & invitations

- Signup from an invite uses `emailRedirectTo` → `/invitations/accept?token=...`
- Confirm flow uses **`/auth/confirm`** with `verifyOtp` (not PKCE-only `/auth/callback`)
- Supabase email template uses `token_hash` + `next={{ .RedirectTo }}`
- Redirect URLs in Supabase must include `/auth/callback` and **`/auth/confirm`**

### API

| Endpoint | Purpose |
|----------|---------|
| `GET /auth/me` | Current user id, email, display name, `active_workspace_id` |
| `PATCH /auth/me` | Update profile fields and active workspace |

- JWT validation via `SUPABASE_JWT_SECRET` (HS256) and JWKS (OAuth)
- `get_user_supabase` — anon client + user JWT (RLS enforced)
- `get_supabase_public_read` — user JWT if present, else anon client (guest reads)

### Flags

- **`NEXT_PUBLIC_AUTH_ENABLED`** (web) — enables auth UI, session proxy, and collaboration routes
- **`REQUIRE_AUTH`** (API) — collaboration endpoints require Bearer token; read routes accept anonymous anon-key requests

---

## 2. RLS & Schema (Phase 3.2)

### Core tables

| Table / object | Purpose |
|----------------|---------|
| `profiles` | User profile; signup trigger; `active_workspace_id` |
| `workspaces` | Team/org container |
| `workspace_members` | Membership with `admin` / `member` roles |
| `workspace_invitations` | Pending invites with shareable token |
| `workspace_datasets` | Links workspace → `(competition_id, season_id)` |
| `saved_analyses` | Private per-user match view config (JSONB) |
| `workspace_reports` | Private per-user dashboard snapshots (JSONB) |

### RLS model

**Authenticated users**

- App data (`competitions`, `seasons`, `teams`, `matches`, `events`) scoped to **active workspace datasets** via `effective_active_workspace_id()` and `user_can_access_match(bigint)`
- `players` — global read (not yet workspace-filtered)
- Workspace tables — member/admin policies; creator and peer visibility on profiles
- Saved analyses & reports — creator-only CRUD within member workspaces

**Anonymous guests** (`20250604280000_anon_public_read.sql`)

- Read-only access to **La Liga 2020/21** demo dataset
- Used when auth is enabled but the user has not signed in

### Key SQL functions

| Function | Role |
|----------|------|
| `create_workspace_for_user` | Create workspace; creator becomes admin; seeds default dataset |
| `accept_workspace_invitation` | Join workspace from invite token |
| `seed_default_workspace_dataset` | Link La Liga 2020/21 on new workspace |
| `effective_active_workspace_id` | Resolve active workspace from profile or first membership |
| `user_can_access_match` | RLS helper for match/event access |
| `workspace_report_snapshot` | Aggregate dashboard metrics for active workspace |

### Migration fixes (iterative)

Several patch migrations address partial applies and SQL ambiguity (`season_id`, `id`, `bigint` match ids). Canonical one-shot: **`20250604252000_workspace_datasets_apply.sql`**.

Full migration list: [supabase/README.md](./supabase/README.md).

---

## 3. Workspaces & Invitations (Phase 3.3a)

### API

| Endpoint | Purpose |
|----------|---------|
| `GET /workspaces/` | List workspaces for current user |
| `POST /workspaces/` | Create workspace (RPC) |
| `GET /workspaces/{id}` | Workspace detail + members |
| `GET /workspaces/{id}/datasets` | List linked competition/season pairs |
| `POST /workspaces/{id}/datasets` | Link dataset (admin) |
| `DELETE /workspaces/{id}/datasets` | Unlink dataset (admin) |
| `GET /workspaces/{id}/invitations` | List pending invites (admin) |
| `POST /workspaces/{id}/invitations` | Create invite + shareable link |
| `DELETE /workspaces/{id}/invitations/{invitation_id}` | Revoke invite |
| `POST /workspaces/invitations/accept` | Accept invite by token |

### Web

| Route | Behavior |
|-------|----------|
| `/settings` | List workspaces, create workspace |
| `/settings/workspaces/[id]` | Manage workspace: members, invitations, **Data access** (admin) |
| `/invitations/accept` | Accept flow; preserves token through signup/login |
| Sidebar | Workspace switcher in footer; sets active workspace via `PATCH /auth/me` |

### Roles

- **Admin** — invite/revoke members, manage datasets
- **Member** — use workspace data; cannot manage invites or datasets
- Any authenticated user can **create** a workspace (becomes admin)

---

## 4. Workspace-Scoped Data (Phase 3.3b)

- `workspace_datasets` links competition/season pairs to a workspace
- New workspaces auto-seed **La Liga 2020/21** (when present in DB)
- `GET /competitions/` catalog reflects linked datasets for signed-in users
- Matches, events, and summary counts follow active workspace scope
- **Empty workspace UX** — no hardcoded La Liga fallback; UI resets to first linked dataset or shows clear empty states
- Players remain global across workspaces (noted in dashboard/analytics copy)

---

## 5. Saved Match Views (Phase 3.3c)

Previously labeled “Saved analyses” in UI; nav item renamed to **Match views**.

### API (`/analyses`)

| Endpoint | Purpose |
|----------|---------|
| `GET /analyses/` | List saved views for current user in active workspace |
| `POST /analyses/` | Save view (match id, filters, pitch layers, 2D/3D config) |
| `GET /analyses/{id}` | Fetch one saved view |
| `PATCH /analyses/{id}` | Update title, notes, or config |
| `DELETE /analyses/{id}` | Delete saved view |

### Web

| Route / UI | Behavior |
|------------|----------|
| `/analyses` | **Match views** list (private to creator) |
| Match detail | **Save view** dialog; restore via `/matches/{id}?saved={analysis_id}` |
| RLS | Creator-only; must be workspace member |

---

## 6. Reports & Dashboards (Phase 3.3d)

### API (`/reports`)

| Endpoint | Purpose |
|----------|---------|
| `GET /reports/dashboard` | Live metrics (`competition`, `season` optional) |
| `GET /reports/` | List saved reports |
| `POST /reports/` | Save snapshot of current dashboard |
| `GET /reports/{id}` | Fetch saved report |
| `GET /reports/{id}/export` | Download CSV |
| `DELETE /reports/{id}` | Delete saved report |

### Web

| Route | Behavior |
|-------|----------|
| `/analytics` (signed in) | Live workspace dashboard: scope (single season vs all linked datasets), KPI cards, event-type bars, matchweek chart, **Save report** |
| `/analytics` (guest) | Summary KPIs for demo dataset + Phase 4 roadmap cards |
| `/reports` | Saved snapshots: view, CSV export, delete |
| `/reports/[id]` | Frozen snapshot detail |

### CSV export

Includes summary stats, event types, matches by week, and linked datasets.

---

## 7. Navigation & UX Polish

### Sidebar (auth enabled)

```
Explore     → Dashboard, Matches, Players, Analytics
Library     → Reports, Match views        (signed-in only)
─────────
Workspaces  → Settings                    (signed-in only)
```

### Guest experience (auth on, not signed in)

- **Guest banner** — “Browsing as guest — La Liga 2020/21 demo data”
- **`/login`** — **Continue browsing without signing in** always visible
- Explore nav only; Library and Workspaces hidden until sign-in

### Auth-off local dev

- Flat Explore nav; optional **Sign in** link in sidebar footer
- Auth pages note that auth is optional and link back to the app

---

## 8. Migrations to Apply (hosted Supabase)

Apply **in filename order**. If workspace datasets failed partway, run the one-shot apply migration instead of individual patches.

**Minimum path for a fresh hosted project:**

1. `20250604120000` through `20250604220000` — profiles, workspaces, invitations, RPCs
2. `20250604252000_workspace_datasets_apply.sql` — datasets + scoped RLS (or incremental `20250604230000` + patches)
3. `20250604240000_workspace_create_seed_dataset.sql`
4. `20250604260000_saved_analyses.sql`
5. `20250604270000_workspace_reports.sql`
6. `20250604280000_anon_public_read.sql` — guest browsing

Restart the API after applying SQL.

---

## 9. Environment (auth enabled)

**Web (`apps/web/.env.local`)**

```bash
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**API (`apps/api/.env`)**

```bash
REQUIRE_AUTH=true
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
WEB_APP_URL=http://localhost:3000
```

**Supabase → Authentication → URL configuration**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`

OAuth setup: [supabase/README.md](./supabase/README.md) and [PLAN.md](./PLAN.md#google-oauth-setup-supabase-auth).

---

## 10. Merge to `main`

```bash
git checkout main
git pull origin main
git merge --no-ff phase3/auth-foundation -m "Merge branch 'phase3/auth-foundation'"
git push origin main
```

Keep `phase3/auth-foundation` on the remote (same pattern as Phase 2).

---

## Explicitly not Phase 3

| Item | Phase |
|------|-------|
| Real analytics (xG, passing networks, possession chains) | Phase 4 |
| Automated tests, CI/CD, production deployment | Phase 5 |
| PDF / image export | Future |
| Players scoped per workspace | Future |
| Full public multi-competition guest catalog | Future (guests: La Liga 2020/21 only) |