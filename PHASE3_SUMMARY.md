# Phase 3: Authentication, Authorization & Collaboration Summary

**Branch:** `phase3/auth-foundation`  
**Status:** Complete  
**Date:** June 2026

## Purpose

Phase 3 added production-oriented authentication, Row Level Security, multi-user workspaces, invitations, workspace-scoped data access, private saved match views, and workspace dashboards with CSV-exportable report snapshots. The API and web app support an optional auth mode for local development (`NEXT_PUBLIC_AUTH_ENABLED=false`, `REQUIRE_AUTH=false`) while enforcing Bearer tokens and RLS when auth is enabled.

---

## Major Work Completed

### 1. Authentication (3.1)

| Area | Deliverables |
|------|----------------|
| Web | Supabase Auth (email/password, Google, GitHub); `/login`, `/signup`, `/auth/callback`; optional route protection via `NEXT_PUBLIC_AUTH_ENABLED` |
| Email confirm | `/auth/confirm` with `verifyOtp`; invite signup preserves token via `emailRedirectTo` → `/invitations/accept` |
| API | JWT validation (`SUPABASE_JWT_SECRET`); `GET/PATCH /auth/me`; user-scoped Supabase client when Bearer token present |
| Dev flags | `REQUIRE_AUTH` on API (default off); ETL continues with service role |

### 2. RLS & Schema (3.2)

- Authenticated read policies on app data tables (`competitions`, `seasons`, `teams`, `matches`, `events`, `players`)
- `profiles` table with signup trigger and workspace peer visibility
- `workspaces`, `workspace_members`, roles, active workspace preference
- Invitation tokens with accept RPC; workspace create RPC and RLS fixes

### 3. Collaboration & Scoped Data (3.3)

| Feature | Details |
|---------|---------|
| Workspaces | `GET/POST /workspaces/`, `GET /workspaces/{id}`; sidebar switcher; `/settings` create and manage |
| Invitations | Create/revoke, shareable links, `/invitations/accept` flow |
| Data access | `workspace_datasets` links competition/season pairs; RLS via `effective_active_workspace_id()`; admin UI under Settings → Manage → Data access |
| Empty workspace UX | Matches and summary reset to first linked dataset (no hardcoded La Liga fallback) |
| Saved analyses | Private per-user views; `GET/POST/PATCH/DELETE /analyses/`; `/analyses` list; Save view on match page; restore via `?saved=` |
| Reports & dashboards | Live workspace dashboard on `/analytics`; save snapshots; `/reports` list; `/reports/[id]` detail; CSV export |

---

## Reports & Dashboards (final increment)

### Database

Migration `20250604270000_workspace_reports.sql`:

- `workspace_reports` table (title, notes, competition/season scope, JSONB snapshot)
- RLS: creator-only CRUD within member workspaces
- `workspace_report_snapshot(p_competition, p_season)` RPC — aggregates matches, events, goals, event types, matchweek distribution, and linked datasets for the active workspace

### API (`/reports`)

| Endpoint | Purpose |
|----------|---------|
| `GET /reports/dashboard` | Live metrics (optional `competition` + `season` filters) |
| `GET /reports/` | List saved reports for current user in active workspace |
| `POST /reports/` | Save snapshot (captures current dashboard state) |
| `GET /reports/{id}` | Fetch one saved report |
| `GET /reports/{id}/export` | Download CSV |
| `DELETE /reports/{id}` | Remove saved report |

### Web

| Route | Behavior |
|-------|----------|
| `/analytics` | Workspace dashboard with scope selector (single season vs all linked datasets), KPI stat cards, event-type and matchweek panels, Save report |
| `/reports` | List saved reports with view, CSV export, delete |
| `/reports/[id]` | Frozen snapshot with same panels as live dashboard |
| Sidebar | **Reports** nav item when auth enabled |

---

## Migrations to Apply (hosted Supabase)

Run in order through:

1. `20250604252000_workspace_datasets_apply.sql` (if datasets setup not yet applied)
2. `20250604240000_workspace_create_seed_dataset.sql`
3. `20250604260000_saved_analyses.sql`
4. `20250604270000_workspace_reports.sql`

Restart the API after applying SQL.

---

## Environment (auth enabled)

**Web (`apps/web/.env.local`):**

- `NEXT_PUBLIC_AUTH_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**API (`apps/api/.env`):**

- `REQUIRE_AUTH=true`
- `SUPABASE_URL`, anon key, service role (ETL)
- `SUPABASE_JWT_SECRET`
- `WEB_APP_URL` (invite links)

**Supabase URL configuration:**

- Site URL: `http://localhost:3000`
- Redirect URLs: `/auth/callback`, `/auth/confirm`

---

## Merge to `main`

When ready:

```bash
git checkout main
git pull origin main
git merge phase3/auth-foundation
git push origin main
```

Keep `phase3/auth-foundation` on the remote for reference (same pattern as Phase 2).

---

## Explicitly not Phase 3

- Real analytics models (xG, passing networks, etc.) → Phase 4
- Automated tests, CI/CD, production deployment → Phase 5
- PDF/image export → Phase 6