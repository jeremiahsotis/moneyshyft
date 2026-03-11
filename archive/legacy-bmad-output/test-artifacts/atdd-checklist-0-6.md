---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-17T21:09:58Z'
storyId: '0-6'
storyFile: '/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-6-platform-events-and-outbox-schema-foundations.md'
generationMode: 'ai-generation'
tddPhase: 'RED'
subprocessTimestamp: '2026-02-17T21-09-58Z'
---

# ATDD Checklist - Epic 0, Story 6: Platform Events and Outbox Schema Foundations

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Workflow Progress Log

### Step 1 - Preflight and Context

- Story loaded: `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-6-platform-events-and-outbox-schema-foundations.md`
- Framework config loaded: `/Users/jeremiahotis/moneyshyft/playwright.config.ts`
- Test patterns reviewed under `/Users/jeremiahotis/moneyshyft/tests`
- Required policy gates passed on branch: `codex/story-0-6-platform-events-and-outbox-schema-foundations`
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/0-6-platform-events-and-outbox-schema-foundations.md`
- TEA flags:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`

Knowledge fragments loaded:
- Core: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`
- Playwright Utils: `overview`, `api-request`, `network-recorder`, `auth-session`, `intercept-network-call`, `recurse`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`
- Browser automation: `playwright-cli`

### Step 2 - Generation Mode

Selected mode: **AI generation**

Reasoning:
- Acceptance criteria are backend schema/index contract focused and can be represented deterministically with API-first RED tests.
- Existing platform test patterns under `tests/api/platform` and `tests/e2e/platform` support consistent naming and fixture composition.
- Recording mode is unnecessary because no UI flow is required in this story scope.

### Step 3 - Test Strategy

Acceptance criteria mapped to scenarios:

1. Canonical schema contract for `platform.events` exposes required lineage fields.
2. Canonical schema contract for `platform.outbox_events` exposes delivery/replay fields.
3. Operational/replay index metadata is available for deterministic querying.
4. Replay query semantics are explicit for downstream operators/dispatch tooling.

Test levels selected:
- API (P0/P1): schema/index contract assertions and replay metadata
- E2E (P0/P1): integration-journey contract continuity for schema + index consumers

Priority allocation:
- P0: events/outbox schema contracts
- P1: index and replay query contract consistency

RED-phase enforcement:
- All generated tests use `test.skip(...)` intentionally.
- Assertions target expected final schema and index contract behavior.

---

## Story Summary

Story 0.6 establishes canonical platform event and outbox schema foundations so future mutation wrappers can enforce event/outbox discipline. The RED-phase tests define the API contract for schema lineage fields and replay-ready index metadata before implementation lands.

**As a** platform architect  
**I want** canonical `platform.events` and `platform.outbox_events` schemas  
**So that** all write paths can emit integration-safe records

---

## Acceptance Criteria

1. events and outbox tables exist with required lineage and delivery fields
2. indexes support operational and replay queries

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts` (113 lines)

- ✅ **Test:** `returns canonical platform.events lineage schema contract @P0`
  - **Status:** RED - expected failure until events schema contract endpoint exists
  - **Verifies:** canonical events lineage fields and table identity
- ✅ **Test:** `returns canonical platform.outbox_events delivery schema contract @P0`
  - **Status:** RED - expected failure until outbox schema contract endpoint exists
  - **Verifies:** canonical outbox delivery/replay fields and table identity
- ✅ **Test:** `returns operational and replay index contract metadata for events/outbox @P1`
  - **Status:** RED - expected failure until index metadata endpoint exists
  - **Verifies:** required index sets for operational and replay query patterns
- ✅ **Test:** `exposes replay cursor semantics for pending outbox delivery queries @P1`
  - **Status:** RED - expected failure until replay-query contract endpoint exists
  - **Verifies:** deterministic outbox replay query keys and ordering contract

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts` (83 lines)

- ✅ **Test:** `returns schema contracts for events and outbox in one integration-safe journey @P0`
  - **Status:** RED - expected failure until both schema endpoints are implemented
  - **Verifies:** combined schema contract availability across one journey context
- ✅ **Test:** `keeps correlation metadata stable across schema and index contract endpoints @P1`
  - **Status:** RED - expected failure until correlation propagation is implemented
  - **Verifies:** correlation continuity across schema and index contract responses
- ✅ **Test:** `exposes replay-ready outbox index hints for operator tooling adapters @P1`
  - **Status:** RED - expected failure until outbox index metadata endpoint is implemented
  - **Verifies:** deterministic outbox index hints for replay-oriented adapters

### Component Tests (0 tests)

No component-level tests were generated because Story 0.6 scope is backend schema/index foundations.

---

## Data Factories Created

### Platform Event/Outbox Contract Factory

**File:** `tests/support/factories/platformEventOutboxFactory.ts`

**Exports:**

- `createPlatformContractHeaders(overrides?)`
- `createEventSchemaExpectation(overrides?)`
- `createOutboxSchemaExpectation(overrides?)`
- `createOperationalIndexExpectations()`

---

## Fixtures Created

### Platform Event/Outbox Fixture

**File:** `tests/support/fixtures/platformEventOutbox.fixture.ts`

**Fixtures:**

- `platformContractHeaders`
- `eventSchemaExpectation`
- `outboxSchemaExpectation`
- `operationalIndexExpectations`

---

## Mock Requirements

External mocks are not required for this story.

Expected kernel contract endpoints (to implement):
- `GET /api/v1/platform/_kernel/contracts/events/schema`
- `GET /api/v1/platform/_kernel/contracts/outbox/schema`
- `GET /api/v1/platform/_kernel/contracts/events-outbox/indexes`
- `GET /api/v1/platform/_kernel/contracts/outbox/replay-query`

---

## Required data-testid Attributes

No UI selectors are required for this story in ATDD RED phase.

---

## Implementation Checklist

### Test Group: Events Schema Contract

**File:** `tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts`

**Tasks to make this test group pass:**

- [ ] Add migration(s) for `platform.events` with required lineage fields
- [ ] Implement `GET /api/v1/platform/_kernel/contracts/events/schema`
- [ ] Return canonical schema contract payload with deterministic field list
- [ ] Remove `test.skip()` from events schema tests
- [ ] Run: `npm run test:e2e -- tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts`
- [ ] ✅ Tests pass

### Test Group: Outbox Schema and Replay Contract

**File:** `tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts`

**Tasks to make this test group pass:**

- [ ] Add migration(s) for `platform.outbox_events` with delivery/replay fields
- [ ] Add required operational and replay indexes
- [ ] Implement `GET /api/v1/platform/_kernel/contracts/outbox/schema`
- [ ] Implement `GET /api/v1/platform/_kernel/contracts/events-outbox/indexes`
- [ ] Implement `GET /api/v1/platform/_kernel/contracts/outbox/replay-query`
- [ ] Remove `test.skip()` from outbox/index API tests
- [ ] Run: `npm run test:e2e -- tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts`
- [ ] ✅ Tests pass

### Test Group: Journey-Level Contract Consistency

**File:** `tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts`

**Tasks to make this test group pass:**

- [ ] Ensure schema and index endpoints preserve correlation metadata
- [ ] Ensure journey context can request both schema contracts consistently
- [ ] Remove `test.skip()` from E2E journey tests
- [ ] Run: `npm run test:e2e -- tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts`
- [ ] ✅ Tests pass

---

## Running Tests

```bash
# Run story 0.6 generated ATDD specs
npm run test:e2e -- tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts

# Run API spec only
npm run test:e2e -- tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts

# Run E2E spec only
npm run test:e2e -- tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts

# Run headed mode
npm run test:e2e:headed -- tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- RED-phase schema and index contract tests generated for API and journey levels.
- Tests are intentionally `test.skip()` while implementation is missing.
- Assertions are concrete and deterministic for expected behavior.

### GREEN Phase (Next)

1. Implement migrations and contract endpoints for events/outbox schema + indexes.
2. Remove `test.skip()` incrementally (P0 before P1).
3. Verify API tests green, then journey tests green.

### REFACTOR Phase (After Green)

1. Consolidate schema contract serializers into platform kernel utilities.
2. Keep schema/index contract payloads versioned and deterministic.
3. Remove duplication across API and journey contract test fixtures.

---

## Test Execution Evidence

Generation artifacts:

- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-02-17T21-09-58Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-02-17T21-09-58Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-02-17T21-09-58Z.json`

Validation run:

- `npm run test:e2e -- tests/api/platform/platform-events-and-outbox-schema-foundations.api.spec.ts tests/e2e/platform/platform-events-and-outbox-schema-foundations.spec.ts`
- Result: expected skipped tests in RED phase

---

## Validation (Step 5)

Checklist status:

- [x] Prerequisites satisfied (story + framework + policy gates)
- [x] Test files created and organized by level (API/E2E)
- [x] All generated tests are explicitly RED-phase (`test.skip`)
- [x] Acceptance criteria mapped to scenarios and priorities
- [x] Supporting factory + fixture scaffolding created
- [x] ATDD checklist output generated at required path
- [x] Temp artifacts persisted under `{test_artifacts}/atdd-temp`

Open assumptions/risks:

- Story acceptance criteria are high-level; concrete field and index names are locked as RED-phase contract assumptions.
- Final migration names and endpoint payload schema may require minor adjustments during GREEN phase.

---

## Next Recommended Workflow

- Continue with implementation workflow for Story 0.6.
- After implementation, remove `test.skip()` and run green-phase verification.
