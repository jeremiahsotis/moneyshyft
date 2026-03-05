# WP -> Monolith Cutover Plan

## Objective
Retire WordPress state writes for RouteShyft and confirm monolith-only authority with verifiable reconciliation evidence.

## Preconditions
1. `apps/routeshyft-api` is running and reachable.
2. Route bridge endpoints are available at `/api/v1/route-bridge/*`.
3. Cutover stage is configured intentionally via `ROUTESHYFT_WP_CUTOVER_STAGE` (`bridge`, `monolith_authoritative`, `read_only`).
4. Operator credentials or test-harness credentials are available for API auth.

## Runtime/Deploy Config
Set `ROUTESHYFT_WP_CUTOVER_STAGE` explicitly in runtime config (do not rely on implicit defaults):
1. Local template: `apps/routeshyft-api/.env.example`
2. Transitional template: `apps/connectshyft-api/.env.example`
3. Docker template: `docker-compose.example.yml` (`services.node.environment`)

Suggested stage progression:
1. `bridge`: dual-write prevention is off while rehearsal and migration validation are in progress.
2. `monolith_authoritative`: dual-write prevention is on and bridge writes require `api_only` assertion.
3. `read_only`: bridge write paths are blocked after full cutover verification and rollback readiness.

## Step 1: Select Cutover Path
Choose one path before rehearsal:
1. `legacy-migration`: there is historical WP fulfillment state to ingest.
2. `no-legacy-data`: there is no WP state to import; reconciliation-only verification is required.

## Step 2 (legacy-migration): Export WP Data
Export WP fulfillment state to JSON. The rehearsal script accepts either:
1. JSON array of records, or
2. Object with `items`/`records` array.

Sample shape is provided in:
- `docs/routeshyft/examples/wp-export-sample.json`

## Step 3 (legacy-migration): Transform + Validate (No API Calls)
Normalize source IDs, lineage IDs, completion intent, and detect unsafe conflicts before import.

```bash
node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --input docs/routeshyft/examples/wp-export-sample.json \
  --transform-only
```

Outputs:
1. Normalized payload: `_bmad-output/test-artifacts/route-cutover-normalized-<timestamp>.json`
2. Report: `_bmad-output/test-artifacts/route-cutover-rehearsal-<timestamp>.json`

## Step 4 (legacy-migration): Dry-Run Rehearsal (Planned API Actions Only)
Build the exact fulfillment/completion/reconciliation plan without mutating data.

```bash
node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --input docs/routeshyft/examples/wp-export-sample.json \
  --dry-run
```

## Step 5A (legacy-migration): Apply Rehearsal Against Route Bridge
Use a valid access token, or login credentials for auth harness/local runs.

```bash
export RS_CUTOVER_API_BASE_URL=http://127.0.0.1:3000
export RS_CUTOVER_LOGIN_EMAIL="${TEST_EMAIL}"
export RS_CUTOVER_LOGIN_PASSWORD="${TEST_PASSWORD}"

node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --input /absolute/path/to/wp-export.json \
  --api-base "$RS_CUTOVER_API_BASE_URL"
```

Alternative auth:
```bash
export RS_CUTOVER_ACCESS_TOKEN="<access_token_value>"
```

Success criteria:
1. No fulfillment/completion failures.
2. Reconciliation responses report `singleSourceOfTruthConfirmed: true`.
3. No `ROUTE_BRIDGE_RECONCILIATION_DRIFT_DETECTED` results.

## Step 5B (no-legacy-data): Reconciliation-Only Verification
When there is no WP export/import scope, run reconciliation-only rehearsal:

```bash
export RS_CUTOVER_API_BASE_URL=http://127.0.0.1:3000
export RS_CUTOVER_LOGIN_EMAIL="${TEST_EMAIL}"
export RS_CUTOVER_LOGIN_PASSWORD="${TEST_PASSWORD}"

node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --reconcile-only \
  --api-base "$RS_CUTOVER_API_BASE_URL"
```

Success criteria:
1. Reconciliation responses report `singleSourceOfTruthConfirmed: true`.
2. No `ROUTE_BRIDGE_RECONCILIATION_DRIFT_DETECTED` results.
3. No bridge write failures are reported.
4. Archive rehearsal artifacts under `_bmad-output/test-artifacts/release-evidence/` and mark them as release evidence.

## Step 6: Promote Cutover Stage + Disable WP Writes
1. Move stage to `monolith_authoritative` and require `api_only` bridge assertions.
2. Re-run cutover verification:
   - `legacy-migration`: re-run apply rehearsal on a fresh export.
   - `no-legacy-data`: re-run `--reconcile-only`.
3. Disable WP direct DB writes and keep API-only bridge paths for all integrations:

```bash
export WP_DB_HOST='<wordpress-db-host>'
export WP_DB_PORT='3306'
export WP_DB_NAME='<wordpress-db-name>'
export WP_DB_ADMIN_USER='<admin-user>'
export WP_DB_ADMIN_PASSWORD='<admin-password>'
export WP_DB_WRITE_USER='<wp-plugin-writer-user>'
export WP_DB_WRITE_HOST='%'
export WP_ROUTE_TABLES='<comma-separated-routeshyft-authority-tables>'

# For reconcile-only verification after write shutdown
export RS_CUTOVER_API_BASE_URL='http://127.0.0.1:3000'
export RS_CUTOVER_LOGIN_EMAIL='operator@example.com'
export RS_CUTOVER_LOGIN_PASSWORD='<operator-password>'

npm run cutover:shutdown:wp-writes -- --apply
```

Expected release-gate outcome:
   - DB verification passes with no `INSERT`/`UPDATE`/`DELETE` grants for the WP write principal on RouteShyft authority tables.
   - Reconcile-only API verification passes with `driftDetected=false` and `singleSourceOfTruthConfirmed=true`.
   - Evidence bundle is archived under `_bmad-output/test-artifacts/release-evidence/wp-write-shutdown-<timestamp>/`.
4. Move to `read_only` stage only after verification and rollback readiness.

## Future WP Plugin Guardrails
When WP plugins are introduced, enforce these contracts:
1. Plugins call monolith APIs only; no direct WP DB state writes for RouteShyft authority tables.
2. Plugin write calls include deterministic idempotency keys and `writeMode=api_only` where required.
3. Plugin requests run under explicit tenant/orgUnit context and preserve correlation IDs for auditability.
4. Drift/reconciliation checks remain the release gate before stage promotion.

## Rollback Guardrail
If reconciliation drift is detected:
1. Stop stage promotion.
2. Resolve duplicate source/lineage mappings.
3. Re-run reconciliation until drift is cleared.
