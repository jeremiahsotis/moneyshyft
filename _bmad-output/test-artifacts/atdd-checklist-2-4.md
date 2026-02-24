---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T18:43:04.304Z'
---

# ATDD Checklist - Epic 2, Story 4: Request-to-Commitment Linkage and Terminal Enforcement

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

As a operations staff, I want to each request ends in refusal/cancellation or linked commitment, so that no request is lost in undefined state.

## Acceptance Criteria
1. Given a request lifecycle starts, when it is processed, then it reaches an explicit terminal request state.
2. Linked commitments independently reach terminal commitment states.
3. Given operations staff review unresolved work, when terminal enforcement or linkage failures occur, then UI/API views expose clear reconciliation actions and current lifecycle status.

## Generation Mode
- Selected mode: AI generation (clear ACs and strong in-repo ATDD conventions).

## Failing Tests Created (RED Phase)

### API Tests (5)
**File:** `tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts`
- ✅ [P0] enforces explicit request terminal states and rejects undefined terminal outcomes @P0
  - Status: RED (skipped by design)
- ✅ [P0] maintains canonical request-to-commitment linkage for accepted request outcomes @P0
  - Status: RED (skipped by design)
- ✅ [P0] preserves independent commitment lifecycle state after request terminalization @P0
  - Status: RED (skipped by design)
- ✅ [P1] returns reconciliation action guidance for linkage or terminal-enforcement failures @P1
  - Status: RED (skipped by design)
- ✅ [P1] keeps envelope keys stable for terminalization success and refusal outcomes @P1
  - Status: RED (skipped by design)

### E2E Tests (2)
**File:** `tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts`
- ✅ [P1] operations view surfaces explicit terminal request status and lifecycle details @P1
  - Status: RED (skipped by design)
- ✅ [P1] operations view surfaces clear reconciliation actions for unresolved linkage or terminal failures @P1
  - Status: RED (skipped by design)

## Data Factories Created
- `tests/support/factories/routeShyftStory24Factory.ts`

## Fixtures Created
- `tests/support/fixtures/routeShyftStory24.fixture.ts`

## Required data-testid Attributes
- `routeshyft-request-finalize-submit`
- `routeshyft-request-terminal-status`
- `routeshyft-request-refusal-banner`
- `routeshyft-request-refusal-code`
- `routeshyft-request-reconciliation-actions`
- `routeshyft-request-lifecycle-details`

## Implementation Checklist
- [ ] Implement API behavior to satisfy all Story 2-4 ATDD API assertions.
- [ ] Implement UI behavior and test IDs to satisfy all Story 2-4 ATDD E2E assertions.
- [ ] Remove `test.skip` markers from Story 2-4 specs.
- [ ] Run Story 2-4 specs and reach GREEN phase.

## Running Tests
```bash
npx playwright test tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts
npx playwright test tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts
```

## Risks / Assumptions
- Terminal enforcement and reconciliation query surfaces are not implemented yet; RED expected.

## Output Files
- `tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts`
- `tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts`
- `tests/support/factories/routeShyftStory24Factory.ts`
- `tests/support/fixtures/routeShyftStory24.fixture.ts`
- `_bmad-output/test-artifacts/atdd-checklist-2-4.md`
