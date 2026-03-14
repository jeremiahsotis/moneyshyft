# Quickstart: Deployment Tightening Round Validation

## Purpose

Validate that deployment contracts for Admin, MoneyShyft, and ConnectShyft are
applied consistently and reproducibly on a small production server.

## Prerequisites

- Access to the target single-server production host where host-managed Nginx
  is already installed and responsible for public ingress.
- Access to shared host PostgreSQL (not containerized) for all lane APIs.
- Docker Engine and Docker Compose plugin installed on the host.
- Node.js 20 available on the host for frontend build output generation.
- Git and GitHub CLI (`gh`) installed for deployment and release workflow
  operations.
- Sufficient privileges to manage deployment env files, Nginx configuration,
  and host PostgreSQL connectivity settings.
- Canonical API ports reserved on the host:
  - `admin-api:3100`
  - `money-api:3000`
  - `connect-api:3002`
- Single-server footprint assumption for this round: all three lane APIs run on
  one host and bind to localhost-only ports behind host Nginx.
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

1. Apply Nginx lane routing configuration with this matching order per lane host:
   - `/api/v1/auth/*`
   - `/api/v1/platform/admin/*`
   - all other `/api/*`
2. Validate syntax (`nginx -t`) and reload Nginx.
3. Execute
   `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`
   steps to run probe requests for admin, money, and connect hosts and capture
   evidence artifacts.
4. Confirm probe results satisfy route ownership:
   - money/connect delegated routes (`/api/v1/auth/*`, `/api/v1/platform/admin/*`) -> `admin-api` (`admin_api`, `127.0.0.1:3100`)
   - lane-local `/api/*` routes -> lane APIs (`money_api`/`connect_api` and `admin_api` for admin lane)
5. Record the probe CSV and matched Nginx access-log lines as routing evidence
   for acceptance review.

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
