# Deployment Guide — Vercel-only

Production target: **two Vercel projects** (web + API) + **Supabase** for auth and data. No Render or second host required.

Works on the **Vercel Hobby (free)** plan for personal, non-commercial use. See [Hobby limits](#hobby-plan-notes).

## Architecture

```
Browser
   │
   ▼
soccer-analytics-web.vercel.app     ← Vercel project 1 (apps/web, Next.js)
   │  NEXT_PUBLIC_API_URL → /backend/* (same-origin proxy, recommended)
   │  or → soccer-analytics-api.vercel.app (cross-origin + CORS)
   ▼
soccer-analytics-api.vercel.app     ← Vercel project 2 (apps/api, FastAPI)
   │
   ▼
Supabase (Postgres + Auth + RLS)
```

## Prerequisites

- `pnpm deploy:check` — preflight for repo files and env hints
- Supabase migrations applied (`supabase db push` or dashboard SQL)
- Google/GitHub OAuth configured if using social login ([PLAN.md](./PLAN.md#before-production-deploy-auth--oauth))
- Copy [`.env.production.example`](./.env.production.example) as a checklist
- Optional local smoke: `pnpm docker:up:prod`

---

## Step 1 — Deploy the API (Vercel project 1)

1. [Vercel Dashboard](https://vercel.com/new) → **Import** this GitHub repo.
2. **Project name:** e.g. `soccer-analytics-api`
3. **Root Directory:** `apps/api`
4. **Framework Preset:** FastAPI (auto-detected) or Other
5. Leave build settings default — Vercel reads `pyproject.toml` + `uv.lock`.

Config files in repo:

| File | Purpose |
|------|---------|
| [`apps/api/pyproject.toml`](./apps/api/pyproject.toml) | `[tool.vercel] entrypoint = "main:app"` |
| [`apps/api/vercel.json`](./apps/api/vercel.json) | `maxDuration`, exclude tests from bundle |

6. **Environment variables** (Production):

| Variable | Example / notes |
|----------|-----------------|
| `ENVIRONMENT` | `production` |
| `LOG_FORMAT` | `json` |
| `LOG_LEVEL` | `INFO` |
| `REQUIRE_AUTH` | `true` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (secret) |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `DATABASE_URL` | Supabase pooler URL (port **6543**) |
| `CORS_ORIGINS` | Web URL(s) — see Step 2 |
| `SEASON_ZONE_CACHE_TTL_SECONDS` | `300` |
| `USE_ZONE_MATERIALIZED_VIEW` | `false` until MV refreshed |

7. **Deploy** → note the URL, e.g. `https://soccer-analytics-api.vercel.app`

8. **Smoke test:**

```bash
curl https://soccer-analytics-api.vercel.app/health/
curl https://soccer-analytics-api.vercel.app/health/ready
```

---

## Step 2 — Deploy the web (Vercel project 2)

1. Import the **same repo** again (second project).
2. **Project name:** e.g. `soccer-analytics-web`
3. **Root Directory:** `apps/web`
4. **Framework Preset:** Next.js

Config: [`apps/web/vercel.json`](./apps/web/vercel.json)

### Option A — Same-origin API proxy (recommended)

Avoids CORS complexity. The web app calls `/backend/...` on its own domain; Next.js rewrites to the API Vercel project.

**Web environment variables:**

| Variable | Value |
|----------|-------|
| `API_PROXY_TARGET` | `https://soccer-analytics-api.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://soccer-analytics-web.vercel.app/backend` |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

**API project** — set `CORS_ORIGINS` to include the web URL:

```
https://soccer-analytics-web.vercel.app
```

### Option B — Cross-origin API URL

**Web environment variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://soccer-analytics-api.vercel.app` |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

**API project** — `CORS_ORIGINS` must list every web origin (preview + production):

```
https://soccer-analytics-web.vercel.app,https://your-custom-domain.com
```

5. **Deploy** → open `https://soccer-analytics-web.vercel.app/analytics`

---

## Step 3 — Supabase auth URLs

In Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://soccer-analytics-web.vercel.app` (or custom domain)
- **Redirect URLs:** `https://soccer-analytics-web.vercel.app/auth/callback`

Add the same origin to Google/GitHub OAuth apps.

---

## Step 4 — Zone materialized view (optional)

After loading full-season data:

```sql
SELECT public.refresh_season_team_zone_stats();
```

Then set `USE_ZONE_MATERIALIZED_VIEW=true` on the **API** Vercel project. Schedule refresh via Supabase cron.

---

## Hobby plan notes

| Topic | Hobby (free) |
|-------|----------------|
| **Projects** | 200 — two projects (web + API) is fine |
| **Function duration** | 300s max — plenty for API routes |
| **Invocations** | 1M/month |
| **Python bundle** | 500 MB max |
| **Commercial use** | Personal / non-commercial only — use **Pro** for a paid product |
| **Cold starts** | First API request after idle may be slower (~1–3s) |

Supabase stays on its own free tier (separate from Vercel).

---

## Health endpoints (API project)

| Path | Use |
|------|-----|
| `GET /health/` | Liveness |
| `GET /health/ready` | Readiness (DB check) — use for uptime monitors |
| `GET /health/supabase` | DB diagnostic |

Example uptime monitor URL:

```
https://soccer-analytics-api.vercel.app/health/ready
```

---

## Local production stack (optional)

Validate Docker images before or alongside Vercel:

```bash
pnpm docker:up:prod
curl http://localhost:8000/health/ready
open http://localhost:3000
pnpm docker:down:prod
```

Docker is for **local validation**; production uses Vercel serverless, not the API Dockerfile.

---

## Monitoring checklist

- [ ] Uptime check on API `GET /health/ready`
- [ ] `LOG_FORMAT=json` and `ENVIRONMENT=production` on API project
- [ ] `REQUIRE_AUTH=true` + `NEXT_PUBLIC_AUTH_ENABLED=true`
- [ ] `CORS_ORIGINS` matches web URL(s) (if cross-origin)
- [ ] Service role key only on API project — never on web
- [ ] Supabase RLS verified for guest demo data

---

## CLI deploy (alternative)

From repo root with [Vercel CLI](https://vercel.com/docs/cli) v48.1.8+:

```bash
cd apps/api && vercel --prod
cd apps/web && vercel --prod
```

Set env vars in the dashboard or via `vercel env add`.

---

## Optional: Render / Docker hosting

[`render.yaml`](./render.yaml) and API `Dockerfile` remain for teams that prefer a long-running container. **Not required** for Vercel-only.

---

## Related docs

- [SECURITY.md](./SECURITY.md) — secrets and auth policy
- [apps/api/.env.example](./apps/api/.env.example) — API config reference
- [apps/web/.env.example](./apps/web/.env.example) — web config reference
- [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) — CI and quality gates
- [Vercel FastAPI docs](https://vercel.com/docs/frameworks/backend/fastapi)