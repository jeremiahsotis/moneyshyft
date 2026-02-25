---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T18:42:36.092Z'
---

# ATDD Checklist - Epic 2, Story 2: Donor Self-Service Pickup Intake with Capacity Check

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

As a furniture donor, I want to submit a pickup request and see real scheduling availability, so that I get a definitive commitment or refusal outcome.

## Acceptance Criteria
1. Given a donor submits eligibility and item details, when capacity is evaluated, then the system returns schedulable slots or explicit refusal with alternatives.
2. Accepted requests create linked commitments.
3. Given a donor receives a schedulable or refusal outcome, when they review the result, then next steps and reasons are clearly visible in UI/API payloads.

## Generation Mode
- Selected mode: AI generation (clear ACs and strong in-repo ATDD conventions).

## Failing Tests Created (RED Phase)

### API Tests (5)
**File:** `tests/api/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.api.spec.ts`
- ✅ [P0] returns schedulable slots for eligible donor intake and capacity pass @P0
  - Status: RED (skipped by design)
- ✅ [P0] returns explicit refusal with structured alternatives when capacity fails @P0
  - Status: RED (skipped by design)
- ✅ [P0] creates and returns request-to-commitment linkage for accepted intake outcomes @P0
  - Status: RED (skipped by design)
- ✅ [P1] includes actionable next steps in both schedulable and refusal outcomes @P1
  - Status: RED (skipped by design)
- ✅ [P1] keeps envelope keys stable for donor intake success and refusal outcomes @P1
  - Status: RED (skipped by design)

### E2E Tests (2)
**File:** `tests/e2e/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.spec.ts`
- ✅ [P1] donor sees schedulable slots and clear next-step guidance after intake submit @P1
  - Status: RED (skipped by design)
- ✅ [P1] donor sees explicit refusal reason code and alternatives when no capacity is available @P1
  - Status: RED (skipped by design)

## Data Factories Created
- `tests/support/factories/routeShyftStory22Factory.ts`

## Fixtures Created
- `tests/support/fixtures/routeShyftStory22.fixture.ts`

## Required data-testid Attributes
- `routeshyft-donor-intake-submit`
- `routeshyft-donor-intake-slot-list`
- `routeshyft-donor-intake-refusal-banner`
- `routeshyft-donor-intake-refusal-code`
- `routeshyft-donor-intake-next-steps`
- `routeshyft-donor-intake-alternatives`

## Implementation Checklist
- [ ] Implement API behavior to satisfy all Story 2-2 ATDD API assertions.
- [ ] Implement UI behavior and test IDs to satisfy all Story 2-2 ATDD E2E assertions.
- [ ] Remove `test.skip` markers from Story 2-2 specs.
- [ ] Run Story 2-2 specs and reach GREEN phase.

## Running Tests
```bash
npx playwright test tests/api/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.api.spec.ts
npx playwright test tests/e2e/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.spec.ts
```

## Risks / Assumptions
- Capacity evaluation and intake outcome engine are not implemented yet; expected RED until route intake services are delivered.

## Output Files
- `tests/api/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.api.spec.ts`
- `tests/e2e/platform/2-2-donor-self-service-pickup-intake-with-capacity-check.atdd.spec.ts`
- `tests/support/factories/routeShyftStory22Factory.ts`
- `tests/support/fixtures/routeShyftStory22.fixture.ts`
- `_bmad-output/test-artifacts/atdd-checklist-2-2.md`
