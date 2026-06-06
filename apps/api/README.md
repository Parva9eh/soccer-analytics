# Soccer Analytics API

FastAPI backend for the Soccer Analytics platform.

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the required Supabase and database credentials in `.env`.

## Running Locally

```bash
# From the apps/api directory
uv run uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## Key Endpoints

- `GET /health` — Basic health + observability info (version, environment, timestamp, request_id)
- `GET /health/supabase` — Supabase connectivity check
- `GET /matches` — List matches (supports `competition`, `season`, and `limit`)
- `GET /events` — Paginated events for a match (`match_id` required, supports `event_type`, `page`, `page_size`)
- `GET /summary` — High-level data counts
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

## Production Notes

- Set `ENVIRONMENT=production`
- Use a proper connection-pooled `DATABASE_URL`
- Consider `LOG_FORMAT=json` for structured logging in production
- Configure `CORS_ORIGINS` appropriately for your frontend domain(s)
