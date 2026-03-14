---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T18:42:51.558Z'
---

# ATDD Checklist - Epic 2, Story 3: Cashier-Assisted Intake and Voucher Delivery Scheduling

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

As a cashier staff, I want to create donor requests by phone and schedule voucher deliveries at checkout, so that low-tech users and recipients get consistent in-system outcomes.

## Acceptance Criteria
1. Given staff enters intake/scheduling details, when they submit, then the same validation, capacity, and refusal rules as public intake apply.
2. Resulting requests link to commitments or refusal outcomes.
3. Given cashier staff submit or correct intake details, when validation/refusal occurs, then operator-facing feedback is immediate, actionable, and parity-aligned with donor flow.

## Generation Mode
- Selected mode: AI generation (clear ACs and strong in-repo ATDD conventions).

## Failing Tests Created (RED Phase)

### API Tests (5)
**File:** `tests/api/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.api.spec.ts`
- ✅ [P0] applies donor-equivalent validation and capacity rules to cashier-assisted intake @P0
  - Status: RED (skipped by design)
- ✅ [P0] returns deterministic refusal outcomes with structured alternatives for cashier flow @P0
  - Status: RED (skipped by design)
- ✅ [P0] creates request-to-commitment linkage for accepted cashier-assisted outcomes @P0
  - Status: RED (skipped by design)
- ✅ [P1] preserves donor/cashier parity contract fields for equivalent intake inputs @P1
  - Status: RED (skipped by design)
- ✅ [P1] keeps envelope keys stable for cashier intake success and refusal outcomes @P1
  - Status: RED (skipped by design)

### E2E Tests (2)
**File:** `tests/e2e/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.spec.ts`
- ✅ [P1] cashier sees immediate actionable feedback and accepted outcome details after submit @P1
  - Status: RED (skipped by design)
- ✅ [P1] cashier sees parity-aligned refusal reasons and alternatives for invalid or constrained submissions @P1
  - Status: RED (skipped by design)

## Data Factories Created
- `tests/support/factories/routeShyftStory23Factory.ts`

## Fixtures Created
- `tests/support/fixtures/routeShyftStory23.fixture.ts`

## Required data-testid Attributes
- `routeshyft-cashier-intake-submit`
- `routeshyft-cashier-intake-outcome`
- `routeshyft-cashier-intake-refusal-banner`
- `routeshyft-cashier-intake-refusal-code`
- `routeshyft-cashier-intake-next-steps`
- `routeshyft-cashier-intake-alternatives`

## Implementation Checklist
- [ ] Implement API behavior to satisfy all Story 2-3 ATDD API assertions.
- [ ] Implement UI behavior and test IDs to satisfy all Story 2-3 ATDD E2E assertions.
- [ ] Remove `test.skip` markers from Story 2-3 specs.
- [ ] Run Story 2-3 specs and reach GREEN phase.

## Running Tests
```bash
npx playwright test tests/api/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.api.spec.ts
npx playwright test tests/e2e/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.spec.ts
```

## Risks / Assumptions
- Channel parity behaviors and shared rule-engine adapter paths are not implemented yet; RED remains expected.

## Output Files
- `tests/api/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.api.spec.ts`
- `tests/e2e/platform/2-3-cashier-assisted-intake-and-voucher-delivery-scheduling.atdd.spec.ts`
- `tests/support/factories/routeShyftStory23Factory.ts`
- `tests/support/fixtures/routeShyftStory23.fixture.ts`
- `_bmad-output/test-artifacts/atdd-checklist-2-3.md`
