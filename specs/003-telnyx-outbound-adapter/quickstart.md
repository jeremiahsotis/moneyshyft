# Quickstart: CS-003 Telnyx Outbound Adapter

## Prerequisites

- Node.js 20+
- access to the monorepo workspace
- a ConnectShyft API development database
- Telnyx sandbox or non-production credentials

## Environment

Required:

- `TELNYX_API_KEY`

Recommended:

- `TELNYX_PUBLIC_KEY`
- `TELNYX_API_BASE_URL`
- `TELNYX_CONNECTION_ID`
- `CONNECTSHYFT_ENABLED_PROVIDERS=telnyx`
- `CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST`

## Build and Test

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
NODE_ENV=test npx jest --runInBand --runTestsByPath \
  src/modules/connectshyft/__tests__/providerRegistry.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  ../../domains/communication/telephony/__tests__/index.test.ts \
  ../../infrastructure/communications/telnyx/__tests__/index.test.ts
```

Shared-boundary validation:

```bash
cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js
```

## Validation Results

Validated locally on March 11, 2026:

- `apps/connectshyft-api`: `npm run build` passed
- `apps/connectshyft-api`: the four CS-003 target Jest suites passed (`28` tests across `4` suites)
- repo root: `node scripts/enforce-workspace-boundaries.js` passed

## Local API Validation

Start the ConnectShyft API with the required Telnyx env configured, then execute existing outbound routes against a known test thread.

### SMS scenario

1. Send `POST /api/v1/connectshyft/threads/:threadId/messages`
2. Include:
   - `orgUnitId`
   - `providerKey=telnyx`
   - `channel=sms`
   - `body`
   - `idempotencyKey`
3. Verify:
   - success envelope contains `data.dispatch.providerMessageId`
   - thread response/history reflects one outbound message
   - provider correlation persistence records the Telnyx message identifier

### Outbound call scenario

1. Send `POST /api/v1/connectshyft/threads/:threadId/call`
2. Include:
   - `orgUnitId`
   - `providerKey=telnyx`
   - `idempotencyKey`
3. Verify:
   - success envelope contains `data.dispatch.providerLegId`
   - policy remains locked to bridge/manual-retry guardrails
   - no bridge-session workflow or UI redesign behavior is introduced by CS-003

## Telnyx Sandbox Evidence

Record the following for PR evidence:

- SMS request/response example with redacted credentials
- outbound call-initiation request/response example with redacted credentials
- note showing the adapter interface path under `domains/communication/telephony`
- note showing the Telnyx implementation path under `infrastructure/communications/telnyx`

Suggested sandbox commands:

```bash
curl -X POST https://api.telnyx.com/v2/messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cs003-sandbox-sms-001" \
  -d '{"from":"+12605550199","to":"+12605550111","text":"CS-003 sandbox SMS"}'

curl -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cs003-sandbox-call-001" \
  -d '{"connection_id":"'$TELNYX_CONNECTION_ID'","from":"+12605550199","to":"+12605550111"}'
```

These sandbox calls were not executed in this workspace because live Telnyx credentials/network access were not available here.

## Platform No-Regression Checks

- Route ownership remains unchanged:
  - `apps/connectshyft-api/src/app.ts` still mounts ConnectShyft under `/api/v1/connectshyft`
  - `apps/admin-api/src/api/registerRoutes.ts` still owns `/api/v1/auth/*` and `/api/v1/platform/admin/*`
- Port/build inputs remain aligned:
  - `apps/connectshyft-api/src/server.ts` still enforces canonical production port `3002`
  - `apps/connectshyft-api/.env.example` still pins `HOST=127.0.0.1` for host-routed production deployment
  - `apps/connectshyft-api/Dockerfile.production` now copies `domains/` and `infrastructure/` so the shared telephony boundary builds inside the production image
- Shared Postgres compatibility remains intact:
  - `apps/connectshyft-api/src/knexfile.ts` still targets the shared PostgreSQL configuration contract
  - `apps/admin-api/package.json` still owns the production migration command via `npm run migrate:latest:prod`
  - `docs/DEPLOYMENT_CHECKLIST.md` still documents single-authority production migrations from `admin-api`
