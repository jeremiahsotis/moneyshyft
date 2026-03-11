---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T19:46:00Z'
---

# ATDD Checklist - Epic c, Story 5: Deterministic Escalation Scheduler with Claim-Only Reset

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `c.5` hardens escalation progression to deterministic persisted timing (`X -> 2X -> 3X`) and requires claim as the exclusive reset path for escalation state and pending notifications.

## Acceptance Criteria

1. Scheduler progression uses persisted due timestamps and deterministic timing sequence.
2. Explicit claim resets escalation state and cancels pending escalation notifications.

## Workflow Step Outputs

- Step 1 preflight completed with policy/workflow gates and story context loaded.
- Step 2 selected **AI generation** mode.
- Step 3 strategy selected API scheduler/claim semantics + E2E operator timeline checks.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-c-5-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-c-5-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-c-5-2026-02-24T19-46-00Z.json`
- Step 5 validation completed: tests are RED-phase (`test.skip`), no placeholder assertions, temp artifacts stored under `test-artifacts`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.spec.ts` (3 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryC5Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryC5.fixture.ts`

## Implementation Checklist

- [ ] Implement deterministic scheduler progression using persisted due timestamps.
- [ ] Implement claim-only reset semantics and pending notification suppression.
- [ ] Enforce baseline-hour validation constraints (integer `1..24`).
- [ ] Remove `test.skip` and make API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.spec.ts --list
```
