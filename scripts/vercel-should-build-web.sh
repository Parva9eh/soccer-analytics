#!/usr/bin/env bash
# Vercel ignoreCommand for the web project.
# Exit 0 = skip this deployment, exit 1 = build and deploy.
set -euo pipefail

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  exit 1
fi

if git diff HEAD^ HEAD --quiet -- apps/web/; then
  echo "No apps/web changes — skipping web deploy"
  exit 0
fi

echo "apps/web changed — building web"
exit 1