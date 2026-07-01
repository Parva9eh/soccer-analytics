#!/usr/bin/env bash
# Preflight checks before first production deploy (Vercel + Render).
# Usage: pnpm deploy:check

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass=0
warn=0
fail=0

ok()   { echo "  ✓ $1"; pass=$((pass + 1)); }
note() { echo "  · $1"; warn=$((warn + 1)); }
bad()  { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=== Soccer Analytics — deploy preflight ==="
echo

echo "Repository"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ok "Git repo ($(git branch --show-current) @ $(git rev-parse --short HEAD))"
else
  bad "Not a git repository"
fi

for f in DEPLOY.md render.yaml .env.production.example apps/web/vercel.json apps/api/Dockerfile apps/web/Dockerfile.prod; do
  if [[ -f "$f" ]]; then ok "$f present"; else bad "$f missing"; fi
done

echo
echo "Local quality gates"
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm available"
else
  bad "pnpm not found"
fi

if [[ -f apps/api/uv.lock ]]; then ok "apps/api/uv.lock committed"; else bad "apps/api/uv.lock missing"; fi
if [[ -f apps/web/pnpm-lock.yaml ]]; then ok "apps/web/pnpm-lock.yaml present"; else bad "apps/web/pnpm-lock.yaml missing"; fi

echo
echo "Docker (optional — for local prod validation)"
if command -v docker >/dev/null 2>&1; then
  ok "docker CLI available"
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon running"
  else
    note "Docker daemon not running — start Docker Desktop before pnpm docker:up:prod"
  fi
else
  note "docker not installed — skip local prod stack; CI still builds images"
fi

echo
echo "API env (Render)"
if [[ -f apps/api/.env ]]; then
  ok "apps/api/.env exists (use as reference for Render secrets)"
  # shellcheck disable=SC1091
  set +u
  source apps/api/.env 2>/dev/null || true
  set -u
  for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DATABASE_URL; do
    if [[ -n "${!var:-}" && "${!var}" != *"your-"* && "${!var}" != *"xxxxx"* ]]; then
      ok "$var looks configured locally"
    else
      note "$var — set in Render dashboard before deploy"
    fi
  done
else
  note "apps/api/.env not found — copy from apps/api/.env.example for local dev; use Render dashboard for production"
fi

echo
echo "Web env (Vercel)"
if [[ -f apps/web/.env.local ]]; then
  ok "apps/web/.env.local exists (reference for Vercel env vars)"
else
  note "apps/web/.env.local not found — set NEXT_PUBLIC_* in Vercel project settings"
fi

echo
echo "Supabase migrations"
if [[ -d supabase/migrations ]]; then
  count=$(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ')
  ok "$count migration file(s) in supabase/migrations"
  if [[ -f supabase/migrations/20250605000000_season_team_zone_stats.sql ]]; then
    note "Zone materialized view migration present — apply in Supabase before USE_ZONE_MATERIALIZED_VIEW=true"
  fi
else
  bad "supabase/migrations/ not found"
fi

echo
echo "=== Summary ==="
echo "  Passed: $pass  Notes: $warn  Failed: $fail"
echo
if [[ $fail -gt 0 ]]; then
  echo "Fix failed checks, then re-run: pnpm deploy:check"
  exit 1
fi

echo "Ready for deploy workflow:"
echo "  1. pnpm docker:up:prod     # optional local prod smoke"
echo "  2. Deploy API on Render    # see DEPLOY.md §1"
echo "  3. Deploy web on Vercel    # see DEPLOY.md §2"
echo "  4. Configure Supabase auth URLs"
echo "  5. Uptime monitor → GET /health/ready"
exit 0