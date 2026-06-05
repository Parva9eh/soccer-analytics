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
