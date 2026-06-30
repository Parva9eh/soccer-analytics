# Phase 5 Summary — Testing & CI (kickoff)

**Branch:** `phase5/testing-ci` → merged to `main`  
**Branch:** `phase5/zone-caching`  
**Status:** Phase 5.5 complete — season zone cache + materialized view

> **Branch rule:** Start each phase slice on its own branch from `main` (e.g. `phase5/testing-ci`), merge with `--no-ff`, then keep the branch on the remote.

## Goal

Establish automated quality gates before deployment work (Docker, hosting, monitoring).

## Phase 5.1 — Testing & CI (complete)

### API (pytest)

- Dev dependency: `pytest` via `uv sync --extra dev`
- Unit tests for `analytics/tactical.py` and `analytics/zones.py`
- Smoke test for `GET /health/` via FastAPI `TestClient`
- Run: `pnpm test:api` or `cd apps/api && uv run --extra dev pytest`

### Web (Vitest)

- Unit tests for `zone-utils`, `heatmap-utils`, and `radar-utils`
- Run: `pnpm test:web` or `cd apps/web && pnpm test`

### CI (GitHub Actions)

- Workflow: `.github/workflows/ci.yml`
- **API job:** `uv sync --extra dev` → `pytest`
- **Web job:** `pnpm install` → `tsc --noEmit` → `vitest run`
- **Web job:** `pnpm lint` gate (errors block CI; React hook rules tracked as warnings)
- **Triggers:** `main` and `phase4/**` / `phase5/**` pushes (so feature branches get CI)
- **pnpm:** version 11 (matches local lockfile; v9 caused incompatible-lockfile failures)
- **Manual:** `workflow_dispatch` for on-demand runs (`gh workflow run CI --ref <branch>`)
- **Concurrency:** duplicate runs on the same branch are cancelled to save Actions minutes

### Monorepo scripts

| Script | Command |
|--------|---------|
| `pnpm test` | API + web unit tests |
| `pnpm verify` | Typecheck and all unit tests |

## Phase 5.2 — API integration tests (complete)

### Mock Supabase layer

- `tests/mock_supabase.py` — fluent query builder mock (eq, in\_, limit, order, range, count)
- `demo_fixture()` — La Liga 2020/21-shaped sample data (no live DB)

### Integration tests (`test_integration_api.py`)

| Test | Route | Verifies |
|------|-------|----------|
| Matches list | `GET /matches/` | Team names, competition/season filters |
| Competitions | `GET /competitions/` | Season grouping in catalog |
| Health DB | `GET /health/supabase` | Connection check via mock count |
| Season zones | `GET /analytics/zones/season` | End-to-end zone aggregation |

Run: `pnpm test:api` (13 tests: 9 unit + 4 integration)

## Phase 5.2+ — Playwright smoke tests (complete)

### Mock API for E2E

- `tests/mock_supabase.py` — `e2e_fixture()` with players and event timeline fields
- `scripts/e2e_server.py` — FastAPI on `:8000` with dependency overrides (no live DB)

### Smoke tests (`apps/web/e2e/smoke.spec.ts`)

| Test | Route | Verifies |
|------|-------|----------|
| Analytics dashboard | `/analytics` | Heading, summary KPIs from mock API |
| Compare | `/analytics/compare` | Mode controls and selection UI |
| Match detail | `/matches/1000` | Fixture header and event timeline |

Run: `pnpm test:e2e` (starts mock API + Next dev via Playwright `webServer`)

CI: `.github/workflows/ci.yml` — `e2e` job (Chromium + Playwright browsers)

## Phase 5.3 — Docker Compose (complete)

### Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | API + web against `apps/api/.env` (Supabase) |
| `docker-compose.mock.yml` | Demo stack with `scripts/e2e_server.py` (no DB) |
| `apps/api/Dockerfile` | Python 3.11 + uv, uvicorn on `:8000` |
| `apps/web/Dockerfile` | Node 22 + pnpm, Next dev on `:3000` |
| `.env.docker.example` | Optional root env for web auth flags |

### Commands

| Script | Command |
|--------|---------|
| `pnpm docker:up` | Real Supabase stack (`http://localhost:3000` + `:8000`) |
| `pnpm docker:up:mock` | Mock API demo (La Liga fixture, no `.env`) |
| `pnpm docker:down` | Stop containers |

## Phase 5.4 — ESLint CI gate (complete)

- `eslint.config.mjs` — React 19 hook rules (`purity`, `set-state-in-effect`, `static-components`) downgraded to warnings
- Fixed `react/no-unescaped-entities` in match detail and `ThreeDPitch`
- Hoisted `CameraCapture` / `AnimatedTrajectoryBall` out of `ThreeDPitch` render
- `use-auth-session` — skip redundant `setIsLoading` when auth is disabled
- CI web job runs `pnpm lint`; `pnpm verify` includes lint

## Phase 5.5 — Season zone cache + materialized view (complete)

### API TTL cache

- `core/season_zone_cache.py` — 5-minute in-memory cache keyed by competition, season, and RLS-scoped `match_ids`
- `GET /analytics/zones/season` and heatmap event fetches reuse cached rows
- `SEASON_ZONE_CACHE_TTL_SECONDS` in API settings (default 300)

### Materialized view

- Migration: `20250605000000_season_team_zone_stats.sql`
- View: `season_team_zone_stats` (team × pitch-third counts per competition season)
- Refresh: `SELECT public.refresh_season_team_zone_stats();` (service role)
- Opt-in API reads: `USE_ZONE_MATERIALIZED_VIEW=true` (falls back to live aggregation)

## Suggested next

1. Gradually clear remaining ESLint warnings (mostly `react-hooks/*`)