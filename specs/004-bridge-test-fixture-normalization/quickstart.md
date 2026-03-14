# Quickstart: CS-004b Bridge Test Fixture Normalization

## Goal

Validate that bridge-related test fixtures were normalized to provider-neutral names and shapes without changing runtime behavior, routing, deployment topology, or shared-database ownership.

## Prerequisites

- Repository root: `/Users/jeremiahotis/projects/connectshyft`
- Branch: `004-bridge-test-fixture-normalization`
- ConnectShyft API test dependencies installed

## Baseline Evidence Placeholders

### Before normalization

- `connectshyft.bridge-flow.test.ts`: vendor-labeled bridge leg fixture values and legacy snake_case correlation keys were present in webhook payload fixtures.
- `connectshyft.outbound-dispatch.test.ts`: vendor-labeled message and leg fixture values were present, and the local correlation helper still accepted legacy snake_case bridge-facing payload keys.
- `bridgeSessions.test.ts`: provider call fixture values were vendor-labeled even though the assertions were bridge-session focused.
- `providerCorrelationMappings.test.ts`: provider identifier fixtures used vendor-labeled call/message IDs throughout the bridge-adjacent mapping coverage.

### After normalization target

- Bridge-facing app and module tests use neutral fixture identifiers such as `provider-leg-*`, `provider-message-*`, and camelCase correlation fields.
- Provider-native payload/header shapes remain only in explicit signature-verification or translation-edge helper coverage.
- No runtime behavior, routing, deployment, UI, adapter, or schema files are changed.

## In-Scope Inventory

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`

## Reviewed Exception / Verification Surfaces

- `tests/support/helpers/connectShyftWebhookTestHelpers.ts`: allowed provider-native webhook signature headers and raw provider payload examples when signature verification or translation-edge behavior is under test.
- `domains/communication/bridge/__tests__/bridgeStateMachine.test.ts`: reviewed as provider-neutral baseline coverage.
- `domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`: reviewed as provider-neutral baseline coverage.

## Validation Steps

### 1. Confirm the touched-file set stays within tests and feature docs

```sh
git diff --name-only
```

Expected result:
- only bridge-related test files, optional test-support files, and files under `specs/004-bridge-test-fixture-normalization/` are changed
- no files under `nginx/`, `docker-compose*`, `apps/*/src/migrations/`, or runtime provider adapter sources are changed

### 2. Verify bridge-facing tests no longer carry vendor-labeled fixtures

```sh
rg -n "telnyx-|twilio-|provider_leg_id:|provider_message_id:|provider_event_id:" \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts \
  domains/communication/bridge/__tests__/bridgeStateMachine.test.ts \
  domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts \
  tests/support/helpers/connectShyftWebhookTestHelpers.ts
```

Expected result:
- no matches in bridge-facing app and domain tests
- any remaining matches are explicitly documented provider-native exception surfaces in `tests/support/helpers/connectShyftWebhookTestHelpers.ts`

### 3. Run targeted bridge-related Jest suites

```sh
cd apps/connectshyft-api
npx jest --runInBand --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
```

Expected result:
- all targeted suites pass

### 4. Run repository boundary enforcement

```sh
cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js
```

Expected result:
- boundary enforcement passes

### 5. Confirm deployment, routing, and database invariants remain unchanged

```sh
git diff --name-only -- \
  nginx \
  docker-compose.example.yml \
  docker-compose.production.example.yml \
  apps/admin-api/src \
  apps/moneyshyft-api/src \
  apps/connectshyft-api/src/migrations
```

Expected result:
- no relevant runtime deploy/routing/database files changed for Admin, MoneyShyft, or ConnectShyft

### 6. Record no-op Nginx routing delegation validation

```sh
git diff --name-only -- \
  nginx \
  apps/admin-api/src/routes \
  apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/moneyshyft-api/src/routes
```

Expected result:
- no changes that affect `/api/v1/auth/*` or `/api/v1/platform/admin/*` delegation to `admin-api`
- no changes that affect `/api/v1/connectshyft/*` lane ownership

### 7. Record no-op localhost binding and canonical port validation

```sh
git diff --name-only -- \
  apps/admin-api/src/server.ts \
  apps/moneyshyft-api/src/server.ts \
  apps/connectshyft-api/src/server.ts \
  docker-compose.example.yml \
  docker-compose.production.example.yml
```

Expected result:
- no changes to API bind behavior or canonical ports for `admin-api`, `money-api`, or `connect-api`

### 8. Record shared Postgres compatibility and migration ownership validation

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
- no schema or database connectivity changes
- `admin-api` remains the only production migration owner

### 9. Record reproducible runbook validation

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
- no deployment runbook or production topology changes are required for CS-004b because the issue is test-only cleanup

## Evidence To Capture

- list of updated bridge test files
- before/after examples of normalized fixture names
- targeted Jest pass output
- boundary enforcement pass output
- confirmation that runtime behavior and deploy/routing/database surfaces were unchanged
- confirmation that routing delegation, API binding/ports, shared Postgres ownership, and runbook reproducibility remained unchanged

## Recorded Results

### Updated file set

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`
- `specs/004-bridge-test-fixture-normalization/contracts/bridge-test-fixture-contract.md`
- `specs/004-bridge-test-fixture-normalization/quickstart.md`
- `specs/004-bridge-test-fixture-normalization/tasks.md`

### Before / after fixture examples

- `connectshyft.bridge-flow.test.ts`
  - before: `provider_leg_id: 'telnyx-leg-operator-thread-f1-unclaimed-1001'`
  - after: `providerLegId: 'provider-leg-operator-thread-f1-unclaimed-1001'`
- `connectshyft.outbound-dispatch.test.ts`
  - before: `providerMessageId: 'telnyx-message-thread-f1-unclaimed-1001'`
  - after: `providerMessageId: 'provider-message-thread-f1-unclaimed-1001'`
- `bridgeSessions.test.ts`
  - before: `providerCallId: 'telnyx-leg-neighbor-thread-f1-unclaimed-1001'`
  - after: `providerCallId: 'provider-leg-neighbor-thread-f1-unclaimed-1001'`
- `providerCorrelationMappings.test.ts`
  - before: `providerName: 'telnyx', providerIdentifier: 'telnyx-leg-f3-1001'`
  - after: `providerName: 'provider-a', providerIdentifier: 'provider-leg-f3-1001'`

### Targeted Jest result

Command:

```sh
cd apps/connectshyft-api
env NODE_ENV=test \
  MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci \
  ENABLE_TEST_CONNECTSHYFT_FLAGS=true \
  npx jest --runInBand --runTestsByPath \
    src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
    src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
    src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
    src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
```

Result:

- `4` suites passed
- `27` tests passed

### Vendor-label scan result

Command:

```sh
rg -n "telnyx-|twilio-|provider_leg_id:|provider_message_id:|provider_event_id:" \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts \
  domains/communication/bridge/__tests__/bridgeStateMachine.test.ts \
  domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts \
  tests/support/helpers/connectShyftWebhookTestHelpers.ts
```

Result:

- no matches in the four bridge-facing app/module tests
- no matches in `bridgeStateMachine.test.ts`
- no matches in `handleProviderBridgeEvent.test.ts`
- remaining matches are limited to `tests/support/helpers/connectShyftWebhookTestHelpers.ts` and are allowed provider-native signature/header fields:
  - `x-test-connectshyft-telnyx-public-key`
  - `telnyx-timestamp`
  - `telnyx-signature-ed25519`

### Boundary enforcement result

Command:

```sh
node scripts/enforce-workspace-boundaries.js
```

Result:

- `Workspace boundary guard passed (projects=8, sharedProjects=1)`

### Touched-file guard result

Command:

```sh
git diff --name-only
```

Result:

- only the four in-scope bridge-facing test files and feature-doc files changed
- no runtime deploy, routing, database, UI, or adapter files changed

### No-op routing delegation validation

Command:

```sh
git diff --name-only -- \
  nginx \
  apps/admin-api/src/routes \
  apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/moneyshyft-api/src/routes
```

Result:

- no diffs
- `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegation to `admin-api` remains unchanged
- `/api/v1/connectshyft/*` lane ownership remains unchanged

### No-op localhost binding / canonical port validation

Command:

```sh
git diff --name-only -- \
  apps/admin-api/src/server.ts \
  apps/moneyshyft-api/src/server.ts \
  apps/connectshyft-api/src/server.ts \
  docker-compose.example.yml \
  docker-compose.production.example.yml
```

Result:

- no diffs
- `admin-api`, `money-api`, and `connect-api` localhost binding / canonical ports remain unchanged

### Shared Postgres / migration ownership validation

Command:

```sh
git diff --name-only -- \
  apps/admin-api/src/migrations \
  apps/moneyshyft-api/src/migrations \
  apps/connectshyft-api/src/migrations \
  apps/admin-api/src/config/database.ts \
  apps/moneyshyft-api/src/config/database.ts \
  apps/connectshyft-api/src/config/database.ts
```

Result:

- no diffs
- no schema or database connectivity changes were introduced
- `admin-api` remains the production migration owner

### Runbook reproducibility validation

Command:

```sh
git diff --name-only -- \
  SETUP.md \
  PRODUCTION_DEPLOYMENT_GUIDE.md \
  nginx \
  docker-compose.example.yml \
  docker-compose.production.example.yml \
  apps/*/Dockerfile.production
```

Result:

- no diffs
- no deployment or runbook changes are required because CS-004b is test-only cleanup
