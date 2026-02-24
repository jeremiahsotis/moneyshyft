---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T18:43:17.025Z'
---

# ATDD Checklist - Epic 2, Story 5: Refusal Outcomes with Structured Alternatives

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

As a requester, I want to refusal outcomes with alternatives before or after commitment creation, so that refusal is explicit, understandable, and actionable.

## Acceptance Criteria
1. Given scheduling or execution cannot proceed, when refusal is issued, then refusal reason and structured alternatives are persisted.
2. Refusal is visible in lifecycle/audit history.
3. Given requester or staff views a refusal outcome, when alternatives are presented, then the UI/API contract provides explicit, user-actionable next-step options.

## Generation Mode
- Selected mode: AI generation (clear ACs and strong in-repo ATDD conventions).

## Failing Tests Created (RED Phase)

### API Tests (5)
**File:** `tests/api/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.api.spec.ts`
- ✅ [P0] persists refusal reason taxonomy and structured alternatives on refusal issuance @P0
  - Status: RED (skipped by design)
- ✅ [P0] supports refusal persistence before and after commitment creation paths @P0
  - Status: RED (skipped by design)
- ✅ [P0] exposes refusal history as auditable lifecycle events @P0
  - Status: RED (skipped by design)
- ✅ [P1] returns explicit actionable alternatives and next-step contract fields @P1
  - Status: RED (skipped by design)
- ✅ [P1] keeps envelope keys stable for refusal persistence and validation-refusal outcomes @P1
  - Status: RED (skipped by design)

### E2E Tests (2)
**File:** `tests/e2e/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.spec.ts`
- ✅ [P1] requester/staff view shows refusal reason with structured alternatives and next steps @P1
  - Status: RED (skipped by design)
- ✅ [P1] refusal history view surfaces deterministic refusal metadata in audit timeline @P1
  - Status: RED (skipped by design)

## Data Factories Created
- `tests/support/factories/routeShyftStory25Factory.ts`

## Fixtures Created
- `tests/support/fixtures/routeShyftStory25.fixture.ts`

## Required data-testid Attributes
- `routeshyft-refusal-submit`
- `routeshyft-refusal-outcome-banner`
- `routeshyft-refusal-code`
- `routeshyft-refusal-alternatives-list`
- `routeshyft-refusal-next-steps`
- `routeshyft-refusal-audit-history`

## Implementation Checklist
- [ ] Implement API behavior to satisfy all Story 2-5 ATDD API assertions.
- [ ] Implement UI behavior and test IDs to satisfy all Story 2-5 ATDD E2E assertions.
- [ ] Remove `test.skip` markers from Story 2-5 specs.
- [ ] Run Story 2-5 specs and reach GREEN phase.

## Running Tests
```bash
npx playwright test tests/api/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.api.spec.ts
npx playwright test tests/e2e/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.spec.ts
```

## Risks / Assumptions
- Structured refusal taxonomy and lifecycle history projection are not fully implemented yet; RED expected.

## Output Files
- `tests/api/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.api.spec.ts`
- `tests/e2e/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.spec.ts`
- `tests/support/factories/routeShyftStory25Factory.ts`
- `tests/support/fixtures/routeShyftStory25.fixture.ts`
- `_bmad-output/test-artifacts/atdd-checklist-2-5.md`
