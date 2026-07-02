# Soccer Analytics - Project Plan

**Repository:** [soccer-analytics](https://github.com/Parva9eh/soccer-analytics)  
**Current Phase:** Phase 6 planned — ops, polish & growth (June 2026)  
**Active branch:** `main` (6.1 collaboration fixes landing; branch `phase6/ops-polish` for next slices)

---

## Vision & Goals

Build a professional, production-ready full-stack soccer data analysis platform for coaches and serious fans.

The platform should provide high-quality visualizations, meaningful metrics, and a smooth experience using StatsBomb open data, while maintaining excellent code quality, maintainability, and developer experience.

---

## Guiding Principles & Key Decisions

- **Professional Quality First**: Prioritize code quality, consistency, observability, and maintainability over rapid feature development.
- **Supabase as the Platform**: Use Supabase (Postgres + Auth + Realtime + Storage) as the primary backend platform.
- **Production Auth Model**: Row Level Security enforced in Supabase; service role limited to ETL and admin operations. Phases 0–2 use open API access with the service-role client for development velocity. Phase 3 adds authenticated workspace scoping; when auth is enabled, guests may read a limited public demo dataset via the Supabase `anon` role (see Phase 3).
- **Multi-Competition Support**: Design schema, queries, UI, and data models to support multiple competitions from day one.
- **Free-Tier Friendly**: Production on **two Vercel Hobby projects** (web + API) + Supabase free tier. Docker Compose for local validation; `render.yaml` retained as an optional alternative.
- **Incremental & Reviewable**: All work is done in small, reviewable increments on dedicated branches with explicit approval gates.
- **Phase branches merge with merge commits**: When a phase is complete, integrate via a **merge commit** into `main` (not squash). Phase branches are **retained** on the remote after merge for history and reference.
- **Real-time as a Future Differentiator**: Supabase Realtime is viewed as a high-value future capability rather than a Phase 1 priority.

---

## Phased Roadmap

### Phase 0: Housekeeping & Monorepo Foundation (Completed)

**Goal:** Clean up legacy code, establish proper monorepo structure, fix configuration issues, and improve the overall developer experience before beginning major feature or architecture work.

**Key Deliverables:**
- Removal of legacy `src/` boilerplate and duplicate components in the Next.js app
- Lowered minimum Python requirement in `apps/api/pyproject.toml` from `>=3.14` to `>=3.11` for better ecosystem compatibility
- Proper monorepo tooling (root `package.json` with convenient scripts)
- Centralized API URL handling in the frontend (`apps/web/lib/api.ts`)
- Corrected shadcn/ui configuration and removal of misplaced `pnpm-workspace.yaml`
- Scoped `.gitignore` rules to protect frontend `lib/` directory
- Added root `README.md` with getting started guide
- Added `apps/web/.env.example`

**Branch:** `phase0/housekeeping`

**Summary:** [PHASE0_SUMMARY.md](./PHASE0_SUMMARY.md)

---

### Phase 1: Backend Hardening & Developer Experience (Completed)

**Goal:** Transform the backend into a professional, observable, consistent, and maintainable system.

**Key Deliverables:**

**Architecture & Reliability**
- Supabase client dependency injection (factories + `Depends()`)
- Elimination of N+1 queries on `/matches` using Supabase embedded selects
- Full modularization of the ETL pipeline into a clean, maintainable package
- Centralized configuration via Pydantic Settings

**Observability & Quality**
- Structured logging (JSON + text) with full request logging middleware
- Complete `X-Request-ID` propagation across logs and error responses
- Comprehensive error handling system (`ErrorCode` enum, consistent `ErrorResponse`, global handlers)
- Full Pydantic v2 modernization (no more `schema_extra` / `class Config` deprecation warnings)

**API Quality**
- Reusable, validated query parameter models (`PaginationParams`, `LimitParams`, `MatchListParams`)
- Request validation hardening across endpoints
- Significantly improved health endpoints with observability metadata

**Security & Configuration**
- Configurable CORS
- Security headers middleware
- Removal of scattered environment variable access

**Documentation**
- Comprehensive `.env.example` covering all settings
- Professional `apps/api/README.md`

**Branch:** `phase1/backend-hardening`

**Summary:** [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md)

---

### Phase 2: Frontend Completion (Completed)

**Goal:** Deliver a complete and polished user experience on the frontend, backed by the existing API.

**Branch:** `phase2/frontend-completion`

**Summary:** [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md)

#### Completed

**Pages & data fetching**
- Dashboard (`/`) with summary KPIs via TanStack Query
- Matches list (`/matches`) with competition/season selectors (URL-synced), catalog fetch, and empty/error states; match detail (`/matches/[id]`) with event table, filters, and pitch visualizations
- Players list (`/players`) with debounced search, sorting, skeletons, prefetch, and empty search state
- Player detail (`/players/[id]`) with loading and error states
- Analytics (`/analytics`) as a KPI dashboard with placeholder modules for Phase 4 features
- TanStack Query and centralized `apiFetch` used across all data pages

**Backend support (Phase 2)**
- `GET /players/` — list with optional name search and limit
- `GET /players/{id}` — single player detail
- `GET /competitions/` — catalog of competition names and seasons for UI filters
- `GET /matches/` — `competition` and `season` query params (existing filters, now used by the UI)

**UX & visualizations**
- 2D pitch and advanced 3D pitch on match detail (camera presets, event highlighting, keyboard navigation)
- Design system refinements (`globals.css`), motion, and responsive layout (sidebar + mobile header)
- Partial accessibility pass (`aria-label`s, focus-visible styles, keyboard-friendly tables)
- Route-level `error.tsx` boundaries with shared `RouteError` UI (Try again + section-specific back links)

#### Deferred polish (non-blocking)

- Pitch-only overlay responsive audit (main pages and tables are done)

#### Explicitly not Phase 2

- Real analytics (xG, passing networks, possession chains, comparisons) → Phase 4
- Authentication, RLS, workspaces → Phase 3
- Automated tests, CI/CD, production deployment → Phase 5

---

### Phase 3: Authentication, Authorization & Collaboration (Completed)

**Goal:** Implement secure access control, multi-user workspaces, and collaboration features.

**Branch:** `phase3/auth-foundation`

**Summary:** [PHASE3_SUMMARY.md](./PHASE3_SUMMARY.md)

#### Phase 3.1 — Authentication (complete)

- ✅ Supabase Auth (email/password, Google, GitHub) — `/login`, `/signup`, `/auth/callback`, `/auth/confirm`
- ✅ `@supabase/ssr` session cookies; Next.js `proxy.ts` refresh + route guard
- ✅ `NEXT_PUBLIC_AUTH_ENABLED` (web) and `REQUIRE_AUTH` (API) — default off for open local dev
- ✅ `apiFetch` attaches Bearer token when a session exists
- ✅ FastAPI JWT validation (`SUPABASE_JWT_SECRET`, JWKS); `GET/PATCH /auth/me`
- ✅ User-scoped Supabase client (`postgrest.auth(token)`) for RLS-enforced routes
- ✅ Dedicated `(auth)` layout without app sidebar
- ✅ Email confirm via `verifyOtp` on `/auth/confirm`; invite signup preserves token through confirm
- ✅ **Guest browsing** when auth is on — explore routes public; collaboration routes require sign-in

#### Google OAuth setup (Supabase Auth)

Works on **Supabase free tier** (Auth MAU limits apply; the provider itself is not paid-only). If Google is disabled in Supabase, the app shows: `Unsupported provider: provider is not enabled`.

**1. Supabase — URL configuration (dev)**

Authentication → **URL configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`

**2. Supabase — enable Google (get callback URL)**

Authentication → **Providers** → **Google** → **Enable**.

Copy the **Callback URL** shown there (add to Google in step 4). It looks like:

`https://<project-ref>.supabase.co/auth/v1/callback`

Leave this tab open; you will paste Google **Client ID** and **Client secret** here after step 3.

**3. Google Cloud Console — OAuth client**

[APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → **Create credentials** → **OAuth client ID**.

- If prompted, configure the **OAuth consent screen** (External is fine for testing; add your email as a test user while in “Testing”).
- Application type: **Web application**.
- **Authorized JavaScript origins:** `http://localhost:3000` (your web app origin — **not** the Supabase callback URL).
- **Authorized redirect URIs:** the **Supabase Callback URL** from step 2 (`https://<project-ref>.supabase.co/auth/v1/callback`) — **not** `http://localhost:3000/auth/callback` (that is only in Supabase redirect URLs for the app after Supabase finishes OAuth).

Create the client and copy **Client ID** and **Client secret**.

**4. Supabase — paste Google credentials**

Back to **Providers** → **Google**: paste Client ID and Client secret → **Save**.

**5. App env and test**

- `apps/web/.env.local`: `NEXT_PUBLIC_AUTH_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/api/.env`: `REQUIRE_AUTH=true`, `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret)
- Restart web and API dev servers after env changes.
- Open `/login` → **Google** → consent → redirect to `/auth/callback` → app home with data loading.

**6. Production (Google)**

When deploying, repeat the same pattern for your live domain — see [Before production deploy (auth / OAuth)](#before-production-deploy-auth--oauth): production **Site URL** / **Redirect URLs** in Supabase, add production origin under Google **Authorized JavaScript origins**, keep Supabase callback URL in Google **Authorized redirect URIs**, same Supabase project keys and JWT secret in production env.

GitHub OAuth: same flow with [GitHub OAuth Apps](https://github.com/settings/developers); callback URL is still Supabase’s `https://<project-ref>.supabase.co/auth/v1/callback`. Details: [supabase/README.md](./supabase/README.md).

#### Phase 3.2 — RLS & schema (complete)

- ✅ RLS on app data tables (`competitions`, `seasons`, `teams`, `matches`, `events`, `players`)
- ✅ `profiles` + signup trigger; workspace peer visibility
- ✅ `workspaces`, `workspace_members`, roles (`admin` / `member`)
- ✅ `workspace_invitations` with token-based accept RPC
- ✅ `workspace_datasets` — competition/season links per workspace
- ✅ `saved_analyses`, `workspace_reports` tables with creator-only RLS
- ✅ Scoped read policies via `effective_active_workspace_id()` and `user_can_access_match(bigint)`
- ✅ Anon read policies for guest demo dataset (La Liga 2020/21)
- ✅ Workspace create/seed RPCs; iterative SQL fix migrations documented in [supabase/README.md](./supabase/README.md)
- ⏳ Apply all migrations on hosted Supabase (operator step)

#### Phase 3.3 — Collaboration (complete)

**Workspaces & invitations**
- ✅ API: `GET/POST /workspaces/`, `GET /workspaces/{id}`, dataset link/unlink, invitation CRUD, `POST /workspaces/invitations/accept`
- ✅ Web: `/settings`, `/settings/workspaces/[id]` (members, invites, **Data access**)
- ✅ Active workspace on profile (`PATCH /auth/me`); sidebar switcher
- ✅ `/invitations/accept` — preserves invite token through signup and email confirm

**Workspace-scoped data**
- ✅ Match/event/competition catalog scoped to active workspace datasets
- ✅ New workspaces seed La Liga 2020/21; empty-workspace UX (no hardcoded fallback)
- ✅ Players remain global (documented in UI)

**Match views** (private saved analyses)
- ✅ `GET/POST/PATCH/DELETE /analyses/`; `/analyses` list; **Save view** on match page; restore via `?saved=`
- ✅ Nav: **Match views** under Library

**Reports & dashboards**
- ✅ `workspace_report_snapshot` RPC; `GET/POST/DELETE /reports/`, `GET /reports/dashboard`, CSV export
- ✅ `/analytics` live dashboard (signed in); `/reports`, `/reports/[id]`
- ✅ Nav: **Reports** under Library; sidebar grouped **Explore** / **Library** / **Workspaces**

**Guest browsing** (auth on, not signed in)
- ✅ Public explore routes: `/`, `/matches`, `/players`, `/analytics`
- ✅ API read routes use anon client; RLS limits to demo dataset
- ✅ Guest banner; **Continue browsing without signing in** on login
- ✅ Library and Workspaces nav hidden until sign-in

#### Before production deploy (auth / OAuth)

- Add **production URLs** in Supabase (**Site URL** + **Redirect URLs**, e.g. `https://<your-app>/auth/callback`).
- Add the **same production web origins** in **Google** and **GitHub** OAuth apps (JavaScript origins / app URL where applicable; OAuth redirect URI to Supabase remains `https://<project-ref>.supabase.co/auth/v1/callback`).
- Keep **`SUPABASE_JWT_SECRET`** and all Supabase keys (**URL**, **anon**, **service role**) aligned with **that same** Supabase project in production API and web env.

Setup detail: [supabase/README.md](./supabase/README.md).

---

### Phase 4: Core Analytics Capabilities (Completed)

**Goal:** Deliver meaningful analytical value beyond raw event data.

**Branch:** `phase4/xg-foundation` (merged to `main`)

**Summary:** [PHASE4_SUMMARY.md](./PHASE4_SUMMARY.md)

#### Phase 4.1 — Expected goals (complete)

- ✅ StatsBomb `statsbomb_xg` extraction from shot event `details`
- ✅ `GET /analytics/xg/matches/{match_id}` — per-team match xG summary
- ✅ `GET /analytics/xg/season?competition=&season=` — season aggregates
- ✅ `GET /analytics/xg/players`, `/teams`, `/form` — leaderboards and rolling team form
- ✅ Match detail — xG strip and **shot map** (xG-sized, outcome-colored markers)
- ✅ Analytics dashboard — Total xG KPI, leaderboards, rolling xG form chart
- ✅ Conditional RLS migration for `player_match_stats` (hosted Supabase operator step)

#### Phase 4.2 — Passing (complete)

- ✅ `GET /analytics/passes/matches/{match_id}?team=` — completed-pass network (nodes + edges)
- ✅ `GET /analytics/passes/progressive?competition=&season=` — team progressive pass rankings
- ✅ Match detail — **Pass network** pitch mode (home/away, volume-weighted edges)
- ✅ Analytics dashboard — progressive passes by team panel

#### Phase 4.3 — Possession & build-up (complete)

- ✅ `GET /analytics/possession/matches/{match_id}` — possession chains ranked by pass count
- ✅ `GET /analytics/possession/season` — team avg duration, passes/possession, shot rate
- ✅ Match page possession panel — click chain to filter pitch events
- ✅ Analytics dashboard — possession & build-up summary panel

#### Phase 4.4 — Profiles & comparisons (complete)

- ✅ `GET /analytics/profiles/players/{id}` — player season profile (xG, shots, passes)
- ✅ `GET /analytics/profiles/teams` — team season profile (xG for/against, build-up)
- ✅ `GET /analytics/profiles/compare/players` and `/compare/teams`
- ✅ Player detail page — season stat cards
- ✅ `/analytics/compare` — side-by-side player and team comparison

#### Phase 4.5 — Tactical filters & richer comparisons (complete)

- ✅ Tactical event presets on match page (final third, set pieces, counters, shots)
- ✅ `GET /analytics/profiles/matches/{match_id}` — single-match analytics profile
- ✅ `GET /analytics/profiles/compare/matches?match_a=&match_b=` — match vs match comparison
- ✅ `/analytics/compare` — Matches tab with side-by-side metrics
- ✅ Player detail — season radar chart (goals, xG, shots, passes, progressive passes)
- ✅ Match detail — link to compare this fixture

#### Phase 4.6 — Heatmaps, phase tagging & radar overlays (complete)

- ✅ Tactical spatial heatmap on match page (Dots / Heatmap toggle, respects filters)
- ✅ Phase breakdown panel — events grouped by play pattern (regular, set pieces, counters)
- ✅ Multi-player radar overlay on `/analytics/compare` (players mode)
- ✅ Copy link button on compare page for sharing selections

#### Phase 4.7 — Team heatmaps, zones & export (complete)

- ✅ Team-split heatmap modes on match page (All / Home / Away / Split side-by-side)
- ✅ Zone comparison panel — event counts by pitch third per team
- ✅ Position-aware radar scaling (goalkeeper, defender, midfielder, forward benchmarks)
- ✅ Compare page CSV export and radar PNG download

#### Phase 4.8 — Season zones, team heatmaps & PDF export (complete)

- ✅ `GET /analytics/zones/season` — team zone aggregates for a competition season
- ✅ `GET /analytics/zones/heatmap` — binned season heatmap per team
- ✅ Analytics dashboard — season zone panel and team heatmap selector
- ✅ Compare page — printable PDF report (metrics table + optional radar image)

#### Phase 4 complete

Phases 4.1–4.8 are merged to `main`. See [PHASE4_SUMMARY.md](./PHASE4_SUMMARY.md).

---

### Phase 5: Quality, Performance & Deployment (Completed)

**Goal:** Make the system reliable, testable, and deployable.

**Branches:** `phase5/testing-ci`, `phase5/vercel-only-deploy` (merged to `main`)

**Summary:** [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md)

#### Completed (5.1–5.10)

- ✅ Testing & CI — pytest, vitest, Playwright smoke, GitHub Actions
- ✅ API integration tests with mocked Supabase
- ✅ Docker Compose (dev, mock, prod) + deploy preflight (`pnpm deploy:check`)
- ✅ Season zone TTL cache + materialized view migration (opt-in API flag)
- ✅ ESLint CI gate (zero warnings)
- ✅ Production hardening — `GET /health/ready`, `Dockerfile.prod`, `DEPLOY.md`
- ✅ **Vercel-only production** — two Hobby projects (web + API)
- ✅ Same-origin `/backend` API proxy + auth middleware bypass for proxy paths
- ✅ Selective deploys — `ignoreCommand` scripts skip unchanged app on push

**Production:** two Vercel projects (web + API) — see [DEPLOY.md](./DEPLOY.md).

#### Optional ops (not blocking phase close)

- Uptime monitor on API `/health/ready`
- Scheduled refresh of `season_team_zone_stats` + `USE_ZONE_MATERIALIZED_VIEW=true`
- Production OAuth origins — [Before production deploy (auth / OAuth)](#before-production-deploy-auth--oauth)

---

### Phase 6: Ops, Polish & Growth (Planned)

**Goal:** Harden signed-in collaboration, production ops, and selective product extensions.

**Plan:** [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md)

#### 6.1 — Signed-in collaboration + `/backend` proxy ✅ (July 2026)

- OAuth bootstrap workspace (`POST /auth/bootstrap`, `BootstrapOnSignIn`)
- Session-gated collaboration API queries + stale-401 cache fix
- Same-origin `/backend` route handler (auth injection, compression fix)
- Guest and signed-in browsing verified in production

#### 6.2–6.7 — Planned slices

- Production ops (uptime, migrations audit, zone MV)
- Pitch overlay responsive polish
- Realtime, data expansion, sharing/embeds, performance tests

---

### Future / Stretch Goals (beyond Phase 6)

- Dedicated native mobile app
- Community / public analysis feeds
- Additional commercial hosting tiers if outgrowing Hobby

---

## Current Status (as of June 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ Completed | Monorepo hygiene and foundation |
| Phase 1 | ✅ Completed | Backend hardening & developer experience |
| Phase 2 | ✅ Completed | Frontend UX — [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md) |
| Phase 3 | ✅ Completed | Merged to `main` — [PHASE3_SUMMARY.md](./PHASE3_SUMMARY.md) |
| Phase 4 | ✅ Completed | 4.1–4.8 on `main` — [PHASE4_SUMMARY.md](./PHASE4_SUMMARY.md) |
| Phase 5 | ✅ Completed | 5.1–5.10 on `main`, prod on Vercel — [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) |
| Phase 6 | 🔄 In progress | 6.1 ✅ 6.3 ✅; next: 6.2 ops, 6.5 data, or 6.4 realtime — [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md) |

Detailed summaries: [PHASE0_SUMMARY.md](./PHASE0_SUMMARY.md) … [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md), [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md).

---

## How to Contribute / Review

### Branching

- All major work happens on dedicated phase branches (e.g. `phase2/frontend-completion`, `phase3/auth-foundation`).
- Branch from the latest `main` at the start of a phase.
- Keep commits small and reviewable where possible; discuss significant architectural decisions before implementation.

### Merging a completed phase into `main`

Use a **merge commit** so the phase branch history stays visible on `main`. Do **not** squash. Do **not** delete the phase branch after merge.

**Local:**

```bash
git checkout main
git pull origin main
git merge --no-ff phaseN/branch-name -m "Merge branch 'phaseN/branch-name'"
git push origin main
```

**GitHub PR:** choose **“Create a merge commit”** (not “Squash and merge”).

**After merge:**

1. Leave `phaseN/branch-name` on the remote (for archaeology, diffs, and PR links).
2. Start the next phase from updated `main` (**always create the branch before coding**):  
   `git checkout main && git pull && git checkout -b phaseN+1/...`
3. Add or update `PHASEN_SUMMARY.md` and mark the phase complete in this plan.

**Example (Phase 2):** `phase2/frontend-completion` → merge commit `8c3c56c` on `main`; branch kept on `origin`.

**Phase 3 (done):** `phase3/auth-foundation` merged to `main` as `503c8d2`; branch kept on `origin`.

**Phase 4 (done):** `phase4/xg-foundation` merged to `main` (4.1–4.8).

**Phase 5 (done):** `phase5/testing-ci` / Vercel deploy work merged to `main` (5.1–5.10).

**Current:** `main` — pick next slice from [Future / Stretch Goals](#future--stretch-goals) or open `phase6/...`.

### Rebasing a long-running phase branch

If `main` moved while a phase branch was in progress (e.g. another phase merged first), rebase or merge `main` into the phase branch before the final PR. Prefer **cherry-picking only phase-specific commits** onto `main` if a full rebase conflicts with an earlier squash (avoid replaying entire phase histories twice).

---

*This is a living document. It will be updated after each major phase is completed.*