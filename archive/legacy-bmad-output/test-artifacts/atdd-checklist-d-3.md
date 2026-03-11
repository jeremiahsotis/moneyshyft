---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-27T14:36:00Z'
---

# ATDD Checklist - Epic d, Story 3: Outbound Audit, Outbox, and Refusal Envelope Integration

**Date:** 2026-02-27
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `d.3` standardizes atomic audit/outbox persistence and refusal envelope semantics across outbound and governance actions. It also requires explicit reopen lineage metadata when lifecycle transitions occur.

## Acceptance Criteria

1. Successful outbound/governance actions atomically persist domain mutation + audit + outbox metadata.
2. Refused actions return shared refusal envelopes with policy reasons and no partial writes.
3. Reopen-on-outbound preserves prior/new state lineage and `thread_reopened_by_user` metadata.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/d-3-outbound-audit-outbox-and-refusal-envelope-integration.md`.
- Mandatory gates passed:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/d-3-outbound-audit-outbox-and-refusal-envelope-integration.md`
- Branch guard passed on `codex/story-d-3-connectshyft-outbound-audit-outbox-and-refusal-envelope-integration`.

### Step 2: Generation Mode

- Selected mode: **AI generation**.

### Step 3: Test Strategy

- **Primary level: API** for atomic persistence and refusal envelope invariants.
- **Secondary level: E2E** for operator-facing evidence/refusal mapping cues.
- Priority mapping:
  - **P0 API:** atomic audit/outbox success contracts, deterministic refusal/no-side-effects.
  - **P0 API:** reopen lineage metadata propagation.
  - **P1 API/E2E:** governance close success/refusal parity and UX accessibility.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (`test.skip(...)`):
  - `tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.api.spec.ts`
  - `tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryD3Factory.ts`
  - `tests/support/fixtures/connectShyftStoryD3.fixture.ts`
- Subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-d-3-2026-02-27T14-36-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-d-3-2026-02-27T14-36-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-d-3-2026-02-27T14-36-00Z.json`

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.api.spec.ts tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts --list`

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.api.spec.ts` (5 tests)
- E2E: `tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryD3Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryD3.fixture.ts`

## Required data-testid Attributes

- `connectshyft-audit-event-chip`
- `connectshyft-outbox-event-chip`
- `connectshyft-policy-refusal-banner`
- `connectshyft-policy-refusal-code`
- `connectshyft-lifecycle-lineage-chip`
- `connectshyft-thread-reopened-toast`

## Implementation Checklist

- [ ] Enforce atomic persistence of domain mutation + audit + outbox for outbound/governance success.
- [ ] Enforce deterministic shared refusal envelopes for policy rejection with no partial writes.
- [ ] Propagate reopen lineage metadata (`prior_state`, `new_state`, `thread_reopened_by_user`) consistently.
- [ ] Align UI evidence surfaces with envelope/audit/outbox outcomes.
- [ ] Remove `test.skip(...)` from d-3 ATDD specs and make tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.api.spec.ts tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts --list
```

## Knowledge Base References Applied

- `data-factories.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `playwright-cli.md`
- `test-levels-framework.md`
- `test-priorities-matrix.md`
