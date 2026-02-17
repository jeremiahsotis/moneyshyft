---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-17T21:43:56Z'
---

# ATDD Checklist - Epic 0, Story 7: Mutation Transaction Wrapper with Mandatory Event/Outbox Writes

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

This story introduces a kernel-level mutation execution wrapper that requires domain writes, event writes, and outbox writes to be handled as one atomic contract. The red-phase suite asserts that any missing event/outbox write is refused in a deterministic business envelope so partial persistence cannot slip through.

**As a** backend developer
**I want** a shared mutation execution wrapper
**So that** handlers cannot persist state without corresponding event/outbox records

---

## Acceptance Criteria

1. Domain write + event + outbox are atomic.
2. Missing event/outbox writes fail contract tests.

---

## Failing Tests Created (RED Phase)

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts` (98 lines)

- ✅ **Test:** executes atomic mutation contract journey when domain, event, and outbox writes are present `@P0`
  - **Status:** RED - contract endpoint not implemented yet
  - **Verifies:** atomic wrapper response and required write coverage in one integration context
- ✅ **Test:** surfaces canonical refusal envelope when event write is absent in journey flow `@P0`
  - **Status:** RED - refusal contract path not implemented yet
  - **Verifies:** missing event write yields deterministic business refusal envelope
- ✅ **Test:** keeps correlation metadata stable across missing-event and missing-outbox refusal paths `@P1`
  - **Status:** RED - correlated refusal responses not implemented yet
  - **Verifies:** stable correlation ID and distinct missing-write semantics across refusal paths

### API Tests (4 tests)

**File:** `tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts` (151 lines)

- ✅ **Test:** enforces atomic domain write plus event and outbox persistence contract `@P0`
  - **Status:** RED - atomic transaction wrapper contract endpoint not implemented yet
  - **Verifies:** all required write classes commit atomically in one contract response
- ✅ **Test:** returns business refusal when event write is missing from mutation transaction `@P0`
  - **Status:** RED - required-write validation endpoint not implemented yet
  - **Verifies:** missing event write returns canonical refusal envelope
- ✅ **Test:** returns business refusal when outbox write is missing from mutation transaction `@P0`
  - **Status:** RED - required-write validation endpoint not implemented yet
  - **Verifies:** missing outbox write returns canonical refusal envelope
- ✅ **Test:** guarantees refusal path reports no commit when required writes are missing `@P1`
  - **Status:** RED - no-partial-commit contract shape not implemented yet
  - **Verifies:** refusal paths explicitly report `transaction.committed=false`

### Component Tests (0 tests)

**File:** `N/A`

No component-level tests were generated because this story is backend contract focused.

---

## Data Factories Created

### Mutation Transaction Wrapper Factory

**File:** `tests/support/factories/mutationTransactionWrapperFactory.ts`

**Exports:**

- `createMutationWrapperHeaders(overrides?)` - Generates tenant/correlation/csrf header bundle
- `createAtomicMutationProbe(overrides?)` - Produces valid atomic mutation payload + expected contract metadata
- `createMissingWriteProbe(overrides?)` - Produces invalid payloads for missing event/outbox write refusal scenarios

**Example Usage:**

```typescript
const headers = createMutationWrapperHeaders();
const probe = createMissingWriteProbe({ missingWrite: 'event' });
```

---

## Fixtures Created

### Mutation Transaction Wrapper Fixtures

**File:** `tests/support/fixtures/mutationTransactionWrapper.fixture.ts`

**Fixtures:**

- `mutationWrapperHeaders` - shared request header context
- `atomicMutationProbe` - happy-path atomic contract payload + expected metadata
- `missingEventProbe` - refusal-path payload missing event write
- `missingOutboxProbe` - refusal-path payload missing outbox write

**Example Usage:**

```typescript
import { test } from '../../support/fixtures/mutationTransactionWrapper.fixture';
```

---

## Mock Requirements

### Mutation Transaction Wrapper Contract Endpoints

**Endpoints:**

- `POST /api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/atomic`
- `POST /api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes`

**Success Response (Atomic):**

```json
{
  "ok": true,
  "code": "MUTATION_TRANSACTION_WRAPPER_ATOMIC",
  "atomic": true,
  "eventOutboxRequired": true,
  "missingWrites": []
}
```

**Failure Response (Missing Required Write):**

```json
{
  "ok": false,
  "code": "MUTATION_EVENT_OUTBOX_WRITE_REQUIRED",
  "message": "Mutation transaction wrapper requires both event and outbox writes",
  "refusalType": "business",
  "missingWrites": ["event"]
}
```

---

## Required data-testid Attributes

No UI surface is required for this story's current ACs, so no `data-testid` additions are required in this phase.

---

## Implementation Checklist

### Test: enforces atomic domain write plus event and outbox persistence contract

**File:** `tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement mutation wrapper contract endpoint for atomic probe route
- [ ] Ensure domain, event, and outbox writes are executed in one DB transaction
- [ ] Return canonical success envelope with `atomic: true` and `missingWrites: []`
- [ ] Run test: `npx playwright test tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts`
- [ ] ✅ Test passes (green phase)

### Test: returns business refusal when event/outbox writes are missing

**File:** `tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement required-write validation endpoint
- [ ] Enforce strict requirement for both event and outbox payloads before commit
- [ ] Return refusal envelope (`ok=false`, `refusalType=business`, `missingWrites`)
- [ ] Ensure refusal path reports `transaction.committed=false`
- [ ] Run test: `npx playwright test tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts`
- [ ] ✅ Test passes (green phase)

### Test: journey-level refusal and correlation consistency

**File:** `tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts`

**Tasks to make this test pass:**

- [ ] Wire fixture-driven journey endpoints to implemented backend contracts
- [ ] Preserve `x-correlation-id` across all refusal envelopes
- [ ] Keep missing-write classification deterministic per request
- [ ] Run test: `npx playwright test tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts`
- [ ] ✅ Test passes (green phase)

---

## Running Tests

```bash
# Run all new red-phase tests for Story 0.7
npx playwright test tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts

# Run only API tests
npx playwright test tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts

# Run only E2E tests
npx playwright test tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts

# Headed mode for interactive debugging
npx playwright test --headed tests/e2e/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.spec.ts

# Debug mode
npx playwright test --debug tests/api/platform/mutation-transaction-wrapper-with-mandatory-event-outbox-writes.api.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Generated failing tests using `test.skip()` for all story 0.7 scenarios
- ✅ Added factory + fixture support for consistent test inputs
- ✅ Mapped acceptance criteria to API and integration journey coverage
- ✅ Produced implementation checklist for DEV green phase

### GREEN Phase (DEV Team - Next Steps)

1. Implement contract endpoints and transaction wrapper internals.
2. Remove `test.skip()` from the new API/E2E files.
3. Run tests and make each scenario pass.
4. Commit passing tests with implementation code.

### REFACTOR Phase

1. Consolidate duplicate request setup helpers if needed.
2. Harden type contracts for response payloads.
3. Keep refusal/success envelope shape consistent with shared platform contracts.

---

## Validation Notes

- Mandatory git policy gates executed and passed on branch `codex/story-0-7-mutation-transaction-wrapper-with-mandatory-event-outbox-writes`.
- ATDD subprocess artifacts written:
  - `/tmp/tea-atdd-api-tests-2026-02-17T21-43-56-278Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-17T21-43-56-278Z.json`
  - `/tmp/tea-atdd-summary-2026-02-17T21-43-56-278Z.json`
- Temp artifact location requirement satisfied (artifacts also persisted under `_bmad-output/test-artifacts`).
