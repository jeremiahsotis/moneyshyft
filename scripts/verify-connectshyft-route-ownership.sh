#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONEY_ROUTER="$ROOT_DIR/apps/moneyshyft-web/src/router/index.ts"
CONNECT_ROUTER="$ROOT_DIR/apps/connectshyft-web/src/router/index.ts"

if rg -q "path:\s*'/app/connectshyft" "$MONEY_ROUTER"; then
  echo "Route ownership check failed: moneyshyft-web still defines /app/connectshyft routes"
  rg -n "path:\s*'/app/connectshyft" "$MONEY_ROUTER" || true
  exit 1
fi

required_routes=(
  "/app/connectshyft/inbox"
  "/app/connectshyft/mine"
  "/app/connectshyft/more"
  "/app/connectshyft/settings"
  "/app/connectshyft/threads/:threadId"
  "/app/connectshyft/settings/availability"
  "/app/connectshyft/settings/numbers"
  "/app/connectshyft/settings/escalation"
  "/app/connectshyft/neighbors/new"
  "/app/connectshyft/neighbors/:neighborId"
  "/app/connectshyft/directory"
)

for route in "${required_routes[@]}"; do
  if ! rg -q "path:\s*'${route//\//\\/}'" "$CONNECT_ROUTER"; then
    echo "Route ownership check failed: missing required connectshyft route $route"
    exit 1
  fi
done

echo "Route ownership check passed"
