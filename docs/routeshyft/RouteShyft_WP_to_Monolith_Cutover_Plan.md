# WP -> Monolith Cutover Plan

## Objective
Retire WordPress state writes for RouteShyft and confirm monolith-only authority with verifiable reconciliation evidence.

## Preconditions
1. `apps/routeshyft-api` is running and reachable.
2. Route bridge endpoints are available at `/api/v1/route-bridge/*`.
3. Cutover stage is configured intentionally via `ROUTESHYFT_WP_CUTOVER_STAGE` (`bridge`, `monolith_authoritative`, `read_only`).
4. Operator credentials or test-harness credentials are available for API auth.

## Step 1: Export WP Data
Export WP fulfillment state to JSON. The rehearsal script accepts either:
1. JSON array of records, or
2. Object with `items`/`records` array.

Sample shape is provided in:
- `docs/routeshyft/examples/wp-export-sample.json`

## Step 2: Transform + Validate (No API Calls)
Normalize source IDs, lineage IDs, completion intent, and detect unsafe conflicts before import.

```bash
node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --input docs/routeshyft/examples/wp-export-sample.json \
  --transform-only
```

Outputs:
1. Normalized payload: `_bmad-output/test-artifacts/route-cutover-normalized-<timestamp>.json`
2. Report: `_bmad-output/test-artifacts/route-cutover-rehearsal-<timestamp>.json`

## Step 3: Dry-Run Rehearsal (Planned API Actions Only)
Build the exact fulfillment/completion/reconciliation plan without mutating data.

```bash
node scripts/routeshyft/wp-cutover/rehearse-route-cutover.mjs \
  --input docs/routeshyft/examples/wp-export-sample.json \
  --dry-run
```

## Step 4: Apply Rehearsal Against Route Bridge
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

## Step 5: Promote Cutover Stage + Disable WP Writes
1. Move stage to `monolith_authoritative` and require `api_only` bridge assertions.
2. Re-run rehearsal on a fresh export and confirm no drift.
3. Disable WP direct DB writes and keep API-only bridge paths.
4. Move to `read_only` stage only after verification and rollback readiness.

## Rollback Guardrail
If reconciliation drift is detected:
1. Stop stage promotion.
2. Resolve duplicate source/lineage mappings.
3. Re-run reconciliation until drift is cleared.
