# Soccer Analytics — Web

Next.js 16 frontend for the Soccer Analytics platform: matches, players, analytics dashboards, workspaces, and collaboration.

**Production:** `https://<your-web-project>.vercel.app` (your Vercel web project URL)

## Prerequisites

- Node.js 18+
- pnpm 11 (see `packageManager` in `package.json`)
- Running API — local (`:8000`) or production Vercel API project

## Local development

```bash
# From apps/web
cp .env.example .env.local
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

From repo root: `pnpm dev:web`

## Environment variables

Copy `apps/web/.env.example` → `.env.local`.

| Variable | Local | Production |
|----------|-------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Same-origin: `https://<web>/backend` (see below) |
| `API_PROXY_TARGET` | — | `https://<api>.vercel.app` (server-only; required for `/backend` rewrites) |
| `NEXT_PUBLIC_AUTH_ENABLED` | `false` | `true` when using Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (public by design) | Same |

See [SECURITY.md](../../SECURITY.md) — never put the service role key in the web app.

### API URL options (production)

**Same-origin proxy (recommended)** — browser calls `/backend/...` on the web domain; Next.js rewrites to the API:

```
API_PROXY_TARGET=https://<your-api-project>.vercel.app
NEXT_PUBLIC_API_URL=https://<your-web-project>.vercel.app/backend
```

Set `API_PROXY_TARGET` before `pnpm build` / Vercel deploy (rewrites are baked at build time).

**Cross-origin** — browser calls the API URL directly; API needs `CORS_ORIGINS`:

```
NEXT_PUBLIC_API_URL=https://<your-api-project>.vercel.app
```

Full runbook: [DEPLOY.md](../../DEPLOY.md)

## Authentication

When `NEXT_PUBLIC_AUTH_ENABLED=true`:

- Supabase Auth (email, Google, GitHub) via `@supabase/ssr`
- `proxy.ts` refreshes session cookies and guards UI routes
- **Guest browsing** — `/`, `/matches`, `/players`, `/analytics` without sign-in
- Collaboration routes (`/settings`, `/reports`, `/analyses`, …) require sign-in
- `/backend/*` is excluded from page auth — FastAPI enforces JWT / RLS on data

OAuth setup: [PLAN.md](../../PLAN.md#before-production-deploy-auth--oauth) · [supabase/README.md](../../supabase/README.md)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build locally |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright smoke (starts mock API) |

## Vercel deployment

1. Vercel project **Root Directory:** `apps/web`
2. Config: `vercel.json` (install/build commands + `ignoreCommand`)
3. Selective deploy: skips when only `apps/api/` changed on the latest commit

```bash
cd apps/web && vercel --prod
```

## Docker (optional)

- **Dev:** `docker-compose.yml` — hot-reload web + API
- **Prod image:** `Dockerfile.prod` + `pnpm docker:up:prod` from repo root

Vercel production does **not** use `standalone` output; Docker does.

## Key paths

| Path | Purpose |
|------|---------|
| `app/` | App Router pages and layouts |
| `lib/api.ts` | `apiFetch` / `getApiUrl` — attaches Bearer token when signed in |
| `lib/auth-config.ts` | Guest vs auth-required routes |
| `proxy.ts` | Session refresh + route guard |
| `next.config.mjs` | Rewrites, standalone (Docker), Turbopack root (dev) |

## Related docs

- [apps/api/README.md](../api/README.md) — API endpoints
- [DEPLOY.md](../../DEPLOY.md) — full deployment guide
- [PHASE5_SUMMARY.md](../../PHASE5_SUMMARY.md) — CI, Docker, production ops