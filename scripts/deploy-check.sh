#!/usr/bin/env bash
# Preflight checks before first production deploy (Vercel-only: web + API).
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

echo "=== Soccer Analytics — deploy preflight (Vercel-only) ==="
echo

echo "Repository"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ok "Git repo ($(git branch --show-current) @ $(git rev-parse --short HEAD))"
else
  bad "Not a git repository"
fi

for f in DEPLOY.md .env.production.example apps/web/vercel.json apps/api/vercel.json apps/api/pyproject.toml; do
  if [[ -f "$f" ]]; then ok "$f present"; else bad "$f missing"; fi
done

if grep -q 'tool.vercel' apps/api/pyproject.toml 2>/dev/null; then
  ok "apps/api pyproject.toml has [tool.vercel] entrypoint"
else
  bad "apps/api/pyproject.toml missing [tool.vercel] entrypoint"
fi

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
echo "Docker (optional — local prod validation, not used on Vercel)"
if command -v docker >/dev/null 2>&1; then
  ok "docker CLI available"
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon running"
  else
    note "Docker daemon not running — optional for pnpm docker:up:prod"
  fi
else
  note "docker not installed — Vercel deploy does not require Docker"
fi

echo
echo "API env (Vercel project: apps/api)"
if [[ -f apps/api/.env ]]; then
  ok "apps/api/.env exists (reference for API Vercel env vars)"
  # shellcheck disable=SC1091
  set +u
  source apps/api/.env 2>/dev/null || true
  set -u
  for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DATABASE_URL; do
    if [[ -n "${!var:-}" && "${!var}" != *"your-"* && "${!var}" != *"xxxxx"* ]]; then
      ok "$var looks configured locally"
    else
      note "$var — set in API Vercel project before deploy"
    fi
  done
else
  note "apps/api/.env not found — copy from apps/api/.env.example; set secrets in Vercel API project"
fi

echo
echo "Web env (Vercel project: apps/web)"
if [[ -f apps/web/.env.local ]]; then
  ok "apps/web/.env.local exists (reference for web Vercel env vars)"
else
  note "apps/web/.env.local not found — set NEXT_PUBLIC_* and API_PROXY_TARGET in Vercel web project"
fi

echo
echo "Supabase migrations"
if [[ -d supabase/migrations ]]; then
  count=$(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ')
  ok "$count migration file(s) in supabase/migrations"
  if [[ -f supabase/migrations/20250605000000_season_team_zone_stats.sql ]]; then
    note "Zone MV migration present — apply in Supabase before USE_ZONE_MATERIALIZED_VIEW=true"
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

echo "Ready for Vercel-only deploy (see DEPLOY.md):"
echo "  1. Vercel project: apps/api  → deploy API → smoke /health/ready"
echo "  2. Vercel project: apps/web  → set API_PROXY_TARGET + NEXT_PUBLIC_*"
echo "  3. Supabase auth URLs → web domain"
echo "  4. Uptime monitor → https://<api-project>.vercel.app/health/ready"
echo
echo "Hobby plan: personal/non-commercial use; two Vercel projects OK."
exit 0