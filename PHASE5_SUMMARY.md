# Phase 5 Summary — Testing & CI (kickoff)

**Branch:** `phase5/testing-ci`  
**Status:** Phase 5.1 merged to `main`

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

### Monorepo scripts

| Script | Command |
|--------|---------|
| `pnpm test` | API + web unit tests |
| `pnpm verify` | Typecheck and all unit tests |

## Suggested next (Phase 5.2+)

1. API integration tests with mocked Supabase
2. Playwright smoke tests for key routes (`/analytics`, `/analytics/compare`, match detail)
3. Docker Compose for local API + web
4. Materialized views / caching for season zone aggregates