# Soccer Analytics — API

FastAPI backend for the Soccer Analytics platform: matches, events, analytics, auth, and workspaces.

**Production:** `https://<your-api-project>.vercel.app` (your Vercel API project URL)

## Environment setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the required Supabase and database credentials in `.env`.

## Running locally

```bash
# From apps/api
uv run uvicorn main:app --reload --port 8000
```

From repo root: `pnpm dev:api`

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Tests

```bash
# From the repo root
pnpm test:api

# Or from apps/api
uv sync --extra dev
uv run pytest
```

The API will be available at `http://localhost:8000`.

## Health endpoints

| Path | Use |
|------|-----|
| `GET /health/` | Liveness |
| `GET /health/ready` | Readiness (DB connected) — **uptime monitors** |
| `GET /health/supabase` | DB diagnostic |

```bash
curl https://<your-api-project>.vercel.app/health/ready
```

## Key endpoints

- `GET /summary` — High-level data counts
- `GET /matches/` — List matches (`competition`, `season`, `limit`)
- `GET /events/` — Paginated events (`match_id`, `event_type`, `page`, `page_size`)
- `GET /analytics/xg/matches/{id}` — Match expected goals (StatsBomb shot xG)
- `GET /analytics/xg/season?competition=&season=` — Season xG aggregates
- `GET /analytics/xg/players?competition=&season=&limit=` — Player xG leaderboard
- `GET /analytics/xg/teams?competition=&season=` — Team xG leaderboard
- `GET /analytics/xg/form?competition=&season=&team=&window=` — Per-match xG for/against with rolling averages
- `GET /analytics/passes/matches/{id}?team=` — Completed-pass network for one team in a match
- `GET /analytics/passes/progressive?competition=&season=&limit=` — Teams ranked by progressive passes
- `GET /analytics/possession/matches/{id}?team=&limit=` — Possession chains for a match
- `GET /analytics/possession/season?competition=&season=` — Team possession build-up summaries
- `GET /analytics/profiles/players/{id}?competition=&season=` — Player season profile (xG, passes, shots)
- `GET /analytics/profiles/teams?team=&competition=&season=` — Team season profile
- `GET /analytics/profiles/compare/players?player_a=&player_b=&competition=&season=` — Compare two players
- `GET /analytics/profiles/compare/teams?team_a=&team_b=&competition=&season=` — Compare two teams
- `GET /analytics/profiles/matches/{id}` — Match analytics profile (xG, passes, possession, tactical counts)
- `GET /analytics/profiles/compare/matches?match_a=&match_b=` — Compare two matches
- `GET /analytics/zones/season?competition=&season=` — Team event counts by pitch third
- `GET /analytics/zones/heatmap?competition=&season=&team=` — Season spatial heatmap bins for one team
- `GET /auth/me` — Current user + profile (requires Bearer token)
- `GET /workspaces/` — List workspaces for the signed-in user (always requires Bearer token)
- `POST /workspaces/` — Create workspace (creator becomes `admin`)
- `GET /workspaces/{id}` — Workspace detail with members

## Authentication (Phase 3)

- **`REQUIRE_AUTH=false`** (default): Routes use the service-role client when no Bearer token is sent (local dev).
- **`REQUIRE_AUTH=true`**: Collaboration routes require a valid Supabase JWT. Read routes (`/matches`, `/events`, `/players`, `/competitions`, `/summary`) accept anonymous requests via the Supabase anon key; RLS limits guests to the public demo dataset.
- Set **`SUPABASE_JWT_SECRET`** from Supabase → Settings → API → JWT Secret.
- ETL and admin scripts should call `get_supabase_service_client()` directly, not the route dependency.

See [supabase/README.md](../../supabase/README.md) for enabling auth on the web app.

## Configuration

All configuration is centralized in `core/config.py` via Pydantic Settings. See `.env.example` for the full list of supported variables.

## Reusable Query Parameters

The API uses reusable Pydantic models for common query parameters:

- `PaginationParams` — for paginated endpoints (`/events`)
- `LimitParams` — for simple limit-based endpoints (`/matches`)
- `MatchListParams` — combined filters + limit for matches

These can be used via `Depends()` for consistency and validation.

## Vercel deployment

1. Vercel project **Root Directory:** `apps/api`
2. Entrypoint: `[tool.vercel] entrypoint = "main:app"` in `pyproject.toml`
3. Config: `vercel.json` (`maxDuration`, test exclusions, `ignoreCommand`)
4. Selective deploy: skips when only `apps/web/` changed on the latest commit

```bash
cd apps/api && vercel --prod
```

Required production env vars: see `.env.example` and [DEPLOY.md](../../DEPLOY.md). Use Supabase **pooler** URL (port **6543**) for `DATABASE_URL`.

## Production notes

- `ENVIRONMENT=production`, `LOG_FORMAT=json`, `LOG_LEVEL=INFO`
- `REQUIRE_AUTH=true` when auth is enabled on the web app
- `CORS_ORIGINS` — required for cross-origin web URL; less critical with same-origin `/backend` proxy
- `SEASON_ZONE_CACHE_TTL_SECONDS` (default 300)
- `USE_ZONE_MATERIALIZED_VIEW=false` until `refresh_season_team_zone_stats()` has run
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` to the web project

## Docker (optional)

`Dockerfile` + `docker-compose.yml` for local long-running API. Vercel production uses serverless Python, not the container image.

## Related docs

- [apps/web/README.md](../web/README.md) — frontend and `/backend` proxy
- [DEPLOY.md](../../DEPLOY.md) — full deployment guide
- [supabase/README.md](../../supabase/README.md) — migrations and RLS
- [PHASE5_SUMMARY.md](../../PHASE5_SUMMARY.md) — CI and production ops
