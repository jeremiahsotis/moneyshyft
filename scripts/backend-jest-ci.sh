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
PLAYWRIGHT_FRONTEND_APP_DIR="${PLAYWRIGHT_WORKSPACE_TEST_FRONTEND_APP_DIR:-apps/moneyshyft-web}" npm test -- --parallel=1

echo "== connectshyft-api connectshyft jest =="
npm run test:connectshyft --prefix apps/connectshyft-api

echo "== admin-api connectshyft jest =="
npm run test:connectshyft --prefix apps/admin-api

echo "== moneyshyft-api connectshyft jest =="
npm run test:connectshyft --prefix apps/moneyshyft-api
