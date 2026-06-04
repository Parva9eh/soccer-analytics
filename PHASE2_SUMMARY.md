# Phase 2: Frontend Completion Summary

**Branch:** `phase2/frontend-completion`  
**Status:** Complete  
**Date:** June 2026

## Purpose

Phase 2 delivered a complete, polished frontend experience on top of the Phase 1 API. The work focused on every primary user route (dashboard, matches, players, analytics), consistent data fetching and error handling, a cohesive design system, and match-detail visualizations (2D/3D pitch) — without introducing authentication, real analytics models, or deployment infrastructure (reserved for later phases).

Changes were made incrementally on a dedicated branch with reviewable commits.

---

## Major Work Completed

### 1. Application Pages & Data Fetching

| Route | Deliverables |
|-------|----------------|
| `/` | Dashboard with summary KPIs (`GET /summary/`) via TanStack Query |
| `/matches` | Match cards grid; competition/season filters synced to URL; catalog + list queries; loading skeletons, empty state, inline query errors |
| `/matches/[id]` | Full match detail: score header, event timeline, filterable event table, event detail sheet, 2D/3D pitch toggle |
| `/players` | Searchable, sortable table; debounced API search; row hover prefetch; skeletons and empty search state |
| `/players/[id]` | Player profile with loading transition and query error recovery |
| `/analytics` | KPI overview from summary API; roadmap cards for Phase 4 analytics modules |

All data pages use **TanStack Query** (`app/providers.tsx`, 5-minute default `staleTime`) and **`apiFetch` / `apiFetchJson`** from `apps/web/lib/api.ts`.

### 2. Backend Endpoints Added for Phase 2 UI

- `GET /players/` — list with optional name search and `limit`
- `GET /players/{id}` — single player detail
- `GET /competitions/` — competition names and season years for filter dropdowns
- Existing `GET /matches/?competition=&season=` filters wired to the matches list UI

### 3. Design System & Layout

- **Typography:** Plus Jakarta Sans + JetBrains Mono via `next/font`
- **Tokens:** HSL design tokens in `globals.css` (pitch teal primary, semantic surfaces, `font-mono-data`)
- **Layout primitives:** `PageShell`, `PageHeader`, `StatCard`, `SectionHeader`, `SegmentedControl`, `TableContainer`
- **App chrome:** Sidebar navigation + `MobileHeader` for small viewports; responsive grids and toolbars across pages
- **Button/link fix:** Primary CTAs (e.g. “Browse matches”) no longer inherit global link hover colors when rendered as `Button asChild`

### 4. Shared UX States & API Errors

- **`ApiError`** — parses FastAPI `ErrorResponse`, surfaces `code` and `X-Request-ID`
- **`QueryErrorState`** — consistent card UI with retry and optional actions
- **`EmptyState`** — icon, title, description, optional CTA (used on matches list, search, pitch)
- **`RouteError`** — shared segment error UI (`Try again` + contextual back link)

### 5. Error Boundaries

Per-route `error.tsx` for finer recovery without losing app chrome:

- `app/error.tsx` — root fallback
- `app/matches/error.tsx`, `app/matches/[id]/error.tsx`
- `app/players/error.tsx`, `app/players/[id]/error.tsx`
- `app/analytics/error.tsx`

Fetch failures inside client pages still use inline `QueryErrorState` (boundary catches render/runtime failures).

### 6. Match Detail: Pitch & Event UX

**2D pitch (`Pitch.tsx`, `Goals2D.tsx`)**

- FIFA-scaled markings via `constants.ts` (105m × 68m from StatsBomb 120×80 units)
- Layer toggles (passes, shots, etc.) via `PitchLayersPopover`
- Table event filter aligned with pitch styling (`TableEventFilterPopover`, shared shell/row components)
- Timeline markers with edge inset to avoid clipping; single-close event sheet

**3D pitch (`ThreeDPitch.tsx`, `Goal3D.tsx`, `StadiumEnvironment3D.tsx`)**

- React Three Fiber scene with stadium environment, grass, realistic goal geometry and nets (nets behind goal line, local coordinates)
- Camera presets and UI controls; event highlighting/dimming; keyboard navigation
- `PCFShadowMap` (Three.js r182+); `three-patch` for deprecated `Clock` API
- Immersive layout integrated in match detail with 2D/3D `SegmentedControl`

**Filter UX unification**

- Pitch layers (multi-select) and table filter (single-select) share trigger styling, chevron animation, and list shell
- Scoped CSS so pitch/table filter menus are not overridden by global `[role="listbox"]` card styles

### 7. Matches List: Multi-Competition Support

- `CompetitionSeasonFilter` — competition + season `<Select>` controls
- URL params: `?competition=La%20Liga&season=2020/2021` (defaults aligned with ETL sample data)
- `MatchesListPage` client component wrapped in `Suspense` for `useSearchParams` (production build requirement)
- `buildMatchesQuery()` helper in `lib/competition-filter.ts`

### 8. Developer Experience Fixes

- **Turbopack root:** `apps/web/next.config.mjs` sets `turbopack.root` to the app package (avoids multi-lockfile warning when a stray root lockfile exists)
- **Dependencies:** Install from `apps/web` with that package’s `pnpm-lock.yaml`

---

## Key Outcomes

- Every planned Phase 2 route is implemented and usable against the local API + Supabase data.
- Consistent visual language, spacing, and error/empty patterns across the app.
- Match detail is a differentiated experience: interactive 2D/3D pitch, filters, timeline, and event inspection.
- API errors are debuggable from the UI (request ID + error code when provided).
- Segment-level error boundaries allow recovery without a full app reload.
- Multi-competition/season browsing is supported end-to-end (catalog API + filtered matches list).

---

## Deferred / Known Gaps (Acceptable for Phase 2 Close)

These items were explicitly out of scope or left as light follow-up:

| Item | Notes |
|------|--------|
| Pitch overlay responsive polish | Main pages and tables are responsive; some pitch-only popovers/tooltips may need a dedicated small-screen pass |
| Authentication & RLS | Phase 3 |
| Real analytics (xG, networks, chains) | Phase 4 — `/analytics` shows placeholders only |
| Automated tests & CI/CD | Phase 5 |
| Production deployment | After Phase 3 auth |

---

## Relationship to Phase 3

Phase 2 assumes **open API access** with the service-role Supabase client (same as Phases 0–1). The frontend is structured for easy addition of auth:

- Centralized `apiFetch` can later attach session/JWT headers
- Route groups and layouts can gain protected wrappers
- Per-route error boundaries and query error UI will continue to apply after auth

**Recommended Phase 3 starting points:** Supabase Auth on the web app, JWT validation in FastAPI, versioned migrations + RLS, then collaboration features.

---

## How to Review This Branch

Review by theme rather than a single large diff. Representative commits on `phase2/frontend-completion`:

| Theme | Commits (examples) |
|-------|-------------------|
| Players & analytics pages | `ba2f161`, `a7e9e88`, `a2d4dcd`, `6577993`, `bc04d6f` |
| Design system & tables | `0f36e16`, `aaec513`, `0ae7058` |
| 3D pitch & stadium | `3e4b6dd`, `47abee5`, `bc4386c` |
| Event filters & match UX | `bc4386c` |
| Design tokens & typography | `d2c1744` |
| Query states & responsive layout | `9338580` |
| Competition/season filters | `e1c124c` |
| Per-route error boundaries | `c19560b` |

### Key files to examine

**App routes**

- `apps/web/app/page.tsx` — dashboard
- `apps/web/app/matches/page.tsx` + `components/matches/MatchesListPage.tsx`
- `apps/web/app/matches/[id]/page.tsx` — match detail
- `apps/web/app/players/page.tsx`, `apps/web/app/players/[id]/page.tsx`
- `apps/web/app/analytics/page.tsx`
- `apps/web/app/**/error.tsx` — segment boundaries

**Shared UI & data**

- `apps/web/lib/api.ts` — `ApiError`, `apiFetchJson`, `parseQueryError`
- `apps/web/components/ui/` — `page-shell`, `page-header`, `query-error-state`, `empty-state`, `route-error`
- `apps/web/app/globals.css` — tokens and pitch-specific overrides
- `apps/web/app/providers.tsx` — React Query defaults

**Pitch**

- `apps/web/components/pitch/` — `Pitch.tsx`, `ThreeDPitch.tsx`, `constants.ts`, filter popovers

**API (Phase 2 additions)**

- `apps/api/routers/players.py`
- `apps/api/routers/competitions.py`
- `apps/api/schemas/competition.py`

---

## Running the Phase 2 App Locally

```bash
# From repo root
pnpm dev:api    # http://localhost:8000
pnpm dev:web    # http://localhost:3000  (run install from apps/web)

# Ensure Supabase env is set and ETL data is loaded (La Liga 2020/21 sample)
cd apps/api && uv run python -m etl.cli --load-competitions
# ... additional ETL flags per README
```

Default matches URL: `/matches?competition=La%20Liga&season=2020/2021`

---

## Current State After Phase 2

- **Frontend:** Production-buildable Next.js 16 app with six primary routes, shared layout, and match visualizations.
- **Backend:** Unchanged Phase 1 quality bar; small additive routers for players and competitions catalog.
- **Data:** StatsBomb open data via ETL; UI designed for multiple competitions/seasons.
- **Next phase:** Authentication, RLS, and user-scoped data access (Phase 3).

See [PLAN.md](./PLAN.md) for the full roadmap and [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md) for backend foundations.

---

*This document was created at the conclusion of Phase 2 frontend completion work.*