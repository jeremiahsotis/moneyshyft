# Quickstart: CS-005 Reliability / Idempotency / Audit

## Goal

Validate durable idempotency, replay-safe webhook handling, bounded retry persistence, append-only audit recording, and unchanged platform routing/topology boundaries for ConnectShyft communication operations.

## Prerequisites

- Repository root: `/Users/jeremiahotis/projects/connectshyft`
- Branch: `005-reliability-idempotency-audit`
- Local test database available
- ConnectShyft API test dependencies installed

## Primary Validation Flow

### 1. Run targeted reliability and bridge-related Jest coverage

```sh
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
env NODE_ENV=test \
  DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  ENABLE_TEST_CONNECTSHYFT_FLAGS=true \
  npx jest --runInBand --runTestsByPath \
    src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
    src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
    src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
    src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
```

Expected result:
- outbound duplicate replay tests pass
- same-key/different-payload conflict tests pass
- duplicate webhook suppression tests pass
- retry-state/audit assertions pass without changing bridge ownership

### 2. Run shared domain reliability and audit tests

```sh
cd /Users/jeremiahotis/projects/connectshyft
env NODE_ENV=test \
  MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  ENABLE_TEST_CONNECTSHYFT_FLAGS=true \
  npx jest --runInBand --runTestsByPath \
    domains/communication/reliability/__tests__/idempotencyService.test.ts \
    domains/communication/reliability/__tests__/eventDeduper.test.ts \
    domains/communication/reliability/__tests__/retryPolicy.test.ts \
    domains/communication/audit/__tests__/recordCommunicationAudit.test.ts \
    domains/communication/telephony/__tests__/index.test.ts
```

Expected result:
- idempotency decision logic passes
- bounded retry decisions pass
- normalized provider failure classification remains intact

### 3. Build the ConnectShyft API

```sh
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
```

Expected result:
- TypeScript build passes with the new reliability persistence and route integration

### 4. Run workspace boundary enforcement

```sh
cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js
```

Expected result:
- no provider-boundary or workspace-boundary violations

## Reliability Evidence To Capture

- proof that materially relevant request fingerprint fields are stable across safe retries and reject conflicting payload reuse
- proof that the first outbound request creates a durable idempotency record before provider dispatch
- proof that same-key/same-payload replay returns the authoritative prior/current result with no duplicate side effect
- proof that same-key/different-payload replay fails loudly
- proof that unverified webhook requests are rejected before receipt persistence and event application
- proof that duplicate webhook receipts are ignored before domain re-application
- proof that retryable failures record bounded retry intent and exhausted outcomes
- proof that audit rows are append-only across success, duplicate, retrying, exhausted, and failure outcomes
- proof that persisted idempotency and webhook-receipt state survives in-memory reset by re-reading durable records

## Compatibility / Constitution Validation

### 5. Validate routing delegation remains unchanged

```sh
git diff --name-only -- \
  nginx \
  apps/admin-api/src/routes \
  apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/moneyshyft-api/src/routes
```

Expected result:
- no changes that alter `/api/v1/auth/*` or `/api/v1/platform/admin/*` delegation to `admin-api`
- `/api/v1/connectshyft/*` remains lane-owned

### 5a. Validate unverified webhooks are rejected before receipt persistence

```sh
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
env NODE_ENV=test \
  DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  ENABLE_TEST_CONNECTSHYFT_FLAGS=true \
  npx jest --runInBand --runTestsByPath \
    src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts
```

Expected result:
- coverage proves failed signature verification rejects the request before receipt persistence, translation, and downstream domain side effects

### 6. Validate canonical API ports and localhost binding remain unchanged

```sh
git diff --name-only -- \
  apps/admin-api/src/server.ts \
  apps/moneyshyft-api/src/server.ts \
  apps/connectshyft-api/src/server.ts \
  docker-compose.example.yml \
  docker-compose.production.example.yml
```

Expected result:
- no changes to localhost binding or canonical ports for `admin-api`, `money-api`, or `connect-api`

### 7. Validate shared Postgres compatibility and migration ownership

```sh
git diff --name-only -- \
  apps/admin-api/src/migrations \
  apps/moneyshyft-api/src/migrations \
  apps/connectshyft-api/src/migrations \
  apps/admin-api/src/config/database.ts \
  apps/moneyshyft-api/src/config/database.ts \
  apps/connectshyft-api/src/config/database.ts
```

Expected result:
- reliability migrations are compatible with shared Postgres
- no change to `admin-api` as sole production migration owner

### 8. Validate deployment runbook reproducibility remains intact

```sh
git diff --name-only -- \
  SETUP.md \
  PRODUCTION_DEPLOYMENT_GUIDE.md \
  nginx \
  docker-compose.example.yml \
  docker-compose.production.example.yml \
  apps/*/Dockerfile.production
```

Expected result:
- no extra manual deployment adjustments are introduced by CS-005

### 9. Validate provider-boundary scans remain clean outside infrastructure

```sh
cd /Users/jeremiahotis/projects/connectshyft
rg -n "from '/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx|telnyx[A-Z]|call_control_id|message_id|event_id" \
  apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/modules/connectshyft \
  domains/communication
```

Expected result:
- no raw provider imports or raw provider payload field handling appear outside infrastructure-owned surfaces
- generic provider correlation fields such as `provider_event_id` may remain in canonical metadata and receipt persistence, but no Telnyx-specific imports or payload fields appear in the CS-005 route/audit/reliability surfaces

### 10. Validate persisted durability by re-reading state after initial write

```sh
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
env NODE_ENV=test \
  DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  ENABLE_TEST_CONNECTSHYFT_FLAGS=true \
  npx jest --runInBand --runTestsByPath \
    src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
    src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
```

Expected result:
- tests prove replay-safe behavior still works after re-reading persisted idempotency or webhook receipt state rather than relying on in-memory replay state

## Retry Model Note

CS-005 persists retry intent only.

- No worker or scheduler is introduced.
- No immediate automatic redial or provider re-dispatch loop is introduced.
- Retryable failures only update durable retry metadata and append audit evidence.

## Recorded Results

- targeted ConnectShyft reliability suites: passed via `env NODE_ENV=test MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci ENABLE_TEST_CONNECTSHYFT_FLAGS=true npm run test:connectshyft` in `apps/connectshyft-api` with `60` suites and `322` tests passing
- shared domain reliability suites: passed within the same run, including `idempotencyService.test.ts`, `eventDeduper.test.ts`, `retryPolicy.test.ts`, `recordCommunicationAudit.test.ts`, and `telephony/index.test.ts`
- ConnectShyft API build: passed via `npm run build` in `apps/connectshyft-api`
- workspace boundary enforcement: passed via `node scripts/enforce-workspace-boundaries.js`
- targeted provider-boundary scan: passed; `rg -n "telnyx" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules/connectshyft/communicationReliability.ts apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts` returned no matches
- routing delegation validation: unchanged; `git diff --name-only` across nginx/admin/connect routes only showed `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- unverified webhook rejection validation: passed in `src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- canonical port / localhost binding validation: unchanged; targeted `git diff --name-only` over server and compose files returned no matches
- shared Postgres / migration ownership validation: unchanged except for lane-local ConnectShyft migration additions; targeted `git diff --name-only` returned only `apps/connectshyft-api/src/migrations/20260312120000_add_connectshyft_communication_reliability.ts`
- runbook reproducibility validation: unchanged; targeted `git diff --name-only` over deployment/runbook files returned no matches
- persisted durability re-read validation: passed via route replay coverage in `src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, receipt retry metadata coverage in `src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`, and domain idempotency coverage in `domains/communication/reliability/__tests__/idempotencyService.test.ts`
