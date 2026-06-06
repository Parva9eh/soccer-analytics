# Soccer Analytics - Project Plan

**Repository:** [soccer-analytics](https://github.com/Parva9eh/soccer-analytics)  
**Current Phase:** Phase 3.1 in progress (June 2026)  
**Active branch:** `phase3/auth-foundation`

---

## Vision & Goals

Build a professional, production-ready full-stack soccer data analysis platform for coaches and serious fans.

The platform should provide high-quality visualizations, meaningful metrics, and a smooth experience using StatsBomb open data, while maintaining excellent code quality, maintainability, and developer experience.

---

## Guiding Principles & Key Decisions

- **Professional Quality First**: Prioritize code quality, consistency, observability, and maintainability over rapid feature development.
- **Supabase as the Platform**: Use Supabase (Postgres + Auth + Realtime + Storage) as the primary backend platform.
- **Production Auth Model**: No anonymous production API; Row Level Security enforced in Supabase; service role limited to ETL and admin operations. Phases 0–2 use open API access with the service-role client for development velocity. Auth and RLS are enforced starting Phase 3, before any production deployment.
- **Multi-Competition Support**: Design schema, queries, UI, and data models to support multiple competitions from day one.
- **Free-Tier Friendly Initially**: Target Vercel (frontend) + Render/Railway (backend) for early hosting, with awareness of limitations.
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

### Phase 3: Authentication, Authorization & Collaboration (In Progress)

**Goal:** Implement secure access control and collaboration features.

**Branch:** `phase3/auth-foundation`

**Phase 3.1 — Authentication (complete)**
- ✅ Supabase Auth (email/password) — login, signup, `/auth/callback`, `@supabase/ssr` session proxy
- ✅ Optional route protection via `NEXT_PUBLIC_AUTH_ENABLED` (default off for local dev)
- ✅ `apiFetch` attaches Bearer token when auth is enabled
- ✅ FastAPI JWT validation (`SUPABASE_JWT_SECRET`), `GET /auth/me`, user-scoped Supabase client when token present
- ✅ `REQUIRE_AUTH` flag on API (default off); ETL continues to use service role directly
- ✅ OAuth sign-in (Google, GitHub) on login/signup
- ✅ Dedicated auth layout (`(auth)` route group without sidebar)
- ✅ JWT verification for OAuth (Auth API, JWKS, HS256); sidebar uses client session

#### Google OAuth setup (Supabase Auth)

Works on **Supabase free tier** (Auth MAU limits apply; the provider itself is not paid-only). If Google is disabled in Supabase, the app shows: `Unsupported provider: provider is not enabled`.

**1. Supabase — URL configuration (dev)**

Authentication → **URL configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

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

**Phase 3.2 — RLS & schema (in progress)**
- ✅ Authenticated read policies for app data tables
- ✅ `profiles` table + auth signup trigger
- ✅ Migrations: `20250604130000_profiles`, `20250604140000_workspaces`, `20250604150000_profiles_workspace_peers`
- ⏳ Apply all migrations on hosted Supabase

**Phase 3.3 — Collaboration (in progress)**
- ✅ `workspaces` + `workspace_members` schema with RLS
- ✅ API: `GET/POST /workspaces/`, `GET /workspaces/{id}`
- ✅ Web: `/settings` workspace list + create (when auth enabled)
- ✅ Active workspace on profile (`PATCH /auth/me`), sidebar switcher
- ✅ Invitations: create/revoke, shareable link, accept flow (`/invitations/accept`)
- ✅ Workspace-scoped match/data access (`workspace_datasets`, active-workspace RLS, Manage → Data access)
- ✅ Private saved analyses (match filter/pitch views, `/analyses`, Save view on match page)
- ⏳ Reports and dashboards (broader exports / multi-match views)

#### Before production deploy (auth / OAuth)

- Add **production URLs** in Supabase (**Site URL** + **Redirect URLs**, e.g. `https://<your-app>/auth/callback`).
- Add the **same production web origins** in **Google** and **GitHub** OAuth apps (JavaScript origins / app URL where applicable; OAuth redirect URI to Supabase remains `https://<project-ref>.supabase.co/auth/v1/callback`).
- Keep **`SUPABASE_JWT_SECRET`** and all Supabase keys (**URL**, **anon**, **service role**) aligned with **that same** Supabase project in production API and web env.

Setup detail: [supabase/README.md](./supabase/README.md).

---

### Phase 4: Core Analytics Capabilities (Planned)

**Goal:** Deliver meaningful analytical value beyond raw event data.

**Planned Areas:**
- Expected Goals (xG) models and visualizations
- Passing networks and progressive passing metrics
- Possession chains and build-up analysis
- Player and team aggregates / profiles
- Tactical event filtering and pattern detection
- Comparison tools (player vs player, team vs team, match vs match)

---

### Phase 5: Quality, Performance & Deployment (Planned)

**Goal:** Make the system reliable, testable, and deployable.

**Planned Work:**
- Automated testing (unit, integration, API contract tests; auth/RLS smoke tests may start in Phase 3)
- CI/CD pipeline
- Performance optimization (caching, query optimization, materialized views)
- Monitoring, alerting, and logging improvements
- Containerization (Docker) and infrastructure as code
- Deployment to chosen hosting platforms (after Phase 3 auth/RLS)
- Production auth: Supabase URLs, OAuth app origins, JWT secret / keys — see [Before production deploy (auth / OAuth)](#before-production-deploy-auth--oauth)
- Cost and performance monitoring

---

### Future / Stretch Goals

- Real-time features using Supabase Realtime (live match updates, collaborative analysis)
- Dedicated native mobile app (responsive web layout is largely covered in Phase 2)
- Export capabilities (PDF reports, CSV, images)
- Advanced sharing and embedding features
- Integration with additional data sources
- Community / public analysis sharing features

---

## Current Status (as of June 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ Completed | Monorepo hygiene and foundation |
| Phase 1 | ✅ Completed | Backend hardening & developer experience |
| Phase 2 | ✅ Completed | Frontend UX — [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md) |
| Phase 3 | 🚧 In progress | 3.1 auth on `phase3/auth-foundation`; 3.2 RLS migrations next |
| Phase 4 | Planned | Real analytics features |
| Phase 5 | Planned | Testing, CI, and deployment |

Detailed summaries for completed phases: [PHASE0_SUMMARY.md](./PHASE0_SUMMARY.md), [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md), [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md).

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
2. Start the next phase from updated `main`:  
   `git checkout main && git pull && git checkout -b phaseN+1/...`
3. Add or update `PHASEN_SUMMARY.md` and mark the phase complete in this plan.

**Example (Phase 2):** `phase2/frontend-completion` → merge commit `8c3c56c` on `main`; branch kept on `origin`.

**Current (Phase 3):** When `phase3/auth-foundation` is complete, merge it into `main` the same way and keep the branch.

### Rebasing a long-running phase branch

If `main` moved while a phase branch was in progress (e.g. another phase merged first), rebase or merge `main` into the phase branch before the final PR. Prefer **cherry-picking only phase-specific commits** onto `main` if a full rebase conflicts with an earlier squash (avoid replaying entire phase histories twice).

---

*This is a living document. It will be updated after each major phase is completed.*