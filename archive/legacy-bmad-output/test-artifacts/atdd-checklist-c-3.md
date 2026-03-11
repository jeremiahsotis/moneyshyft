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

# ATDD Checklist - Epic c, Story 3: Inbox and Thread Detail Read Contracts

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `c.3` defines deterministic inbox/detail read-model contracts: orgUnit scoping, priority sorting, urgency label mapping, voicemail placement in Mine, and state-specific action sets.

## Acceptance Criteria

1. OrgUnit-scoped inbox/detail data includes required number metadata.
2. Deterministic ordering with explicit `priority_rank` mapping and tie-break.
3. Urgency labels map to operator language.
4. Voicemail on claimed thread remains in Mine.
5. Action sets vary by lifecycle state (`UNCLAIMED`, `CLAIMED`, `CLOSED`).

## Workflow Step Outputs

- Step 1 preflight completed with policy/workflow gates and story context loaded.
- Step 2 selected **AI generation** mode.
- Step 3 strategy selected API contract verification + E2E operator-behavior checks.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-c-3-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-c-3-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-c-3-2026-02-24T19-46-00Z.json`
- Step 5 validation completed: tests are RED-phase (`test.skip`), no placeholder assertions, temp artifacts stored under `test-artifacts`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.api.spec.ts` (5 tests)
- E2E: `tests/e2e/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.spec.ts` (3 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryC3Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryC3.fixture.ts`

## Implementation Checklist

- [ ] Implement deterministic inbox ordering and rank mapping contract.
- [ ] Implement urgency label mapping contract and metadata payload requirements.
- [ ] Implement voicemail-in-Mine and action-set-by-state behavior.
- [ ] Remove `test.skip` and make API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.api.spec.ts tests/e2e/platform/c-3-inbox-and-thread-detail-read-contracts.atdd.spec.ts --list
```
