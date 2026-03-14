#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV="${NODE_ENV:-test}"
export TEST_ENV="${TEST_ENV:-local}"
export ENABLE_TEST_AUTH_HARNESS="${ENABLE_TEST_AUTH_HARNESS:-true}"
export ENABLE_TEST_CONNECTSHYFT_FLAGS="${ENABLE_TEST_CONNECTSHYFT_FLAGS:-true}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test-jwt-refresh-secret}"
export MONEYSHYFT_TEST_DATABASE_URL="${MONEYSHYFT_TEST_DATABASE_URL:-${DATABASE_URL:-}}"

echo "== workspace nx test targets =="
run_direct_workspace_targets() {
  echo "running direct package Jest targets"
  npm test --prefix apps/moneyshyft-api
  npm test --prefix apps/admin-api
}

if [[ "${LOCAL_CI_SKIP_NX_AGGREGATE:-false}" == "true" || "$(uname -s)" == "Darwin" ]]; then
  echo "skipping nx workspace aggregate for local macOS parity"
  run_direct_workspace_targets
else
  workspace_log="$(mktemp)"
  if ! PLAYWRIGHT_FRONTEND_APP_DIR="${PLAYWRIGHT_WORKSPACE_TEST_FRONTEND_APP_DIR:-apps/moneyshyft-web}" npm test -- --parallel=1 2>&1 | tee "$workspace_log"; then
    if grep -q "Failed to start plugin worker" "$workspace_log"; then
      echo "nx workspace test aggregate failed to start plugin worker; falling back to direct package Jest targets"
      run_direct_workspace_targets
    else
      rm -f "$workspace_log"
      exit 1
    fi
  fi
  rm -f "$workspace_log"
fi

echo "== connectshyft-api connectshyft jest =="
npm run test:connectshyft --prefix apps/connectshyft-api

echo "== admin-api connectshyft jest =="
npm run test:connectshyft --prefix apps/admin-api

echo "== moneyshyft-api connectshyft jest =="
npm run test:connectshyft --prefix apps/moneyshyft-api
