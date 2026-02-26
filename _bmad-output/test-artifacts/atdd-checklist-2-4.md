---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-26T11:50:52Z'
---

# ATDD Checklist - Epic 2, Story 4: Request-to-Commitment Linkage and Terminal Enforcement

**Date:** 2026-02-26
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Operations staff require deterministic closure for every request lifecycle: each request must terminate as `refused`, `cancelled`, or linked `committed`, and unresolved states must expose reconciliation paths. This checklist captures RED-phase test coverage for request terminal enforcement and commitment-linkage operability.

## Acceptance Criteria

1. Given a request lifecycle starts, when it is processed, then it reaches an explicit terminal request state.
2. Linked commitments independently reach terminal commitment states.
3. Given operations staff review unresolved work, when terminal enforcement or linkage failures occur, then UI/API views expose clear reconciliation actions and current lifecycle status.

## Generation Mode

- Selected mode: AI generation
- Rationale: acceptance criteria are clear, route-lane API conventions already established, and selector contracts are already deterministic.

## Test Strategy

- AC1 mapped to API P0 terminal-state and canonical linkage assertions.
- AC2 mapped to API P0 independent commitment-lifecycle assertions.
- AC3 mapped to API P1 reconciliation/envelope assertions and E2E P1 operator-view reconciliation visibility assertions.
- Duplicate coverage avoided: API validates service contracts and lifecycle payload semantics; E2E validates operator-facing reconciliation and status presentation.

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts` (121 lines)

- ✅ **Test:** `[P0] enforces explicit request terminal states and rejects undefined terminal outcomes @P0`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** explicit terminal-state enforcement contract
- ✅ **Test:** `[P0] maintains canonical request-to-commitment linkage for accepted request outcomes @P0`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** canonical linkage behavior
- ✅ **Test:** `[P0] preserves independent commitment lifecycle state after request terminalization @P0`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** request/commitment lifecycle decoupling after linkage
- ✅ **Test:** `[P1] returns reconciliation action guidance for linkage or terminal-enforcement failures @P1`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** reconciliation guidance in failure/refusal paths
- ✅ **Test:** `[P1] keeps envelope keys stable for terminalization success and refusal outcomes @P1`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** response-envelope contract stability

### E2E Tests (2 tests)

**File:** `tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts` (35 lines)

- ✅ **Test:** `[P1] operations view surfaces explicit terminal request status and lifecycle details @P1`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** operator status visibility for terminal lifecycle data
- ✅ **Test:** `[P1] operations view surfaces clear reconciliation actions for unresolved linkage or terminal failures @P1`
  - **Status:** RED (intentionally skipped via `test.skip()`)
  - **Verifies:** operator reconciliation action visibility

## Data Factories Created

### RouteShyft Story 2.4 Factory

**File:** `tests/support/factories/routeShyftStory24Factory.ts` (120 lines)

**Exports:**

- `createStory24Context(overrides?)`
- `createStory24Headers(context, overrides?)`
- `createStory24HappyPayload(context)`
- `createStory24RefusalPayload(context)`

## Fixtures Created

### RouteShyft Story 2.4 Fixture

**File:** `tests/support/fixtures/routeShyftStory24.fixture.ts` (33 lines)

**Fixtures:**

- `story24Context`
- `story24Headers`
- `story24HappyPayload`
- `story24RefusalPayload`

## Mock Requirements

- No new external-service mocks required for this story-specific RED-phase package.
- Existing API helper + tenant-scoped headers are sufficient for contract-level ATDD assertions.

## Required data-testid Attributes

- `routeshyft-request-finalize-submit`
- `routeshyft-request-terminal-status`
- `routeshyft-request-refusal-banner`
- `routeshyft-request-refusal-code`
- `routeshyft-request-reconciliation-actions`
- `routeshyft-request-lifecycle-details`

## Implementation Checklist

- [ ] Implement/confirm request terminalization behavior for all accepted/refused/cancelled outcomes.
- [ ] Implement/confirm canonical accepted-request to commitment linkage persistence.
- [ ] Implement/confirm commitment lifecycle independence after linkage.
- [ ] Implement/confirm reconciliation actions and lifecycle-status visibility in API/UI responses.
- [ ] Ensure required `data-testid` attributes exist in operator UI surfaces.
- [ ] Remove `test.skip()` from Story 2.4 ATDD specs for GREEN phase validation.
- [ ] Run targeted Story 2.4 ATDD tests and confirm pass in GREEN phase.

## Running Tests

```bash
# API RED/GREEN progression
npx playwright test tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts

# E2E RED/GREEN progression
npx playwright test tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts
```

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- API + E2E ATDD specs exist and intentionally use `test.skip()`.
- TDD compliance validated: no placeholder assertions, all tests marked expected-to-fail pre-implementation.

### GREEN Phase (Next)

1. Remove `test.skip()` from Story 2.4 ATDD specs.
2. Implement minimal behavior to satisfy one failing test at a time.
3. Re-run targeted spec after each implementation slice.

### REFACTOR Phase (After Green)

1. Remove duplication and stabilize fixtures/factories.
2. Re-run Story 2.4 ATDD specs plus broader route-lane regression checks.

## Step 5 Validation Notes

- Mandatory gates passed:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/2-4-request-to-commitment-linkage-and-terminal-enforcement.md`
- Subprocess outputs captured:
  - `/tmp/tea-atdd-api-tests-2026-02-26T11-50-52Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-26T11-50-52Z.json`
  - `/tmp/tea-atdd-summary-2026-02-26T11-50-52Z.json`
- Artifact cache copies stored under `_bmad-output/test-artifacts/atdd-temp/`.
- TDD RED validation: all Story 2.4 generated tests contain `test.skip()` and expected assertions.

## Output Files

- `tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts`
- `tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts`
- `tests/support/factories/routeShyftStory24Factory.ts`
- `tests/support/fixtures/routeShyftStory24.fixture.ts`
- `_bmad-output/test-artifacts/atdd-temp/api-2026-02-26T11-50-52Z.json`
- `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-26T11-50-52Z.json`
- `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-26T11-50-52Z.json`
- `_bmad-output/test-artifacts/atdd-checklist-2-4.md`

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
- `api-testing-patterns.md`
- `network-first.md`
- `fixture-architecture.md`
