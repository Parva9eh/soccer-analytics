# Deployment Guide

Production target: **Vercel (web)** + **Render or Railway (API)** with **Supabase** for auth and data.

## Prerequisites

- Supabase project with migrations applied (`supabase db push` or dashboard SQL)
- Google/GitHub OAuth configured if using social login (see [PLAN.md](./PLAN.md#before-production-deploy-auth--oauth))
- Copy [`.env.production.example`](./.env.production.example) as a checklist

## 1. API (Render)

### Option A — Blueprint

1. Connect this repo to Render and apply [`render.yaml`](./render.yaml).
2. Set secret env vars in the Render dashboard (`sync: false` keys).
3. Set `CORS_ORIGINS` to your Vercel URL(s) and custom domain.

### Option B — Manual Docker service

- **Dockerfile:** `apps/api/Dockerfile`
- **Context:** `apps/api`
- **Health check path:** `/health/ready`
- **Start command:** (default) `uvicorn` on port `8000`

### Required API env vars

| Variable | Notes |
|----------|-------|
| `ENVIRONMENT` | `production` |
| `LOG_FORMAT` | `json` for hosted log aggregation |
| `REQUIRE_AUTH` | `true` |
| `SUPABASE_*` | Same project as web |
| `DATABASE_URL` | Supabase pooler URL (port 6543) |
| `CORS_ORIGINS` | Comma-separated web origins |

### Health endpoints

| Path | Use |
|------|-----|
| `GET /health/` | Liveness — process is up |
| `GET /health/ready` | Readiness — includes DB connectivity |
| `GET /health/supabase` | Detailed DB diagnostic |

Wire Render/Railway/UptimeRobot to `/health/ready` for traffic routing.

## 2. Web (Vercel)

1. Import the repo; set **Root Directory** to `apps/web`.
2. Framework preset: Next.js (see [`apps/web/vercel.json`](./apps/web/vercel.json)).
3. Set production env vars:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com` |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

4. Deploy. Vercel runs `pnpm build` on each push to `main`.

## 3. Supabase auth URLs

In Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** `https://your-domain.com/auth/callback`

Add the same production origin to Google/GitHub OAuth apps.

## 4. Zone materialized view (optional)

After loading full-season data:

```sql
SELECT public.refresh_season_team_zone_stats();
```

Then set `USE_ZONE_MATERIALIZED_VIEW=true` on the API. Schedule the refresh via Supabase cron or an external job.

## 5. Local production stack

Validate images before hosting:

```bash
pnpm docker:up:prod
```

- API: `http://localhost:8000/health/ready`
- Web: `http://localhost:3000` (production Next build)

Stop: `pnpm docker:down`

## 6. Monitoring checklist

- [ ] Uptime check on `GET /health/ready` (API)
- [ ] `LOG_FORMAT=json` and `ENVIRONMENT=production` on API
- [ ] `REQUIRE_AUTH=true` + `NEXT_PUBLIC_AUTH_ENABLED=true`
- [ ] CORS origins match deployed web URL(s)
- [ ] Supabase RLS policies verified for guest demo data
- [ ] Service role key only on API — never in web env or git

## Related docs

- [SECURITY.md](./SECURITY.md) — secrets and auth policy
- [apps/api/.env.example](./apps/api/.env.example) — full API config
- [apps/web/.env.example](./apps/web/.env.example) — web config
- [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) — CI and quality gates