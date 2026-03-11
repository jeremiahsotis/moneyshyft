---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-17T18:22:57Z'
storyId: '0-5'
storyFile: '/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-5-shared-api-envelope-and-business-refusal-contract.md'
generationMode: 'ai-generation'
tddPhase: 'RED'
subprocessTimestamp: '2026-02-17T18-22-57Z'
---

# ATDD Checklist - Epic 0, Story 5: Shared API Envelope and Business Refusal Contract

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Workflow Progress Log

### Step 1 - Preflight and Context

- Story loaded: `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-5-shared-api-envelope-and-business-refusal-contract.md`
- Framework config loaded: `/Users/jeremiahotis/moneyshyft/playwright.config.ts`
- Test patterns reviewed under `/Users/jeremiahotis/moneyshyft/tests`
- Required policy gates passed on branch: `codex/story-0-5-shared-api-envelope-and-business-refusal-contract`
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/0-5-shared-api-envelope-and-business-refusal-contract.md`
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
- Acceptance criteria are concise and contract-driven, suitable for deterministic ATDD generation.
- Existing platform contract tests under `tests/api/platform` and `tests/e2e/platform` provide consistent naming and assertion patterns.
- Recording mode was not required because this story is backend contract focused and tests are intentionally RED-phase.

### Step 3 - Test Strategy

Acceptance criteria mapped to scenarios:

1. Shared envelope helpers are reused for success and refusal response contracts.
2. Business refusals preserve HTTP 200 while returning `ok=false` with structured `code`/`message`.
3. Envelope shape remains consistent across success/refusal paths for downstream consumers.
4. Correlation and tenant metadata remain stable across contract paths.

Test levels selected:
- API (P0/P1): envelope contract correctness and business refusal semantics
- E2E (P0/P1): request-journey consistency for contract consumers

Priority allocation:
- P0: shared envelope success contract + business refusal HTTP 200 contract
- P1: envelope shape consistency, deterministic refusal payloads, correlation continuity

RED-phase enforcement:
- All generated tests use `test.skip(...)` intentionally
- Assertions target expected final contract behavior (not placeholder assertions)

---

## Story Summary

Story 0.5 defines a shared platform response-envelope contract and business refusal semantics for kernel APIs. The RED-phase tests lock the external behavior before implementation so success and refusal paths remain consistent, deterministic, and safe for downstream consumers.

**As a** platform integrator  
**I want** shared envelope helpers and deterministic business refusal contracts  
**So that** API consumers can rely on stable response semantics

---

## Acceptance Criteria

1. they use shared envelope helpers
2. business refusals return HTTP 200 with `ok=false` and structured code/message

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts` (149 lines)

- ✅ **Test:** `returns canonical success envelope using shared helper contract @P0`
  - **Status:** RED - expected failure until shared helper-backed success contract endpoint exists
  - **Verifies:** canonical success envelope keys and metadata contract
- ✅ **Test:** `returns business refusal contract as HTTP 200 with structured code/message @P0`
  - **Status:** RED - expected failure until business refusal contract endpoint is implemented
  - **Verifies:** HTTP 200 + `ok=false` + structured `code`/`message` + `refusalType=business`
- ✅ **Test:** `keeps shared envelope shape consistent between success and business refusal contracts @P1`
  - **Status:** RED - expected failure until shared helper contract is reused consistently
  - **Verifies:** canonical top-level envelope shape across both outcomes
- ✅ **Test:** `keeps refusal envelopes deterministic and free of internal stack leakage @P1`
  - **Status:** RED - expected failure until refusal serialization and hardening are implemented
  - **Verifies:** deterministic refusal payload and no internal `stack` leakage

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts` (86 lines)

- ✅ **Test:** `keeps HTTP 200 semantics for business refusals in journey flow @P0`
  - **Status:** RED - expected failure until contract path is implemented
  - **Verifies:** journey-level refusal uses HTTP 200 with business refusal envelope
- ✅ **Test:** `echoes correlation id consistently across success and refusal envelope paths @P1`
  - **Status:** RED - expected failure until shared helper wiring is complete
  - **Verifies:** correlation continuity across success and refusal responses
- ✅ **Test:** `exposes structured refusal fields for downstream UI adapters @P1`
  - **Status:** RED - expected failure until final refusal contract shape is implemented
  - **Verifies:** downstream adapters can rely on deterministic `ok/code/message/refusalType`

### Component Tests (0 tests)

No component-level tests were generated for this story because scope is API contract behavior.

---

## Data Factories Created

### Shared API Envelope Factory

**File:** `tests/support/factories/sharedApiEnvelopeFactory.ts`

**Exports:**

- `createSharedEnvelopeHeaders(overrides?)`
- `createSharedEnvelopeSuccessProbe(overrides?)`
- `createBusinessRefusalProbe(overrides?)`

Factory outputs provide deterministic headers and contract probe payloads for RED-phase API/E2E tests.

---

## Fixtures Created

### Shared API Envelope Fixture

**File:** `tests/support/fixtures/sharedApiEnvelope.fixture.ts`

**Fixtures:**

- `sharedEnvelopeHeaders`
- `sharedSuccessProbe`
- `businessRefusalProbe`

These fixtures provide isolated, reusable contract inputs for journey-level tests.

---

## Mock Requirements

External mocks are not required for this story.

Expected kernel contract endpoints (to implement):
- `POST /api/v1/platform/_kernel/contracts/envelope/success`
- `POST /api/v1/platform/_kernel/contracts/envelope/business-refusal`

---

## Required data-testid Attributes

No UI selectors are required for this story in ATDD RED phase.

---

## Implementation Checklist

### Test: Shared envelope success contract

**File:** `tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts`

**Tasks to make this test set pass:**

- [ ] Implement shared envelope helper(s) for canonical success contract responses
- [ ] Implement success contract endpoint and return expected `code`/`message`
- [ ] Ensure `correlationId` and `tenantId` are included in envelope
- [ ] Remove `test.skip()` from success contract test
- [ ] Run: `npm run test:e2e -- tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts`
- [ ] ✅ Tests pass

### Test: Business refusal contract semantics

**File:** `tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts`

**Tasks to make this test set pass:**

- [ ] Implement business refusal helper path returning HTTP 200 + `ok=false`
- [ ] Emit deterministic refusal fields: `code`, `message`, `refusalType='business'`
- [ ] Reuse shared envelope helper shape between success and refusal outcomes
- [ ] Remove `test.skip()` from business refusal API tests
- [ ] Run: `npm run test:e2e -- tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts`
- [ ] ✅ Tests pass

### Test: Journey-level contract stability

**File:** `tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts`

**Tasks to make this test set pass:**

- [ ] Ensure journey callers receive HTTP 200 for business refusals
- [ ] Preserve correlation metadata consistently across contract paths
- [ ] Ensure refusal payload remains deterministic and adapter-safe
- [ ] Remove `test.skip()` from E2E journey tests
- [ ] Run: `npm run test:e2e -- tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts`
- [ ] ✅ Tests pass

---

## Running Tests

```bash
# Run story 0.5 generated ATDD specs
npm run test:e2e -- tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts

# Run API spec only
npm run test:e2e -- tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts

# Run E2E spec only
npm run test:e2e -- tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts

# Run headed mode
npm run test:e2e:headed -- tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- RED-phase ATDD contracts generated for API and journey levels.
- Tests are intentionally `test.skip()` while implementation is missing.
- Assertions are concrete and deterministic.

### GREEN Phase (Next)

1. Implement shared envelope helper and business refusal contract endpoints.
2. Remove `test.skip()` incrementally (P0 first).
3. Verify API tests green, then journey tests green.

### REFACTOR Phase (After Green)

1. Consolidate envelope serialization helpers into reusable platform contract utilities.
2. Keep refusal envelope structure stable and versioned.
3. Preserve deterministic response semantics and remove duplication.

---

## Test Execution Evidence

Generation artifacts:

- `/tmp/tea-atdd-api-tests-2026-02-17T18-22-57Z.json`
- `/tmp/tea-atdd-e2e-tests-2026-02-17T18-22-57Z.json`
- `/tmp/tea-atdd-summary-2026-02-17T18-22-57Z.json`

Persisted copies:

- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-02-17T18-22-57Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-02-17T18-22-57Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-02-17T18-22-57Z.json`

Validation run:

- `npm run test:e2e -- tests/api/platform/shared-api-envelope-and-business-refusal-contract.api.spec.ts tests/e2e/platform/shared-api-envelope-and-business-refusal-contract.spec.ts`
- Result: 7 skipped (expected in RED phase)

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

- Story acceptance criteria are intentionally high-level; endpoint paths and refusal code names are contractual assumptions for RED-phase design.
- Shared helper implementation boundaries (middleware helper vs service helper) should be confirmed during GREEN phase.

---

## Next Recommended Workflow

- Continue with implementation workflow for Story 0.5.
- After implementation, remove `test.skip()` and run green-phase verification.
