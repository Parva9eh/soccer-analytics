#!/usr/bin/env bash
# Vercel ignoreCommand for the API project.
# Exit 0 = skip this deployment, exit 1 = build and deploy.
set -euo pipefail

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  exit 1
fi

if git diff HEAD^ HEAD --quiet -- apps/api/; then
  echo "No apps/api changes — skipping API deploy"
  exit 0
fi

echo "apps/api changed — building API"
exit 1