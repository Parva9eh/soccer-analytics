# Phase 5 Summary — Testing & CI (kickoff)

**Branch:** `phase5/testing-ci` → merged to `main`  
**Branch:** `phase5/api-integration-tests`  
**Status:** Phase 5.2 in progress — API integration tests with mocked Supabase

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
- **Note:** ESLint has pre-existing debt; lint gate deferred to Phase 5.2
- **Triggers:** `main` and `phase4/**` / `phase5/**` pushes (so feature branches get CI)
- **pnpm:** version 11 (matches local lockfile; v9 caused incompatible-lockfile failures)
- **Manual:** `workflow_dispatch` for on-demand runs (`gh workflow run CI --ref <branch>`)
- **Concurrency:** duplicate runs on the same branch are cancelled to save Actions minutes

### Monorepo scripts

| Script | Command |
|--------|---------|
| `pnpm test` | API + web unit tests |
| `pnpm verify` | Typecheck and all unit tests |

## Phase 5.2 — API integration tests (in progress)

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

## Suggested next (Phase 5.2+)

1. Playwright smoke tests for key routes (`/analytics`, `/analytics/compare`, match detail)
2. Docker Compose for local API + web
3. Materialized views / caching for season zone aggregates
4. ESLint cleanup and CI lint gate