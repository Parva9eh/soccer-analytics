#!/usr/bin/env bash
# Vercel ignoreCommand for the API project.
# Exit 0 = skip this deployment, exit 1 = build and deploy.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"

if ! git -C "$ROOT" rev-parse HEAD^ >/dev/null 2>&1; then
  exit 1
fi

# diff-tree includes merge-commit changes (diff HEAD^ HEAD can miss merge-only diffs).
if git -C "$ROOT" diff-tree --no-commit-id --name-only -r -m HEAD | grep -q '^apps/api/'; then
  echo "apps/api changed — building API"
  exit 1
fi

echo "No apps/api changes — skipping API deploy"
exit 0