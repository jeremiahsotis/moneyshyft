#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${API_URL:-}" ]]; then
  echo "API_URL is required for backend-connected contract tests"
  exit 1
fi

if ! rg -n "@contracts:backend" tests >/dev/null 2>&1; then
  echo "No @contracts:backend tests found. Skipping backend contract lane."
  exit 0
fi

npm run test:e2e -- --grep "@contracts:backend"
