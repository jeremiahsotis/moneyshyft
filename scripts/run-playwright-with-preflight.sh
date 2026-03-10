#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
BASE_URL="${BASE_URL:-http://localhost:5174}"
AUTO_START_STACK="${AUTO_START_STACK:-true}"
PLAYWRIGHT_STACK_MODE="${PLAYWRIGHT_STACK_MODE:-always}"
RUNTIME_DIR="${RUNTIME_DIR:-tests/artifacts/runtime}"
BACKEND_LOG_FILE="${RUNTIME_DIR}/backend.log"
FRONTEND_LOG_FILE="${RUNTIME_DIR}/frontend.log"
BACKEND_PID_FILE="${RUNTIME_DIR}/managed-backend.pid"
FRONTEND_PID_FILE="${RUNTIME_DIR}/managed-frontend.pid"
TEST_ENV="${TEST_ENV:-local}"
TEST_EMAIL="${TEST_EMAIL:-operator@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-SecurePass123!}"
ENABLE_TEST_AUTH_HARNESS="${ENABLE_TEST_AUTH_HARNESS:-true}"
ENABLE_TEST_CONNECTSHYFT_FLAGS="${ENABLE_TEST_CONNECTSHYFT_FLAGS:-true}"
PLAYWRIGHT_BACKEND_NODE_ENV="${PLAYWRIGHT_BACKEND_NODE_ENV:-test}"
PLAYWRIGHT_DATABASE_URL="${PLAYWRIGHT_DATABASE_URL:-}"
PLAYWRIGHT_POSTGRES_CONTAINER="${PLAYWRIGHT_POSTGRES_CONTAINER:-moneyshyft-postgres-1}"

export API_URL
export API_BASE_URL="$API_URL"
export BASE_URL
export FRONTEND_URL="${FRONTEND_URL:-$BASE_URL}"
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-$API_URL}"
export TEST_ENV
export TEST_EMAIL
export TEST_PASSWORD
export ENABLE_TEST_AUTH_HARNESS
export ENABLE_TEST_CONNECTSHYFT_FLAGS
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test-jwt-refresh-secret}"
export PLAYWRIGHT_BACKEND_NODE_ENV
export PLAYWRIGHT_TEST_RUN_SEED="${PLAYWRIGHT_TEST_RUN_SEED:-$(date +%s)}"
export PLAYWRIGHT_TEST_TIMESTAMP_BASE="${PLAYWRIGHT_TEST_TIMESTAMP_BASE:-$(date +%s)}"

mkdir -p "$RUNTIME_DIR"
: > "$BACKEND_LOG_FILE"
: > "$FRONTEND_LOG_FILE"

BACKEND_PID=""
FRONTEND_PID=""
BACKEND_STARTED=false
FRONTEND_STARTED=false
FORCE_MANAGED_STACK=false

if [[ "$PLAYWRIGHT_STACK_MODE" != "always" && "$PLAYWRIGHT_STACK_MODE" != "auto" ]]; then
  echo "Playwright preflight failed: PLAYWRIGHT_STACK_MODE must be 'always' or 'auto' (got '$PLAYWRIGHT_STACK_MODE')."
  exit 1
fi

if [[ "$PLAYWRIGHT_STACK_MODE" == "always" ]]; then
  FORCE_MANAGED_STACK=true
fi

validate_allowed_host() {
  local url="$1"
  local label="$2"
  local allowed_hosts="$3"

  local host
  host="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.hostname);" "$url")"
  if [[ ! ",$allowed_hosts," == *",$host,"* ]]; then
    echo "Playwright preflight failed: $label must use one of [$allowed_hosts] (got: $url)"
    exit 1
  fi
}

find_available_port() {
  local start_port="$1"
  local max_port=$((start_port + 50))
  local port="$start_port"
  while [[ "$port" -le "$max_port" ]]; do
    if ! is_port_occupied "$port"; then
      printf '%s' "$port"
      return 0
    fi
    port=$((port + 1))
  done
  return 1
}

is_port_occupied() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  node -e "
const net = require('net');
const port = Number(process.argv[1]);
const hosts = ['127.0.0.1', '::1'];
let index = 0;

const tryNextHost = () => {
  if (index >= hosts.length) {
    process.exit(1);
  }

  const socket = net.connect({ host: hosts[index], port });
  let settled = false;
  const complete = (occupied) => {
    if (settled) {
      return;
    }
    settled = true;
    socket.destroy();
    if (occupied) {
      process.exit(0);
    }
    index += 1;
    setImmediate(tryNextHost);
  };

  socket.once('connect', () => complete(true));
  socket.once('error', () => complete(false));
  socket.setTimeout(250, () => complete(false));
};

tryNextHost();
" "$port" >/dev/null 2>&1
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

is_backend_healthy() {
  is_http_reachable "$api_root/health" || is_http_reachable "$api_root/api/v1/health"
}

is_frontend_reachable() {
  is_http_reachable "$frontend_root/login" || is_http_reachable "$frontend_root"
}

resolve_app_dir() {
  for candidate in "$@"; do
    if [[ -f "$candidate/package.json" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

ensure_runtime_node_modules_link() {
  local link_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "$link_path")"

  if [[ -L "$link_path" ]]; then
    local current_target
    current_target="$(readlink "$link_path" || true)"
    if [[ "$current_target" == "$target_path" ]]; then
      return 0
    fi
    rm -f "$link_path"
  elif [[ -e "$link_path" ]]; then
    return 0
  fi

  ln -s "$target_path" "$link_path"
}

redact_connection_url() {
  local raw_url="$1"
  node -e "
const value = process.argv[1];
try {
  const parsed = new URL(value);
  if (parsed.username) {
    parsed.username = '***';
  }
  if (parsed.password) {
    parsed.password = '***';
  }
  process.stdout.write(parsed.toString());
} catch (_error) {
  process.stdout.write('<invalid-connection-url>');
}
" "$raw_url"
}

resolve_docker_postgres_url() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  if ! docker ps --format '{{.Names}}' | grep -Fxq "$PLAYWRIGHT_POSTGRES_CONTAINER"; then
    return 1
  fi

  local container_env
  container_env="$(docker inspect "$PLAYWRIGHT_POSTGRES_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)"
  if [[ -z "$container_env" ]]; then
    return 1
  fi

  local db_user db_password db_name db_port
  db_user="$(printf '%s\n' "$container_env" | sed -n 's/^POSTGRES_USER=//p' | head -n1)"
  db_password="$(printf '%s\n' "$container_env" | sed -n 's/^POSTGRES_PASSWORD=//p' | head -n1)"
  db_name="$(printf '%s\n' "$container_env" | sed -n 's/^POSTGRES_DB=//p' | head -n1)"
  db_port="$(docker inspect "$PLAYWRIGHT_POSTGRES_CONTAINER" --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' 2>/dev/null || true)"

  if [[ -z "$db_user" || -z "$db_password" || -z "$db_name" || -z "$db_port" ]]; then
    return 1
  fi

  node -e "
const [user, password, database, port] = process.argv.slice(1);
const encodedUser = encodeURIComponent(user);
const encodedPassword = encodeURIComponent(password);
const encodedDatabase = encodeURIComponent(database);
process.stdout.write(\`postgresql://\${encodedUser}:\${encodedPassword}@127.0.0.1:\${port}/\${encodedDatabase}\`);
" "$db_user" "$db_password" "$db_name" "$db_port"
}

run_backend_migrations() {
  local initial_database_url="${DATABASE_URL:-$PLAYWRIGHT_DATABASE_URL}"
  if [[ -n "$initial_database_url" ]]; then
    export DATABASE_URL="$initial_database_url"
  fi

  if (cd "$BACKEND_APP_DIR" && NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" npm run migrate:latest) >>"$BACKEND_LOG_FILE" 2>&1; then
    return 0
  fi

  local fallback_database_url
  fallback_database_url="$(resolve_docker_postgres_url || true)"
  if [[ -z "$fallback_database_url" || "${DATABASE_URL:-}" == "$fallback_database_url" ]]; then
    return 1
  fi

  local redacted_fallback
  redacted_fallback="$(redact_connection_url "$fallback_database_url")"
  echo "Managed runtime policy: migration retry using docker postgres credentials ($redacted_fallback)" >>"$BACKEND_LOG_FILE"

  export DATABASE_URL="$fallback_database_url"
  (cd "$BACKEND_APP_DIR" && NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" npm run migrate:latest) >>"$BACKEND_LOG_FILE" 2>&1
}

build_tenant_probe_token() {
  node -e "
const fs = require('fs');
const path = require('path');

const backendAppDir = process.env.PLAYWRIGHT_BACKEND_APP_DIR || 'apps/moneyshyft-api';
const backendEnvPath = path.resolve(process.cwd(), backendAppDir, '.env');
let jwtSecret = (process.env.JWT_SECRET || '').trim();
if (!jwtSecret) {
  jwtSecret = 'your_jwt_secret_change_in_production';
  if (fs.existsSync(backendEnvPath)) {
    for (const rawLine of fs.readFileSync(backendEnvPath, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (line.startsWith('JWT_SECRET=')) {
        jwtSecret = line.slice('JWT_SECRET='.length).trim();
        break;
      }
    }
  }
}

let jwt;
try {
  jwt = require(path.resolve(process.cwd(), backendAppDir, 'node_modules/jsonwebtoken'));
} catch {
  process.exit(1);
}

const payload = {
  userId: 'preflight-probe-user',
  email: 'preflight-probe@example.com',
  householdId: 'preflight-probe-tenant',
  activeTenantId: 'preflight-probe-tenant',
  activeOrgUnitId: null,
  role: 'TENANT_STAFF',
};

process.stdout.write(jwt.sign(payload, jwtSecret, { expiresIn: '2h' }));
"
}

is_backend_tenant_contract_ready() {
  local token
  token="$(build_tenant_probe_token)" || return 1

  local csrf_token
  csrf_token="probe-csrf-$(date +%s)"

  local response_file
  response_file="$(mktemp)"

  local status
  status="$(curl --silent --show-error --max-time 4 \
    --output "$response_file" \
    --write-out "%{http_code}" \
    -H "x-csrf-token: $csrf_token" \
    -H "cookie: access_token=$token; csrf_token=$csrf_token" \
    "$api_root/api/v1/platform/_kernel/tenancy/diagnostics" || true)"

  local ready=false
  if [[ "$status" == "200" ]] && grep -q "TENANCY_DIAGNOSTICS_READY" "$response_file"; then
    ready=true
  fi

  rm -f "$response_file"
  [[ "$ready" == "true" ]]
}

is_test_auth_ready() {
  local status
  status="$(curl --silent --show-error --max-time 4 \
    --output /dev/null \
    --write-out "%{http_code}" \
    -H "content-type: application/json" \
    --data "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$api_root/api/v1/auth/login" || true)"
  [[ "$status" == "200" ]]
}

is_connectshyft_override_ready() {
  if [[ "$ENABLE_TEST_CONNECTSHYFT_FLAGS" != "true" ]]; then
    return 0
  fi

  local override_a
  local override_b
  override_a='{"connectshyft_enabled":true,"connectshyft_inbox_enabled":false,"connectshyft_escalation_enabled":true,"connectshyft_webhooks_enabled":false}'
  override_b='{"connectshyft_enabled":false,"connectshyft_inbox_enabled":true,"connectshyft_escalation_enabled":false,"connectshyft_webhooks_enabled":true}'

  local response_a
  local response_b
  response_a="$(mktemp)"
  response_b="$(mktemp)"

  local status_a
  local status_b
  status_a="$(curl --silent --show-error --max-time 4 \
    --output "$response_a" \
    --write-out "%{http_code}" \
    -H "x-test-connectshyft-flags: $override_a" \
    "$api_root/api/v1/connectshyft/availability" || true)"
  status_b="$(curl --silent --show-error --max-time 4 \
    --output "$response_b" \
    --write-out "%{http_code}" \
    -H "x-test-connectshyft-flags: $override_b" \
    "$api_root/api/v1/connectshyft/availability" || true)"

  local ready=false
  if [[ "$status_a" == "200" && "$status_b" == "200" ]]; then
    if node -e "
const fs = require('fs');

const [responseAPath, responseBPath, expectedAJson, expectedBJson] = process.argv.slice(1);
const responseA = JSON.parse(fs.readFileSync(responseAPath, 'utf8'));
const responseB = JSON.parse(fs.readFileSync(responseBPath, 'utf8'));
const expectedA = JSON.parse(expectedAJson);
const expectedB = JSON.parse(expectedBJson);

const sameFlags = (actual, expected) =>
  actual
  && actual.connectshyft_enabled === expected.connectshyft_enabled
  && actual.connectshyft_inbox_enabled === expected.connectshyft_inbox_enabled
  && actual.connectshyft_escalation_enabled === expected.connectshyft_escalation_enabled
  && actual.connectshyft_webhooks_enabled === expected.connectshyft_webhooks_enabled;

const flagsA = responseA?.data?.flags;
const flagsB = responseB?.data?.flags;

if (!sameFlags(flagsA, expectedA) || !sameFlags(flagsB, expectedB)) {
  process.exit(1);
}
" "$response_a" "$response_b" "$override_a" "$override_b"; then
      ready=true
    fi
  fi

  rm -f "$response_a" "$response_b"
  [[ "$ready" == "true" ]]
}

is_backend_ready_for_tests() {
  is_backend_tenant_contract_ready \
    && is_test_auth_ready \
    && is_connectshyft_override_ready
}

update_api_url_from_port() {
  local new_port="$1"
  API_URL="$(node -e "const u = new URL(process.argv[1]); u.hostname = 'localhost'; u.port = process.argv[2]; process.stdout.write(u.toString().replace(/\/$/, ''));" "$API_URL" "$new_port")"
  export API_URL
  export API_BASE_URL="$API_URL"
  export VITE_API_PROXY_TARGET="$API_URL"
  api_root="${API_URL%/}"
  backend_host="localhost"
  backend_port="$new_port"
}

update_base_url_from_port() {
  local new_port="$1"
  BASE_URL="$(node -e "const u = new URL(process.argv[1]); u.hostname = 'localhost'; u.port = process.argv[2]; process.stdout.write(u.toString().replace(/\/$/, ''));" "$BASE_URL" "$new_port")"
  export BASE_URL
  export FRONTEND_URL="$BASE_URL"
  frontend_root="${BASE_URL%/}"
  frontend_host="localhost"
  frontend_port="$new_port"
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
    terminate_process_tree "$pid"
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
    terminate_process_tree "$FRONTEND_PID"
    wait "$FRONTEND_PID" >/dev/null 2>&1 || true
    rm -f "$FRONTEND_PID_FILE"
  fi
  if [[ "$BACKEND_STARTED" == "true" && -n "$BACKEND_PID" ]]; then
    terminate_process_tree "$BACKEND_PID"
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
    rm -f "$BACKEND_PID_FILE"
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

on_exit() {
  local exit_code=$?
  cleanup_started_processes
  if [[ "$exit_code" -ne 0 ]]; then
    print_runtime_logs
  fi
}
trap on_exit EXIT

validate_allowed_host "$API_URL" "API_URL" "localhost,127.0.0.1"
validate_allowed_host "$BASE_URL" "BASE_URL" "localhost,127.0.0.1"

api_root="${API_URL%/}"
frontend_root="${BASE_URL%/}"
backend_host="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.hostname);" "$API_URL")"
backend_port="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.port || '3001');" "$API_URL")"
frontend_host="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.hostname);" "$BASE_URL")"
frontend_port="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(u.port || '5174');" "$BASE_URL")"

BACKEND_APP_DIR="$(resolve_app_dir apps/moneyshyft-api || true)"
FRONTEND_APP_DIR="$(resolve_app_dir apps/connectshyft-web || true)"

if [[ -z "$BACKEND_APP_DIR" ]]; then
  echo "Playwright preflight failed: no backend app directory with package.json was found."
  exit 1
fi

if [[ -z "$FRONTEND_APP_DIR" ]]; then
  echo "Playwright preflight failed: no frontend app directory with package.json was found."
  exit 1
fi

export PLAYWRIGHT_BACKEND_APP_DIR="$BACKEND_APP_DIR"
export NODE_PATH="$(pwd)/$BACKEND_APP_DIR/node_modules${NODE_PATH:+:$NODE_PATH}"

ensure_runtime_node_modules_link "apps/connectshyft-api/node_modules" "$(pwd)/$BACKEND_APP_DIR/node_modules"
ensure_runtime_node_modules_link "apps/connectshyft-web/node_modules" "$(pwd)/$FRONTEND_APP_DIR/node_modules"

if [[ ! -x "$BACKEND_APP_DIR/node_modules/.bin/ts-node-dev" && ! -x "$BACKEND_APP_DIR/node_modules/.bin/ts-node" ]]; then
  echo "Playwright preflight failed: backend runtime dependencies are missing. Run 'npm install --prefix $BACKEND_APP_DIR' and retry."
  exit 1
fi

if [[ ! -x "$FRONTEND_APP_DIR/node_modules/.bin/vite" ]]; then
  echo "Playwright preflight failed: frontend dependencies are missing. Run 'npm install --prefix $FRONTEND_APP_DIR' and retry."
  exit 1
fi

echo "Managed runtime policy: stack mode is '$PLAYWRIGHT_STACK_MODE'"

cleanup_pidfile_process "$BACKEND_PID_FILE" "backend"
cleanup_pidfile_process "$FRONTEND_PID_FILE" "frontend"

backend_requires_managed_start=false
if [[ "$FORCE_MANAGED_STACK" == "true" ]]; then
  backend_requires_managed_start=true
elif is_backend_healthy; then
  if [[ "$ENABLE_TEST_CONNECTSHYFT_FLAGS" == "true" ]]; then
    backend_requires_managed_start=true
    if [[ "$AUTO_START_STACK" != "true" ]]; then
      echo "Playwright preflight failed: ConnectShyft test override mode requires an isolated managed backend and AUTO_START_STACK=false"
      exit 1
    fi
    local_backend_port="$(find_available_port "$backend_port" || true)"
    if [[ -z "${local_backend_port:-}" ]]; then
      echo "Playwright preflight failed: unable to find an available managed backend port near $backend_port."
      exit 1
    fi
    if [[ "$local_backend_port" == "$backend_port" ]]; then
      echo "Playwright preflight failed: backend at $API_URL is occupied and no alternate port was found."
      exit 1
    fi
    echo "Managed runtime policy: ConnectShyft test override mode requires isolated backend; switching to managed backend on port $local_backend_port"
    update_api_url_from_port "$local_backend_port"
  elif ! is_backend_ready_for_tests; then
    backend_requires_managed_start=true
    if [[ "$AUTO_START_STACK" != "true" ]]; then
      echo "Playwright preflight failed: backend at $API_URL is reachable but does not satisfy test runtime contracts and AUTO_START_STACK=false"
      exit 1
    fi
    local_backend_port="$(find_available_port "$backend_port" || true)"
    if [[ -z "${local_backend_port:-}" ]]; then
      echo "Playwright preflight failed: unable to find an available managed backend port near $backend_port."
      exit 1
    fi
    if [[ "$local_backend_port" == "$backend_port" ]]; then
      echo "Playwright preflight failed: backend at $API_URL is incompatible and no alternate port was found."
      exit 1
    fi
    echo "Managed runtime policy: existing backend at $API_URL is incompatible; switching to managed backend on port $local_backend_port"
    update_api_url_from_port "$local_backend_port"
  fi
else
  backend_requires_managed_start=true
fi

if [[ "$backend_requires_managed_start" == "true" ]]; then
  if [[ "$AUTO_START_STACK" != "true" ]]; then
    echo "Playwright preflight failed: backend is not reachable and AUTO_START_STACK=false"
    exit 1
  fi

  if is_port_occupied "$backend_port"; then
    local_backend_port="$(find_available_port "$backend_port" || true)"
    if [[ -z "${local_backend_port:-}" ]]; then
      echo "Playwright preflight failed: backend port $backend_port is occupied and no alternate managed port was found."
      exit 1
    fi
    if [[ "$local_backend_port" == "$backend_port" ]]; then
      echo "Playwright preflight failed: backend port $backend_port is occupied and no alternate managed port was found."
      exit 1
    fi
    echo "Managed runtime policy: backend port $backend_port is occupied; switching managed backend to port $local_backend_port"
    update_api_url_from_port "$local_backend_port"
  fi

  echo "Managed runtime policy: running backend migrations"
  if ! run_backend_migrations; then
    echo "Playwright preflight failed: backend migrations failed (see $BACKEND_LOG_FILE). You can set PLAYWRIGHT_DATABASE_URL to override."
    exit 1
  fi

  echo "Managed runtime policy: starting backend for this test run at $API_URL"
  (cd "$BACKEND_APP_DIR" && NODE_ENV="$PLAYWRIGHT_BACKEND_NODE_ENV" HOST="$backend_host" PORT="$backend_port" FRONTEND_URL="$BASE_URL" TEST_ENV="$TEST_ENV" TEST_EMAIL="$TEST_EMAIL" TEST_PASSWORD="$TEST_PASSWORD" ENABLE_TEST_AUTH_HARNESS="$ENABLE_TEST_AUTH_HARNESS" ENABLE_TEST_CONNECTSHYFT_FLAGS="$ENABLE_TEST_CONNECTSHYFT_FLAGS" npm run dev) >>"$BACKEND_LOG_FILE" 2>&1 &
  BACKEND_PID=$!
  BACKEND_STARTED=true
  echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

  wait_for_http "$api_root/health" "backend health endpoint" || wait_for_http "$api_root/api/v1/health" "backend API health endpoint"

  if ! is_backend_ready_for_tests; then
    echo "Playwright preflight failed: managed backend did not satisfy test runtime contracts."
    exit 1
  fi
fi

frontend_requires_managed_start=false
if [[ "$FORCE_MANAGED_STACK" == "true" ]]; then
  frontend_requires_managed_start=true
elif ! is_frontend_reachable; then
  frontend_requires_managed_start=true
fi

if [[ "$BACKEND_STARTED" == "true" ]]; then
  frontend_requires_managed_start=true
fi

if [[ "$frontend_requires_managed_start" == "true" ]]; then
  if [[ "$AUTO_START_STACK" != "true" ]]; then
    echo "Playwright preflight failed: frontend is not reachable and AUTO_START_STACK=false"
    exit 1
  fi

  if is_port_occupied "$frontend_port"; then
    local_frontend_port="$(find_available_port "$frontend_port" || true)"
    if [[ -z "${local_frontend_port:-}" ]]; then
      echo "Playwright preflight failed: unable to find an available managed frontend port near $frontend_port."
      exit 1
    fi
    if [[ "$local_frontend_port" == "$frontend_port" ]]; then
      echo "Playwright preflight failed: frontend at $BASE_URL is occupied and no alternate port was found."
      exit 1
    fi
    echo "Managed runtime policy: existing frontend at $BASE_URL is occupied; switching to managed frontend on port $local_frontend_port"
    update_base_url_from_port "$local_frontend_port"
  fi

  echo "Managed runtime policy: starting frontend for this test run at $BASE_URL"
  (cd "$FRONTEND_APP_DIR" && VITE_API_PROXY_TARGET="$API_URL" VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS="$ENABLE_TEST_CONNECTSHYFT_FLAGS" npm run dev -- --host "$frontend_host" --port "$frontend_port" --strictPort) >"$FRONTEND_LOG_FILE" 2>&1 &
  FRONTEND_PID=$!
  FRONTEND_STARTED=true
  echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

  wait_for_http "$frontend_root/login" "frontend login page" || wait_for_http "$frontend_root" "frontend root page"
fi

npx playwright test "$@"
