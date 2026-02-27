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

# ATDD Checklist - Epic c, Story 4: Claim, Takeover, and Close Lifecycle Actions

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `c.4` enforces lifecycle transition governance (`claim`, `takeover`, `close`) with auditable side effects and locked reopen semantics for outbound user actions on closed threads.

## Acceptance Criteria

1. Valid canonical transitions only, with policy-enforced ownership checks.
2. Audit/outbox metadata includes actor, orgUnit, prior/new state.
3. Outbound call/message on `CLOSED` reopens same thread as `UNCLAIMED`.
4. Inbound events do not auto-reopen closed threads.

## Workflow Step Outputs

- Step 1 preflight completed with policy/workflow gates and story context loaded.
- Step 2 selected **AI generation** mode.
- Step 3 strategy selected API transition matrix coverage + E2E state feedback checks.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-c-4-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-c-4-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-c-4-2026-02-24T19-46-00Z.json`
- Step 5 validation completed: tests are RED-phase (`test.skip`), no placeholder assertions, temp artifacts stored under `test-artifacts`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts` (5 tests)
- E2E: `tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.spec.ts` (3 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryC4Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryC4.fixture.ts`

## Implementation Checklist

- [ ] Implement lifecycle transition matrix and authorization guardrails.
- [ ] Implement transactional audit/outbox side effects on successful transitions.
- [ ] Implement closed-thread outbound reopen and inbound no-auto-reopen behavior.
- [ ] Remove `test.skip` and make API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.spec.ts --list
```
