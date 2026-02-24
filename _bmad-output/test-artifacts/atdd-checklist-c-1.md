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

# ATDD Checklist - Epic c, Story 1: Core ConnectShyft Thread Schema and Lifecycle Constraints

**Date:** 2026-02-24
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `c.1` defines the persistence foundation for ConnectShyft threads: canonical states, required metadata, and index/constraint behavior that enforces one active thread per identity tuple and deterministic scheduler scans.

## Acceptance Criteria

1. Canonical thread state contract (`UNCLAIMED | CLAIMED | CLOSED`) with required metadata fields is enforced at persistence boundaries.
2. Partial unique and scheduler indexes enforce one active thread per `(tenant_id, org_unit_id, neighbor_id)` and deterministic due-thread scans.

## Workflow Step Outputs

- Step 1 preflight completed with policy/workflow gates and story context loaded.
- Step 2 selected **AI generation** mode.
- Step 3 strategy selected API-first coverage + targeted E2E operator contract checks.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-c-1-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-c-1-2026-02-24T19-46-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-c-1-2026-02-24T19-46-00Z.json`
- Step 5 validation completed: tests are RED-phase (`test.skip`), no placeholder assertions, temp artifacts stored under `test-artifacts`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.atdd.spec.ts` (2 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryC1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryC1.fixture.ts`

## Implementation Checklist

- [ ] Implement canonical lifecycle schema + enum constraints and metadata columns.
- [ ] Implement partial unique active-thread constraint for tuple identity.
- [ ] Implement due-thread scan endpoint/query using deterministic ordering.
- [ ] Remove `test.skip` and make API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.atdd.api.spec.ts tests/e2e/platform/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.atdd.spec.ts --list
```
