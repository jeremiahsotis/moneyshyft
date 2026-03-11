---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-27T14:30:00Z'
---

# ATDD Checklist - Epic d, Story 2: Preference Override Enforcement for Outbound SMS

**Date:** 2026-02-27
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story `d.2` enforces outbound SMS policy safety when `prefers_texting=NO`. Outbound SMS must require explicit override reasoning, refuse deterministic invalid/missing overrides with no side effects, and preserve closed-thread reopen semantics before policy checks.

## Acceptance Criteria

1. Outbound SMS on `prefers_texting=NO` requires override reason; valid overrides persist auditable metadata.
2. Missing/invalid override reasons return refusal envelopes with no partial send/audit/state side effects.
3. Outbound SMS from `CLOSED` reopens same thread before dispatch while preserving override enforcement.

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story loaded: `_bmad-output/implementation-artifacts/d-2-preference-override-enforcement-for-outbound-sms.md`.
- Mandatory gates passed:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/d-2-preference-override-enforcement-for-outbound-sms.md`
- Branch guard passed on `codex/story-d-2-connectshyft-preference-override-enforcement-for-outbound-sms`.
- Framework context loaded from `playwright.config.ts`.
- Required knowledge fragments loaded per TEA index.

### Step 2: Generation Mode

- Selected mode: **AI generation**.
- Rationale: story scope is contract/policy deterministic and does not require live selector recording for RED phase.

### Step 3: Test Strategy

- **Primary level: API** for refusal contracts, no-side-effect guarantees, and reopen sequencing.
- **Secondary level: E2E** for explicit operator override UX/accessibility pathways.
- Priority mapping:
  - **P0 API:** override-required refusal, valid override persistence, invalid override refusal/no side effects.
  - **P1 API:** closed-thread reopen-before-override-check semantics.
  - **P0/P1 E2E:** explicit override-required UX, deterministic refusal/success feedback, reopened-thread continuity.

### Step 4: Parallel Generation + Aggregation

- Generated RED-phase files (`test.skip(...)`):
  - `tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.api.spec.ts`
  - `tests/e2e/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.spec.ts`
  - `tests/support/factories/connectShyftStoryD2Factory.ts`
  - `tests/support/fixtures/connectShyftStoryD2.fixture.ts`
- Subprocess artifacts written:
  - `_bmad-output/test-artifacts/atdd-temp/api-d-2-2026-02-27T14-30-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-d-2-2026-02-27T14-30-00Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-d-2-2026-02-27T14-30-00Z.json`
- TDD RED checks:
  - all tests include `test.skip(...)`
  - no placeholder assertions

### Step 5: Validate & Complete

- Validation command:
  - `npx playwright test tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.api.spec.ts tests/e2e/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.spec.ts --list`

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.api.spec.ts` (5 tests)
- E2E: `tests/e2e/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryD2Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryD2.fixture.ts`

## Required data-testid Attributes

- `connectshyft-preference-override-required-chip`
- `connectshyft-preference-override-modal`
- `connectshyft-preference-override-reason-select`
- `connectshyft-preference-override-note-input`
- `connectshyft-preference-override-submit`
- `connectshyft-preference-override-error`
- `connectshyft-policy-refusal-banner`
- `connectshyft-policy-success-banner`
- `connectshyft-preference-override-audit-chip`
- `connectshyft-thread-reopened-toast`

## Implementation Checklist

- [ ] Enforce server-side override requirement for outbound SMS when `prefers_texting=NO`.
- [ ] Return deterministic refusal envelope for missing/invalid override with no partial side effects.
- [ ] Persist override reason metadata to audit/outbox for successful exceptions.
- [ ] Preserve `CLOSED -> UNCLAIMED` reopen-on-outbound before policy checks.
- [ ] Align operator-facing refusal/success copy with accessibility semantics.
- [ ] Remove `test.skip(...)` from d-2 ATDD specs and make tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.api.spec.ts tests/e2e/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.spec.ts --list
```

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `playwright-cli.md`
- `test-levels-framework.md`
- `test-priorities-matrix.md`
