# Soccer Analytics - Project Plan

**Repository:** [soccer-analytics](https://github.com/Parva9eh/soccer-analytics)  
**Current Phase:** Phase 2 complete — Phase 3 next (June 2026)  
**Latest branch:** `phase2/frontend-completion` (ready to merge)

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

### Phase 3: Authentication, Authorization & Collaboration (Planned)

**Goal:** Implement secure access control and collaboration features.

**Planned Work:**

**Phase 3.1 — Authentication**
- Supabase Auth on the frontend (email first; OAuth providers afterward)
- Next.js session handling and protected routes
- FastAPI JWT validation; user-scoped Supabase client for app reads (service role for ETL/admin only)

**Phase 3.2 — RLS & schema**
- Versioned database migrations in the repo (e.g. `supabase/migrations/`)
- Row Level Security policies across application tables

**Phase 3.3 — Collaboration**
- User workspaces / teams
- Role-based access (coach, analyst, viewer, admin)
- Private saved analyses, reports, and dashboards
- Invitation and sharing flows

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
| Phase 3 | Planned | Auth, RLS, collaboration (sub-phases 3.1–3.3) |
| Phase 4 | Planned | Real analytics features |
| Phase 5 | Planned | Testing, CI, and deployment |

Detailed summaries for completed phases: [PHASE0_SUMMARY.md](./PHASE0_SUMMARY.md), [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md), [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md).

---

## How to Contribute / Review

- All major work happens on dedicated feature branches (e.g. `phase0/housekeeping`, `phase1/backend-hardening`, `phase2/frontend-completion`).
- Changes are kept small and reviewable where possible.
- Significant architectural decisions are discussed before implementation.

---

*This is a living document. It will be updated after each major phase is completed.*