---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-27T14:42:00Z'
---

# ATDD Checklist - Epic d, Story 4: Operator Interaction Contracts for Outbound Safety

**Date:** 2026-02-27
**Author:** Jeremiah
**Primary Test Level:** E2E

## Story Summary

Story `d.4` makes outbound policy controls explicit, accessible, and deterministic across desktop/tablet/mobile workflows. It locks the state-action matrix, closed-thread reopen visibility, and prefers-texting override UX contracts.

## Acceptance Criteria

1. Policy guardrails/refusal/confirmation UX is explicit and keyboard/screen-reader accessible across breakpoints.
2. State-action matrix is deterministic by canonical thread state (`UNCLAIMED`, `CLAIMED`, `CLOSED`).
3. Outbound on `CLOSED` displays explicit same-thread reopen transition.
4. `prefers_texting=NO` override-required refusal/success flows stay explicit and accessible.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/d-4-operator-interaction-contracts-for-outbound-safety.md`.
- Mandatory gates passed:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/d-4-operator-interaction-contracts-for-outbound-safety.md`
- Branch guard passed on `codex/story-d-4-connectshyft-operator-interaction-contracts-for-outbound-safety`.

### Step 2: Generation Mode

- Selected mode: **AI generation**.

### Step 3: Test Strategy

- **Primary level: E2E** for breakpoint-specific interaction contracts/accessibility behavior.
- **Secondary level: API** for deterministic envelope/action-matrix contract assertions.
- Priority mapping:
  - **P0 E2E:** state-action matrix by breakpoint, accessible refusal/confirmation affordances, explicit reopen transition.
  - **P0/P1 API:** action matrix contract shape, explicit reopen metadata, envelope-to-UI mapping keys.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (`test.skip(...)`):
  - `tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts`
  - `tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryD4Factory.ts`
  - `tests/support/fixtures/connectShyftStoryD4.fixture.ts`
- Subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-d-4-2026-02-27T14-42-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-d-4-2026-02-27T14-42-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-d-4-2026-02-27T14-42-00Z.json`

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts --list`

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryD4Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryD4.fixture.ts`

## Required data-testid Attributes

- `connectshyft-thread-state-chip`
- `connectshyft-hidden-transition-warning`
- `connectshyft-thread-reopened-toast`
- `connectshyft-preference-override-modal`
- `connectshyft-preference-override-reason-select`
- `connectshyft-preference-override-submit`
- `connectshyft-policy-refusal-banner`
- `connectshyft-policy-success-banner`

## Implementation Checklist

- [ ] Render canonical state-action matrix across desktop/tablet/mobile with no hidden paths.
- [ ] Keep refusal/success/policy copy keyboard/screen-reader accessible.
- [ ] Make closed-thread outbound reopen transition explicit in UI and contract payloads.
- [ ] Keep `prefers_texting=NO` override-required flow explicit with actionable refusal guidance.
- [ ] Remove `test.skip(...)` from d-4 ATDD specs and make tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts --list
```

## Knowledge Base References Applied

- `component-tdd.md`
- `test-quality.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `playwright-cli.md`
- `test-levels-framework.md`
- `test-priorities-matrix.md`
