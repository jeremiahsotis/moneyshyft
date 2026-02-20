# Test Runtime Cleanup Policy

## Purpose

Prevent blocked QA and CI runs caused by orphaned or missing local frontend/backend services.

## Policy

1. `npm run test:e2e` is the only approved entrypoint for local Playwright runs that require runtime services.
2. Preflight must manage runtime lifecycle when services are unavailable:
   - auto-start backend/frontend for the test run,
   - write managed pid files under `tests/artifacts/runtime/`,
   - always stop managed processes on exit (success or failure).
3. Manual recovery must use `npm run test:runtime:cleanup` to stop managed runtime processes.
4. If developers intentionally run persistent local services, they may disable auto-start with:
   - `AUTO_START_STACK=false npm run test:e2e -- ...`
   - preflight will fail fast if health endpoints are unavailable.

## Enforcement

- Implemented in `scripts/run-playwright-with-preflight.sh`
- Manual cleanup command: `scripts/cleanup-test-runtime.sh`
- npm alias: `npm run test:runtime:cleanup`
