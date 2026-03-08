# Quickstart: Deployment Tightening Round Validation

## Purpose

Validate that deployment contracts for Admin, MoneyShyft, and ConnectShyft are
applied consistently and reproducibly on a small production server.

## Prerequisites

- Access to target production host with Nginx and Docker available.
- Deployment env files provisioned outside git.
- Updated lane frontend `dist/` artifacts available.
- Ability to execute route and health checks.

## Step 1: Prepare deployment artifacts

1. Confirm canonical lane/frontend naming alignment (`admin-web`,
   `moneyshyft-web`, `connectshyft-web`).
2. Confirm API service port assignments:
   - `admin-api:3100`
   - `money-api:3000`
   - `connect-api:3002`
3. Confirm container bindings are localhost-only.

## Step 2: Apply routing contract

1. Apply Nginx lane routing configuration.
2. Validate syntax (`nginx -t`) and reload Nginx.
3. Confirm delegated routes for money/connect:
   - `/api/v1/auth/*` -> admin-api
   - `/api/v1/platform/admin/*` -> admin-api
4. Confirm other lane `/api/*` routes go to lane API.

## Step 3: Apply runtime and DB authority contract

1. Start/update API containers according to deployment runbook.
2. Confirm all APIs connect to shared Postgres.
3. Run production migrations only from `admin-api` authority path.

## Step 4: Execute acceptance checks

1. Admin lane web and API checks pass.
2. Money lane delegated and lane-local routing checks pass.
3. Connect lane delegated and lane-local routing checks pass.
4. All API `/health` checks pass.
5. No public API ports are exposed.

## Step 5: Reproducibility confirmation

1. Re-run deployment workflow.
2. Confirm no undocumented manual intervention was required.
3. Record verification evidence in acceptance records.

## Expected Outcome

Deployment for Admin, MoneyShyft, and ConnectShyft is reproducible, routing
ownership is correct, database authority is enforced, and ingress/security
boundaries are intact.
