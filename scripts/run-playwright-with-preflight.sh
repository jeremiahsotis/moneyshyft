#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"

export API_URL
export API_BASE_URL="${API_BASE_URL:-$API_URL}"
export BASE_URL

validate_loopback_host() {
  local url="$1"
  local label="$2"

  local host
  host="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.hostname);" "$url")"
  if [[ "$host" != "127.0.0.1" ]]; then
    echo "Playwright preflight failed: $label must use host 127.0.0.1 (got: $url)"
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-30}"

  for ((i = 1; i <= attempts; i++)); do
    if curl --silent --show-error --fail --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Playwright preflight failed: $label is not reachable at $url"
  return 1
}

validate_loopback_host "$API_URL" "API_URL"
validate_loopback_host "$BASE_URL" "BASE_URL"

api_root="${API_URL%/}"
frontend_root="${BASE_URL%/}"

wait_for_http "$api_root/health" "backend health endpoint" || wait_for_http "$api_root/api/v1/health" "backend API health endpoint"
wait_for_http "$frontend_root/login" "frontend login page" || wait_for_http "$frontend_root" "frontend root page"

exec npx playwright test "$@"
