# Slice 11: ConnectShyft Router Orchestration Reduction + Frontend Build System Repair

## Objective

Stabilize two remaining seams without redesigning ConnectShyft behavior.

### Backend
Reduce `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` into a thin route-registration shell for the remaining route families that still contain orchestration.

### Frontend
Repair the `apps/connectshyft-web` production build by separating production TypeScript compilation from test-only TypeScript surface.

---

## Why This Slice Exists

Slices 4 through 9 extracted the major ConnectShyft route families, but `connectshyft.ts` still retains residual orchestration for number mappings, escalation configuration, and webhook receipt admin flows.

At the same time, `connectshyft-web` no longer builds cleanly in production because test files are currently included in the main TypeScript compilation surface while test-only dependencies are not installed in a way the build expects.

This slice closes both gaps.

---

## Non-Negotiable Constraints

### Preserve exactly
- API response shapes
- refusal envelope shapes
- webhook behavior
- telephony behavior
- provider integrations
- correlation behavior
- canonical event behavior
- identity behavior
- current route order

### This slice is only
- extraction
- stabilization
- boundary enforcement
- frontend build repair

### This slice is not
- a ConnectShyft redesign
- a PeopleCore redesign
- a provider rewrite
- a frontend feature slice

---

## Success Criteria

By the end of Slice 11:

- `connectshyft.ts` is thin and declarative for all remaining extracted route families
- remaining route orchestration has moved to module-owned handlers
- HTTP prerequisite logic lives in helper boundaries instead of router-local code
- `apps/connectshyft-web` production build passes cleanly
- frontend test surface is separated from build surface
- backend characterization behavior remains unchanged
- CI passes without follow-up patching

---

## Scope

### Backend route families in scope

- number mappings
- escalation recipients/config
- webhook receipt admin metrics/cleanup

### Frontend scope in scope

- build-system repair only
- TypeScript/test-surface separation only

### Explicitly out of scope

- ConnectShyft UI redesign
- router redesign beyond thin-router extraction
- provider or bridge internals
- canonical or correlation redesign
- PeopleCore schema implementation

---

# CHECKPOINT 1
## Add characterization locks for remaining router-owned route families

### Create tests

Create these files:

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.number-mappings.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-receipts-admin.characterization.test.ts`

### Lock current behavior for

#### Number mappings
- GET `/api/v1/connectshyft/numbers`
- POST `/api/v1/connectshyft/numbers`
- PUT `/api/v1/connectshyft/numbers/:mappingId`

Pin:
- success envelope shape
- refusal envelope shape
- missing `mappingId` behavior
- orgUnit context behavior
- current response contract for mapping lists and save/update paths

#### Escalation configuration
- GET `/api/v1/connectshyft/escalation/recipients`
- GET `/api/v1/connectshyft/escalation/config`
- PUT `/api/v1/connectshyft/escalation/config`

Pin:
- recipient options response shape
- config response shape
- validation/refusal semantics
- orgUnit and capability behavior

#### Webhook receipt admin
- GET `/api/v1/connectshyft/admin/webhook-receipts/metrics`
- POST `/api/v1/connectshyft/admin/webhook-receipts/cleanup`

Pin:
- success envelope shape
- temporary-unavailable refusal mapping
- dry-run behavior shape
- retention window payload fields

### Validation

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.number-mappings.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-receipts-admin.characterization.test.ts
```

Then run:

```bash
pnpm nx run connectshyft-api:test
```

### Commit

```bash
git add .
git commit -m "test(slice-11): add router orchestration characterization locks"
```

STOP.

---

# CHECKPOINT 2
## Extract remaining orchestration handlers and helper boundaries

### Create helper boundaries

Create these files if they do not already exist:

- `apps/connectshyft-api/src/modules/connectshyft/http/numberMappingContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/escalationConfigContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/webhookReceiptAdminContext.ts`

### Helper ownership

#### `numberMappingContext.ts`
Own only:
- module capability prerequisite checks
- orgUnit resolution for number mapping routes
- `mappingId` param parsing/refusal mapping
- request body orgUnit extraction when applicable

Do not own:
- create/update/list mapping business logic
- provider number normalization logic already owned elsewhere

#### `escalationConfigContext.ts`
Own only:
- escalation capability prerequisite checks
- orgUnit resolution
- request parsing for escalation config routes
- refusal mapping for route prerequisites

Do not own:
- escalation config domain logic
- recipient directory domain behavior

#### `webhookReceiptAdminContext.ts`
Own only:
- module capability prerequisite checks
- orgUnit resolution
- query/body parsing for metrics and cleanup routes
- refusal mapping for route prerequisites

Do not own:
- metrics calculation
- cleanup execution logic

### Create handlers

Create:

- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectNumberMappings.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNumberMapping.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectNumberMapping.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectEscalationRecipients.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectEscalationConfig.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectWebhookReceiptMetrics.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookReceiptCleanup.ts`

Update:

- `apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts`

### Handler rules

Handlers must:
- preserve exact current response shapes
- call the new helper boundaries for prerequisite resolution
- delegate to existing domain/service modules
- not redesign behavior

### Validation

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.number-mappings.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-receipts-admin.characterization.test.ts
```

Then run:

```bash
pnpm nx run connectshyft-api:test
```

### Commit

```bash
git add .
git commit -m "refactor(slice-11): extract remaining connectshyft orchestration handlers"
```

STOP.

---

# CHECKPOINT 3
## Convert router to thin delegation for remaining route families

### File

Update:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

### Convert these routes to direct handler delegation

- GET `/numbers`
- POST `/numbers`
- PUT `/numbers/:mappingId`
- GET `/admin/webhook-receipts/metrics`
- POST `/admin/webhook-receipts/cleanup`
- GET `/escalation/recipients`
- GET `/escalation/config`
- PUT `/escalation/config`

### Rules

- preserve route order exactly
- remove only now-unused router-local orchestration code
- do not move domain behavior back into router
- do not change success/refusal contracts

### Validation

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.number-mappings.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-receipts-admin.characterization.test.ts
```

Then run:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Commit

```bash
git add .
git commit -m "refactor(slice-11): reduce connectshyft router to thin orchestration shell"
```

STOP.

---

# CHECKPOINT 4
## Add helper-boundary tests for the new contexts

### Create tests

Create:

- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.numberMappingContext.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.escalationConfigContext.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.webhookReceiptAdminContext.test.ts`

### Lock helper behavior

#### Number mapping context
- valid prerequisite resolution
- missing `mappingId` refusal mapping
- orgUnit context prerequisite behavior
- helper stays prerequisite-only

#### Escalation config context
- valid prerequisite resolution
- capability/context refusal mapping
- parsed config input is stable
- helper stays prerequisite-only

#### Webhook receipt admin context
- valid prerequisite resolution
- metrics/cleanup route-kind separation
- unavailable prerequisite mapping if applicable
- helper stays prerequisite-only

### Validation

Run:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.number-mappings.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.escalation-config.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-receipts-admin.characterization.test.ts \
  src/modules/connectshyft/__tests__/handlers.numberMappingContext.test.ts \
  src/modules/connectshyft/__tests__/handlers.escalationConfigContext.test.ts \
  src/modules/connectshyft/__tests__/handlers.webhookReceiptAdminContext.test.ts
```

Then run:

```bash
pnpm nx run connectshyft-api:test
```

### Commit

```bash
git add .
git commit -m "test(slice-11): add orchestration helper boundary coverage"
```

STOP.

---

# CHECKPOINT 5
## Repair frontend production build using long-term separation

### Problem to fix

Current build failure shows `vue-tsc` is compiling test files from the main `tsconfig.json` surface while test-only dependencies are not available in that production surface.

That is a configuration problem, not a mid-stream acceptable failure.

### Install required test dependencies

From `apps/connectshyft-web` run:

```bash
npm install -D vitest @vue/test-utils jsdom
```

### Update `package.json`

Add a test script if missing:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Preserve existing scripts.

### Update `tsconfig.json`

Keep production app compilation focused on production source only.

Add an `exclude` block that excludes test files:

```json
"exclude": [
  "src/**/__tests__/**",
  "src/**/*.test.ts",
  "src/**/*.spec.ts"
]
```

Do not break the existing alias setup.

### Create `tsconfig.vitest.json`

Create:

- `apps/connectshyft-web/tsconfig.vitest.json`

Use this content pattern:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "vite/client", "jsdom"]
  },
  "include": [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "src/**/__tests__/**/*.ts",
    "src/**/*.vue",
    "src/**/*.d.ts"
  ]
}
```

If editor/test tooling needs small adjustments, keep them confined to the Vitest config or the new test tsconfig, not the production build config.

### Optional alignment check

If needed, update `vitest.config.ts` so it clearly points to the test environment already intended for Vue tests. Do not change runtime app build behavior.

### Validation

From `apps/connectshyft-web` run:

```bash
npm ci
npm run build
npm run test
```

### Definition of done for this checkpoint

- production build passes
- test command passes
- production build no longer depends on test-only files being part of the main `vue-tsc` surface

### Commit

```bash
git add .
git commit -m "fix(slice-11): repair frontend build and isolate test type system"
```

STOP.

---

# CHECKPOINT 6
## Documentation and architectural guardrails

### Create

Create:

- `docs/architecture/connectshyft-router-orchestration-notes.md`

Use the corrected authoritative version, not a skeleton note.

### Update

Update:

- `docs/architecture/connectshyft-router-refactor-plan.md`

### Refactor-plan update requirements

Mark:
- Slices 4 through 11 complete
- ConnectShyft route-family extraction sequence complete
- frontend build/test surface separation completed in Slice 11

Set next work to:
- architecture lock and documentation consolidation if not already completed elsewhere
- PeopleCore / Identity Resolution implementation planning
- ConnectShyft refinement and model-alignment work as later intentional slices

Make clear:
- provider, bridge, canonical, and correlation internals were intentionally preserved during the extraction sequence
- Slice 11 was stabilization, not behavior redesign

### Validation

Run:

```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

Then run:

```bash
cd apps/connectshyft-web && npm run build && npm run test
```

### Commit

```bash
git add .
git commit -m "docs(slice-11): lock router and frontend build architecture"
```

STOP.

---

# PR

```bash
git push -u origin codex/slice-11-router-reduction-and-web-build-fix
```

PR title:

```text
Slice 11: reduce ConnectShyft router orchestration and fix frontend build system
```

---

# Final Review Standard

Do not call Slice 11 complete unless all of the following are true:

- remaining router orchestration is extracted
- router uses named handler delegation for the remaining in-scope route families
- helper-boundary tests exist
- characterization tests still pass
- frontend production build passes
- frontend tests pass
- docs are updated and non-skeletal
- CI passes cleanly

---

# Counterpoint: what not to do

Do not use Slice 11 to sneak in:

- ConnectShyft redesign
- webhook redesign
- telephony redesign
- PeopleCore schema work
- frontend feature work
- provider cleanup unrelated to router extraction

That belongs in later slices.
