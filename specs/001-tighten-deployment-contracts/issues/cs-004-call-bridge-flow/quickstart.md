# Quickstart: CS-004 Call Bridge Flow

## Prerequisites

- Node.js 20+
- access to the monorepo workspace
- a ConnectShyft API development database
- Telnyx non-production credentials if live bridge validation is attempted

## Environment

Required for bridge-capable provider validation:

- `TELNYX_API_KEY`

Recommended:

- `TELNYX_PUBLIC_KEY`
- `TELNYX_CONNECTION_ID`
- `TELNYX_API_BASE_URL`
- `CONNECTSHYFT_ENABLED_PROVIDERS=telnyx`
- `CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST`

## Build and Targeted Tests

Executed during CS-004 reconciliation on March 11, 2026:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npx jest --runInBand --runTestsByPath \
  src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/migrations/__tests__/connectShyftBridgeSessionsMigration.test.ts
```

```bash
cd /Users/jeremiahotis/projects/connectshyft
apps/connectshyft-api/node_modules/.bin/jest --runInBand --config apps/connectshyft-api/jest.config.js \
  domains/communication/bridge/__tests__/bridgeStateMachine.test.ts \
  domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts \
  infrastructure/communications/telnyx/__tests__/index.test.ts
```

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
```

Observed result:

- route suites passed
- bridge domain suites passed
- Telnyx adapter suite passed
- migration suite passed
- `apps/connectshyft-api` TypeScript build passed

Recommended rerun if the branch changes:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npx jest --runInBand --runTestsByPath \
  src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/migrations/__tests__/connectShyftBridgeSessionsMigration.test.ts
cd /Users/jeremiahotis/projects/connectshyft
apps/connectshyft-api/node_modules/.bin/jest --runInBand --config apps/connectshyft-api/jest.config.js \
  domains/communication/bridge/__tests__/bridgeStateMachine.test.ts \
  domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts \
  infrastructure/communications/telnyx/__tests__/index.test.ts
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
```

Shared-boundary validation:

```bash
cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js
```

Observed result:

- shared communication and infrastructure boundaries remained intact after the CS-004 updates

## Host Routing Delegation Validation

Static verification executed on March 11, 2026:

```bash
cd /Users/jeremiahotis/projects/connectshyft
rg -n "/api/v1/auth|/api/v1/platform/admin|127.0.0.1:3002" \
  nginx/host-managed-subdomains.example.conf \
  docs/PRODUCTION_DEPLOYMENT_GUIDE.md \
  docs/DEPLOYMENT_CHECKLIST.md
```

Observed result:

- `nginx/host-managed-subdomains.example.conf` keeps the ConnectShyft upstream on `127.0.0.1:3002`
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` states that `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin_api`
- `docs/DEPLOYMENT_CHECKLIST.md` repeats the same delegated-routing rule and loopback upstream expectations
- CS-004 does not require any Nginx route ownership changes

## API Binding, Port, Shared Postgres, and Migration Authority Validation

Static verification executed on March 11, 2026:

```bash
cd /Users/jeremiahotis/projects/connectshyft
rg -n "PORT=3002|HOST=127.0.0.1|migrate:latest:prod|shared host-managed Postgres" \
  apps/connectshyft-api/.env.example \
  docs/PRODUCTION_DEPLOYMENT_GUIDE.md \
  docs/DEPLOYMENT_CHECKLIST.md
```

Observed result:

- `apps/connectshyft-api/.env.example` pins `PORT=3002` and `HOST=127.0.0.1`
- deployment docs continue to require loopback-only API binding for `connectshyft-api`
- deployment docs continue to treat PostgreSQL as the shared host-managed production database
- production migrations remain authority-owned by `admin-api` via `docker compose run --rm admin-api npm run migrate:latest:prod`
- CS-004 bridge persistence stays within ConnectShyft-owned tables on the shared database and does not introduce lane-local migration authority

## Reproducible Runbook Verification

Validation executed on March 11, 2026:

1. Run the targeted Jest suites listed above.
2. Run the root bridge-domain and Telnyx adapter suites listed above.
3. Run `npm run build` in `apps/connectshyft-api`.
4. Run `node scripts/enforce-workspace-boundaries.js` from repo root.

Observed result:

- every listed command completed successfully without manual file edits between runs
- no extra environment variables or ad hoc deployment steps were required beyond the documented prerequisites
- the existing deployment guide and checklist remain sufficient for CS-004 because routing, port binding, and migration authority stay unchanged

## Local Bridge Validation Flow

Run these checks after the implementation exists:

1. Start `connectshyft-api` with bridge-capable Telnyx configuration.
2. Send `POST /api/v1/connectshyft/threads/:threadId/call`.
3. Verify:
   - one persisted bridge session exists
   - exactly two persisted bridge legs exist
   - session status is `operator_dialing`
   - operator leg status is `dialing` or `ringing`
4. Deliver a translated provider event equivalent to `operator_answered`.
5. Verify:
   - session status advances to `operator_answered`, then `neighbor_dialing`
   - neighbor leg provider call is initiated exactly once
6. Deliver a translated provider event equivalent to `neighbor_answered`.
7. Verify:
   - provider bridge control is invoked exactly once
   - session status advances to `bridged`
8. Deliver either completion or failure events.
9. Verify:
   - session and legs move to authoritative terminal states
   - reloading the thread reads persisted session state rather than frontend-only state

## Replay-Safety Validation

1. Re-send the same translated `operator_answered` or `neighbor_answered` event.
2. Verify:
   - no duplicate session or leg rows are created
   - no duplicate provider bridge-control request is sent
   - webhook receipt handling marks the event as duplicate or already applied

## Telnyx Sandbox Evidence

Record the following for PR evidence after implementation:

- redacted operator leg creation request and response
- redacted neighbor leg creation request and response
- redacted bridge-control request and response
- proof that translated provider events enter the bridge domain without raw Telnyx payload shapes
- proof that the route response exposes provider-neutral bridge session state rather than provider identifiers

These live Telnyx sandbox checks were not executed as part of the local automated validation captured here.

## Platform No-Regression Checks

- `connectshyft-api` remains the owner of `POST /api/v1/connectshyft/threads/:threadId/call`
- `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain owned by `admin-api`
- bridge orchestration lives under `domains/communication/bridge`
- Telnyx call-control remains under `infrastructure/communications/telnyx`
- session state persists outside frontend state and outside `apps/connectshyft-web`
- persistence remains on shared PostgreSQL through ConnectShyft-owned tables in the `connectshyft` schema:
  - `connectshyft.cs_bridge_sessions`
  - `connectshyft.cs_bridge_legs`
