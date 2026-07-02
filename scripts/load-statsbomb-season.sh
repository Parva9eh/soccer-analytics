#!/usr/bin/env bash
# Load a full StatsBomb open-data season into Supabase.
# Requires apps/api/.env with SUPABASE_SERVICE_ROLE_KEY.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

PRESET="${1:-expansion}"

case "$PRESET" in
  expansion)
    LOAD_ARGS=(--preset expansion)
    ;;
  demo)
    LOAD_ARGS=(--preset demo)
    ;;
  *)
    if [[ $# -lt 2 ]]; then
      echo "Usage: $0 [demo|expansion|\"Competition Name\" \"Season\"]" >&2
      exit 1
    fi
    LOAD_ARGS=(--competition "$1" --season "$2")
    ;;
esac

echo "-> Verifying ETL preflight"
uv run python -m etl.cli --verify-etl

echo "-> Loading StatsBomb season: ${LOAD_ARGS[*]}"
uv run python -m etl.cli --load-season "${LOAD_ARGS[@]}"
echo "-> Done. Link the season under Settings -> Workspace -> Data access."