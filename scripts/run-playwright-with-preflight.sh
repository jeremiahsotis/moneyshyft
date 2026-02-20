#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
AUTO_START_STACK="${AUTO_START_STACK:-true}"
RUNTIME_DIR="${RUNTIME_DIR:-tests/artifacts/runtime}"
BACKEND_LOG_FILE="${RUNTIME_DIR}/backend.log"
FRONTEND_LOG_FILE="${RUNTIME_DIR}/frontend.log"
BACKEND_PID_FILE="${RUNTIME_DIR}/managed-backend.pid"
FRONTEND_PID_FILE="${RUNTIME_DIR}/managed-frontend.pid"

export API_URL
export API_BASE_URL="${API_BASE_URL:-$API_URL}"
export BASE_URL

mkdir -p "$RUNTIME_DIR"

BACKEND_PID=""
FRONTEND_PID=""
BACKEND_STARTED=false
FRONTEND_STARTED=false

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
  local attempts="${3:-90}"

  for ((i = 1; i <= attempts; i++)); do
    if curl --silent --show-error --fail --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Playwright preflight failed: $label is not reachable at $url"
  return 1
}

is_http_reachable() {
  local url="$1"
  curl --silent --show-error --fail --max-time 2 "$url" >/dev/null 2>&1
}

cleanup_pidfile_process() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$pid_file"
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Cleaning stale managed $label process (pid=$pid)"
    kill "$pid" >/dev/null 2>&1 || true
  fi
  rm -f "$pid_file"
}

print_runtime_logs() {
  echo "==== Backend log tail ===="
  if [[ -f "$BACKEND_LOG_FILE" ]]; then
    tail -n 120 "$BACKEND_LOG_FILE" || true
  else
    echo "No backend log found"
  fi

  echo "==== Frontend log tail ===="
  if [[ -f "$FRONTEND_LOG_FILE" ]]; then
    tail -n 120 "$FRONTEND_LOG_FILE" || true
  else
    echo "No frontend log found"
  fi
}

cleanup_started_processes() {
  if [[ "$FRONTEND_STARTED" == "true" && -n "$FRONTEND_PID" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
    wait "$FRONTEND_PID" >/dev/null 2>&1 || true
    rm -f "$FRONTEND_PID_FILE"
  fi
  if [[ "$BACKEND_STARTED" == "true" && -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
    rm -f "$BACKEND_PID_FILE"
  fi
}

on_exit() {
  local exit_code=$?
  cleanup_started_processes
  if [[ "$exit_code" -ne 0 ]]; then
    print_runtime_logs
  fi
}
trap on_exit EXIT

validate_loopback_host "$API_URL" "API_URL"
validate_loopback_host "$BASE_URL" "BASE_URL"

api_root="${API_URL%/}"
frontend_root="${BASE_URL%/}"

if ! is_http_reachable "$api_root/health" && ! is_http_reachable "$api_root/api/v1/health"; then
  if [[ "$AUTO_START_STACK" != "true" ]]; then
    echo "Playwright preflight failed: backend is not reachable and AUTO_START_STACK=false"
    exit 1
  fi

  cleanup_pidfile_process "$BACKEND_PID_FILE" "backend"

  echo "Managed runtime policy: running backend migrations"
  (cd src && npm run migrate:latest) >/dev/null 2>&1

  echo "Managed runtime policy: starting backend for this test run"
  : > "$BACKEND_LOG_FILE"
  (cd src && npm run dev) >"$BACKEND_LOG_FILE" 2>&1 &
  BACKEND_PID=$!
  BACKEND_STARTED=true
  echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

  wait_for_http "$api_root/health" "backend health endpoint" || wait_for_http "$api_root/api/v1/health" "backend API health endpoint"
fi

if ! is_http_reachable "$frontend_root/login" && ! is_http_reachable "$frontend_root"; then
  if [[ "$AUTO_START_STACK" != "true" ]]; then
    echo "Playwright preflight failed: frontend is not reachable and AUTO_START_STACK=false"
    exit 1
  fi

  cleanup_pidfile_process "$FRONTEND_PID_FILE" "frontend"

  echo "Managed runtime policy: starting frontend for this test run"
  : > "$FRONTEND_LOG_FILE"
  (cd frontend && VITE_API_PROXY_TARGET="$API_URL" npm run dev -- --host 127.0.0.1 --port 5173 --strictPort) >"$FRONTEND_LOG_FILE" 2>&1 &
  FRONTEND_PID=$!
  FRONTEND_STARTED=true
  echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

  wait_for_http "$frontend_root/login" "frontend login page" || wait_for_http "$frontend_root" "frontend root page"
fi

npx playwright test "$@"
