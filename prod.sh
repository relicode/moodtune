#!/usr/bin/env bash
set -euo pipefail

# Source .env so we can validate required variables
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

if [[ "${JWT_SECRET:-change-me-to-a-random-secret}" == "change-me-to-a-random-secret" ]]; then
  echo "ERROR: JWT_SECRET is still the default value. Set a real secret in .env before running production." >&2
  exit 1
fi

exec docker compose -f compose.yaml -f compose.production.yaml "$@"
