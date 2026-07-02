#!/usr/bin/env bash
# Load a full StatsBomb open-data season into Supabase (service role required in apps/api/.env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

PRESET="${1:-expansion}"
EXTRA_ARGS=()

if [[ "$PRESET" == "expansion" ]]; then
  EXTRA_ARGS=(--preset expansion)
elif [[ "$PRESET" == "demo" ]]; then
  EXTRA_ARGS=(--preset demo)
else
  COMPETITION="${1:?Competition name required when not using demo|expansion preset}"
  SEASON="${2:?Season required when not using demo|expansion preset}"
  EXTRA_ARGS=(--competition "$COMPETITION" --season "$SEASON")
fi

echo "→ Loading StatsBomb season (${EXTRA_ARGS[*]})"
uv run python -m etl.cli --load-season "${EXTRA_ARGS[@]}"
echo "→ Done. Link the season under Settings → Workspace → Data access."