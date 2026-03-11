#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: bash scripts/ci-run-playwright-stack.sh <command> [args...]"
  exit 1
fi

runtime_dir="tests/artifacts/runtime"
mkdir -p "$runtime_dir"
backend_log="$runtime_dir/backend.log"
frontend_log="$runtime_dir/frontend.log"
money_frontend_log="$runtime_dir/money-frontend.log"
connect_frontend_log="$runtime_dir/connect-frontend.log"
frontend_proxy_log="$runtime_dir/frontend-proxy.log"

: > "$backend_log"
: > "$frontend_log"
: > "$money_frontend_log"
: > "$connect_frontend_log"
: > "$frontend_proxy_log"

export TEST_ENV="${TEST_ENV:-local}"
export TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-test1234}"
export ENABLE_TEST_AUTH_HARNESS="${ENABLE_TEST_AUTH_HARNESS:-true}"
export ENABLE_TEST_CONNECTSHYFT_FLAGS="${ENABLE_TEST_CONNECTSHYFT_FLAGS:-true}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test-jwt-refresh-secret}"
export PLAYWRIGHT_BACKEND_NODE_ENV="${PLAYWRIGHT_BACKEND_NODE_ENV:-test}"
export BASE_URL="${BASE_URL:-http://localhost:5174}"
export API_URL="${API_URL:-http://localhost:3000}"
export API_BASE_URL="${API_BASE_URL:-$API_URL}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5174}"
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://localhost:3000}"
export VITE_ADMIN_API_PROXY_TARGET="${VITE_ADMIN_API_PROXY_TARGET:-$API_URL}"
export VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS="${VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS:-$ENABLE_TEST_CONNECTSHYFT_FLAGS}"
export PLAYWRIGHT_FRONTEND_APP_DIR="${PLAYWRIGHT_FRONTEND_APP_DIR:-apps/connectshyft-web}"
export PLAYWRIGHT_MULTI_FRONTEND_PROXY="${PLAYWRIGHT_MULTI_FRONTEND_PROXY:-auto}"
export PLAYWRIGHT_CI_STACK_ACTIVE=true
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
frontend_host="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.hostname);" "$BASE_URL")"
frontend_port="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.port || '5174');" "$BASE_URL")"
internal_frontend_host="${PLAYWRIGHT_INTERNAL_FRONTEND_HOST:-127.0.0.1}"
money_frontend_dir="apps/moneyshyft-web"
connect_frontend_dir="apps/connectshyft-web"
frontend_app_dir="$PLAYWRIGHT_FRONTEND_APP_DIR"
use_multi_frontend_proxy=false

if [[ "$PLAYWRIGHT_MULTI_FRONTEND_PROXY" != "false" \
  && -f "$money_frontend_dir/package.json" \
  && -f "$connect_frontend_dir/package.json" ]]; then
  use_multi_frontend_proxy=true
fi

if [[ "$use_multi_frontend_proxy" != "true" && ! -f "$frontend_app_dir/package.json" ]]; then
  echo "Frontend app directory '$frontend_app_dir' is invalid. Set PLAYWRIGHT_FRONTEND_APP_DIR to a valid app path."
  exit 1
fi

print_runtime_logs() {
  echo "==== Backend log tail ===="
  if [[ -f "$backend_log" ]]; then
    tail -n 200 "$backend_log" || true
  else
    echo "No backend log found"
  fi
  echo "==== Frontend log tail ===="
  if [[ -f "$frontend_log" ]]; then
    tail -n 200 "$frontend_log" || true
  else
    echo "No frontend log found"
  fi
  if [[ -f "$money_frontend_log" ]]; then
    echo "==== MoneyShyft frontend log tail ===="
    tail -n 200 "$money_frontend_log" || true
  fi
  if [[ -f "$connect_frontend_log" ]]; then
    echo "==== ConnectShyft frontend log tail ===="
    tail -n 200 "$connect_frontend_log" || true
  fi
  if [[ -f "$frontend_proxy_log" ]]; then
    echo "==== Frontend proxy log tail ===="
    tail -n 200 "$frontend_proxy_log" || true
  fi
}

terminate_process_tree() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return 0
  fi

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  if command -v pgrep >/dev/null 2>&1; then
    local child_pids
    child_pids="$(pgrep -P "$pid" 2>/dev/null || true)"
    if [[ -n "$child_pids" ]]; then
      while IFS= read -r child_pid; do
        [[ -z "$child_pid" ]] && continue
        terminate_process_tree "$child_pid"
      done <<< "$child_pids"
    fi
  fi

  kill "$pid" >/dev/null 2>&1 || true

  local attempt
  for ((attempt = 1; attempt <= 20; attempt++)); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done

  kill -9 "$pid" >/dev/null 2>&1 || true
}

cleanup_pid() {
  local pid="${1:-}"

  if [[ -z "$pid" ]]; then
    return 0
  fi

  terminate_process_tree "$pid"
  wait "$pid" >/dev/null 2>&1 || true
}

cleanup() {
  local exit_code=$?
  cleanup_pid "${FRONTEND_PROXY_PID:-}"
  cleanup_pid "${MONEY_FRONTEND_PID:-}"
  cleanup_pid "${CONNECT_FRONTEND_PID:-}"
  cleanup_pid "${FRONTEND_PID:-}"
  cleanup_pid "${BACKEND_PID:-}"

  if [[ "$exit_code" -ne 0 ]]; then
    print_runtime_logs
  fi
}
trap cleanup EXIT

wait_for_http() {
  local url="$1"
  local label="$2"
  local pid="${3:-}"
  local attempts="${4:-30}"

  for ((i = 1; i <= attempts; i++)); do
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      echo "Failed: $label process (PID $pid) died unexpectedly during startup."
      return 1
    fi
    if curl --silent --show-error --fail --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for $label at $url"
  return 1
}

echo "Ensuring pgcrypto extension is enabled"
node <<'NODE'
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.exit(0);
}

const knexFactory = require(path.resolve(process.cwd(), 'apps/moneyshyft-api/node_modules/knex'));
const db = knexFactory({
  client: 'pg',
  connection: databaseUrl,
});

(async () => {
  await db.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
})()
  .catch((error) => {
    console.error('Failed to ensure pgcrypto extension:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
NODE

echo "Ensuring platform events/outbox tables are present"
NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" node scripts/repair-platform-events-outbox.cjs

echo "Running backend migrations"
NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" npm run migrate:latest --prefix apps/moneyshyft-api

echo "Verifying backend port $PORT is available..."
node -e "
const net = require('net');
const port = Number(process.env.PORT);
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(\`ERROR: Port \${port} is already in use by another process! CI stack cannot start securely.\`);
    process.exit(1);
  }
});
server.once('listening', () => {
  server.close();
  process.exit(0);
});
server.listen(port);
" || exit 1

echo "Starting backend dev server"
(cd apps/moneyshyft-api && NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" npm run dev) > "$backend_log" 2>&1 &
BACKEND_PID=$!

wait_for_http "${API_URL%/}/health" "backend health endpoint" "$BACKEND_PID" 30 || {
  echo "Backend failed to start or bind to ${API_URL%/}. Check logs for process conflicts or port mismatches."
  exit 1
}

if [[ "$use_multi_frontend_proxy" == "true" ]]; then
  money_frontend_port=$((frontend_port + 1))
  connect_frontend_port=$((frontend_port + 2))
  money_frontend_url="http://${internal_frontend_host}:${money_frontend_port}"
  connect_frontend_url="http://${internal_frontend_host}:${connect_frontend_port}"

  echo "Starting MoneyShyft frontend dev server on ${money_frontend_url}"
  (cd "$money_frontend_dir" && \
    VITE_API_PROXY_TARGET="$API_URL" \
    VITE_ADMIN_API_PROXY_TARGET="$VITE_ADMIN_API_PROXY_TARGET" \
    npm run dev -- --host "$internal_frontend_host" --port "$money_frontend_port" --strictPort) \
    > "$money_frontend_log" 2>&1 &
  MONEY_FRONTEND_PID=$!

  echo "Starting ConnectShyft frontend dev server on ${connect_frontend_url}"
  (cd "$connect_frontend_dir" && \
    VITE_API_PROXY_TARGET="$API_URL" \
    VITE_ADMIN_API_PROXY_TARGET="$VITE_ADMIN_API_PROXY_TARGET" \
    npm run dev -- --host "$internal_frontend_host" --port "$connect_frontend_port" --strictPort) \
    > "$connect_frontend_log" 2>&1 &
  CONNECT_FRONTEND_PID=$!

  wait_for_http "${money_frontend_url}/login" "MoneyShyft frontend login page" "$MONEY_FRONTEND_PID" 30 || {
    echo "MoneyShyft frontend failed to start on ${money_frontend_url}."
    exit 1
  }
  wait_for_http "${connect_frontend_url}/login" "ConnectShyft frontend login page" "$CONNECT_FRONTEND_PID" 30 || {
    echo "ConnectShyft frontend failed to start on ${connect_frontend_url}."
    exit 1
  }

  echo "Starting unified frontend proxy on ${BASE_URL%/}"
  (env \
    BASE_URL="$BASE_URL" \
    PLAYWRIGHT_PROXY_HOST="$frontend_host" \
    PLAYWRIGHT_PROXY_PORT="$frontend_port" \
    PLAYWRIGHT_API_PROXY_TARGET="$API_URL" \
    PLAYWRIGHT_MONEY_FRONTEND_URL="$money_frontend_url" \
    PLAYWRIGHT_CONNECT_FRONTEND_URL="$connect_frontend_url" \
    node scripts/playwright-frontend-proxy.mjs) > "$frontend_proxy_log" 2>&1 &
  FRONTEND_PROXY_PID=$!

  wait_for_http "${BASE_URL%/}/login" "frontend login page" "$FRONTEND_PROXY_PID" 30 || {
    echo "Unified frontend proxy failed to start on ${BASE_URL%/}."
    exit 1
  }
else
  echo "Starting frontend dev server"
  (cd "$frontend_app_dir" && \
    VITE_API_PROXY_TARGET="$API_URL" \
    VITE_ADMIN_API_PROXY_TARGET="$VITE_ADMIN_API_PROXY_TARGET" \
    npm run dev -- --host "$frontend_host" --port "$frontend_port" --strictPort) > "$frontend_log" 2>&1 &
  FRONTEND_PID=$!

  wait_for_http "${BASE_URL%/}/login" "frontend login page" "$FRONTEND_PID" 30 || {
    echo "Frontend failed to start on ${BASE_URL%/}."
    exit 1
  }
fi

echo "Running test command: $*"
"$@"
