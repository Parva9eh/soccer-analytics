# Phase 6 Plan — Ops, Polish & Growth

**Status:** In progress (July 2026) — 6.1 ✅ complete on `main`  
**Branches:** `phase6/collaboration-proxy` (6.1) · `phase6/ops-polish` (6.3) — both merged to `main` with `--no-ff`  
**Prerequisite:** Phase 5 production live; Google OAuth + guest browsing verified ✅

## Goal

Harden production operations, close deferred UX gaps, and add high-value product extensions without destabilizing the Vercel + Supabase stack.

---

## 6.1 — Signed-in collaboration + `/backend` proxy ✅ (July 2026)

**Problem:** OAuth users could browse as guests but `/settings`, `/reports`, and `/analyses` failed; same-origin `/backend` proxy had auth and compression bugs.

**Delivered on `main`:**

| Area | Change |
|------|--------|
| API bootstrap | `POST /auth/bootstrap`, `BootstrapOnSignIn`, workspace empty lists |
| Query gating | `useCollaborationQueriesEnabled`, `useAuthMeQuery`, `CollaborationQuerySync` |
| `/backend` proxy | Route handler injects Bearer from cookies; **no** `next.config` rewrites (they bypassed auth) |
| Paths | Browser uses relative `/backend`; trailing slashes normalized |
| Compression | Strip `Content-Encoding` / request `identity` — fixes `ERR_CONTENT_DECODING_FAILED` |
| Middleware | Session refresh + auth injection on `/backend/*` |

**Verified in production:**

1. Guest browsing (`/matches`, `/players`, `/analytics`) loads via `/backend/*`
2. Google sign-in → sidebar workspace name
3. `/settings`, `/reports`, `/analyses` load (empty lists OK)
4. `/backend/auth/me` returns profile JSON when signed in

**If `/settings` shows “Setup required” (503):** apply all `supabase/migrations/` on hosted Supabase, especially `20250604170000_fix_workspace_rls_recursion.sql` and `20250604200000_workspace_create_rpc.sql`.

---

## 6.2 — Production ops (Hobby-friendly)

| Task | Owner | Status / notes |
|------|-------|----------------|
| Uptime monitor | You | ✅ `GET /health/ready` → `status: ready`, `database: connected`, `matches_count: 35` |
| Supabase migration audit | You | Use [`supabase/scripts/audit-production.sql`](./supabase/scripts/audit-production.sql) — **not** `supabase_migrations.schema_migrations` (see below) |
| OAuth production URLs | You | Supabase Site URL + redirect URLs; Google/GitHub app origins |
| Zone materialized view | ✅ Done | `SELECT public.refresh_season_team_zone_stats();` in Supabase; API `USE_ZONE_MATERIALIZED_VIEW=true` + redeploy |
| Log review | Optional | `403` on `/auth/v1/user` is usually benign (see below) |

### Migration audit: `schema_migrations` does not exist

**Not a production bug.** That table is created only when you apply migrations with the Supabase CLI (`supabase db push`). If you ran SQL files in the **SQL Editor** (as documented), tracking lives in your migration history manually — the app does not need `schema_migrations`.

**Do this instead:** Supabase → SQL → run [`supabase/scripts/audit-production.sql`](./supabase/scripts/audit-production.sql). Expect 7 tables, 3 RPCs, RLS `enabled`, and row counts ≥ 0.

### Auth logs: `GET | 403 | …/auth/v1/user`

Seen from **`python-httpx`** (API token verify) and **`node`** (Next.js `getUser()`). Common when:

- Expired or stale session cookies are refreshed (middleware on each request)
- API tries Supabase Auth API first, then falls back to JWKS / `SUPABASE_JWT_SECRET` (request still succeeds)

**Ignore if** sign-in, `/backend/auth/me`, and collaboration pages work. **Investigate if** users get random sign-outs: confirm API `SUPABASE_ANON_KEY` and `SUPABASE_JWT_SECRET` match the **same** Supabase project as the web app’s `NEXT_PUBLIC_*` keys.

---

## 6.3 — Deferred Phase 2 polish ✅ (July 2026)

| Area | Change |
|------|--------|
| Brand | `LogoMark` + `BrandLockup` in sidebar/mobile nav; SVG favicon (`app/icon.svg`); auth pages use mark |
| Hero | `DashboardHero` on home — pitch grid, trajectory arc, guest vs signed-in copy, live match/event chips |
| Empty states | `WorkspaceDatasetsEmpty` on dashboard, analytics, reports, analyses when workspace has no linked datasets |
| Skeletons | `WorkspaceManageSkeleton` while workspace detail loads |
| Match detail | Responsive pitch heights — capped 2D `max-h` on small screens; lower 3D `min-h` on mobile |
| Pitch controls | `SectionHeader` action row scrolls horizontally on narrow viewports |

**Files:** `components/brand/*`, `components/workspace/WorkspaceDatasetsEmpty.tsx`, `lib/workspace-empty.ts`, `lib/use-workspace-catalog.ts`

---

## 6.4 — Realtime & live data (stretch)

- Supabase Realtime on `events` or match rows for “live” timeline updates
- Optional: broadcast workspace report refresh to collaborators
- Design: channel naming per `workspace_id` + RLS-compatible filters

---

## 6.5 — Data expansion ✅ (branch `phase6/data-expansion`, merge `88a786b`)

| Area | Change |
|------|--------|
| ETL | `--load-season` full pipeline; presets `demo` / `expansion` (PL 2003/04) |
| Fix | Season DB lookup scoped by `competition_id` (multi-league safe) |
| API | `GET /competitions/inventory` — all loaded seasons for workspace linking |
| UX | Workspace data access uses catalog dropdown instead of free-text |
| Docs | `scripts/load-statsbomb-season.sh`, `apps/api/README.md` ETL section |

**You run in production:** `./scripts/load-statsbomb-season.sh expansion` (30–60+ min for events), then link Premier League in workspace settings.

**Post-load (July 2026 — done):** Premier League 2003/04 loaded (38 StatsBomb open-data matches, all with events). Zone MV refreshed; API redeployed with materialized-view reads enabled.

---

## 6.6 — Sharing & embeds

- Public read-only share links for reports (token + expiry)
- oEmbed or iframe-safe compare view (no auth)
- Export polish: PDF branding, report cover page

---

## 6.7 — Performance & cost

- Review `SEASON_ZONE_CACHE_TTL_SECONDS` under real traffic
- Supabase pooler connection limits on Hobby/Vercel cold starts
- Playwright smoke for signed-in path (`/settings` after mock bootstrap)

---

## Suggested implementation order

```
6.1 (auth + /backend proxy) → ✅ done
6.2 (ops checklist)         → ✅ done
6.7 (e2e proxy smoke)       → in progress on main
6.3 (polish)                → ✅ done
6.5 (data)                  → ✅ done (`phase6/data-expansion`)
6.4 (realtime)              → largest architectural slice
6.6 (sharing)               → after stable signed-in UX
```

### Next up for you (6.2 — no code)

1. Add uptime monitor on `https://soccer-a9alytics-api.vercel.app/health/ready`
2. Confirm Supabase tables + migrations applied
3. Double-check OAuth redirect URLs match your live web hostname
4. After future data loads: `SELECT public.refresh_season_team_zone_stats();` then redeploy API if zone env changed

---

## Branch & merge

| Slice | Branch | Merge commit on `main` |
|-------|--------|------------------------|
| 6.1 collaboration + `/backend` proxy | `phase6/collaboration-proxy` | `58398e9` |
| 6.3 polish | `phase6/ops-polish` | `c0fbdca` |
| 6.5 data expansion | `phase6/data-expansion` | `88a786b` |

```bash
git checkout main && git pull
git checkout -b phase6/<slice-name>
# … implement slice …
git checkout main && git merge --no-ff phase6/<slice-name>
git push origin main phase6/<slice-name>  # keep branch on remote
```

Update this file and [PLAN.md](./PLAN.md) when Phase 6 closes.

---

## Related docs

- [DEPLOY.md](./DEPLOY.md) — production env vars
- [supabase/README.md](./supabase/README.md) — migrations & OAuth
- [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) — deployment & selective builds