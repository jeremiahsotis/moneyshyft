---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-18T13:33:38Z'
---

# ATDD Checklist - Epic 0, Story 10: Kernel Readiness Verification Suite

**Date:** 2026-02-18  
**Author:** Jeremiah  
**Primary Test Level:** API

---

## Story Summary

This story introduces an explicit kernel readiness verification suite so Phase-1 Route stories can execute only after Phase-0 controls are proven and readiness is recorded.

**As a** release manager  
**I want** explicit kernel hardening checks  
**So that** Phase 1 Route work starts only when kernel controls are proven

---

## Acceptance Criteria

1. tenancy/auth/csrf/envelope/event-outbox/timezone gates all pass
2. readiness status is recorded as Phase-0 complete before Route story execution

---

## Step 1 - Preflight and Context

- Story loaded: `_bmad-output/implementation-artifacts/0-10-kernel-readiness-verification-suite.md`
- Framework config confirmed: `playwright.config.ts`
- Existing patterns loaded from:
  - `tests/api/platform/*.api.spec.ts`
  - `tests/e2e/platform/*.spec.ts`
  - `tests/support/factories/`
  - `tests/support/fixtures/`
- TEA config flags:
  - `tea_use_playwright_utils=true`
  - `tea_browser_automation=auto`
- Mandatory gates executed and passed:
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/0-10-kernel-readiness-verification-suite.md`

Knowledge fragments loaded:
- Core: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`
- Playwright Utils: `overview`, `api-request`, `network-recorder`, `auth-session`, `intercept-network-call`, `recurse`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`
- Browser automation: `playwright-cli`

---

## Step 2 - Generation Mode

Selected mode: **AI generation**

Reason:
- Acceptance criteria are explicit and contract-driven.
- Required artifacts are API/script-centric and do not require live browser recording to derive selectors.
- `tea_browser_automation=auto` remains available for follow-up validation, but not needed for RED scaffolding.

---

## Step 3 - Test Strategy

### Acceptance Criteria Mapping

- **AC1** (all required kernel gates pass)
  - Scenario A1 (P0, API): aggregated readiness verification contract returns pass for all mandatory gates.
  - Scenario A2 (P0, API): readiness verification returns refusal contract with failing gate list.
  - Scenario A3 (P0, E2E/script): Epic-0 quality gate emits explicit readiness matrix artifact.

- **AC2** (Phase-0 completion recorded before Route execution)
  - Scenario B1 (P1, API): readiness recording endpoint persists Phase-0 complete status and route-execution eligibility.
  - Scenario B2 (P0, E2E/script): branch workflow guard blocks Route story execution until readiness is complete.
  - Scenario B3 (P1, E2E/script): branch workflow guard allows Route story execution only after readiness record exists.

### Test Level Decisions

- **API (primary):** readiness verification + readiness recording contracts.
- **E2E/script (secondary):** execution-path orchestration (quality gate artifact + branch workflow guard behavior).
- **Component:** not applicable for this story.

### TDD Red-Phase Rule

All generated tests are intentionally marked `test.skip()` and assert target behavior expected after implementation.

---

## Failing Tests Created (RED Phase)

### API Tests (3 tests)

**File:** `tests/api/platform/kernel-readiness-verification-suite.api.spec.ts` (118 lines)

- ✅ **Test:** `[P0] verifies tenancy/auth/csrf/envelope/event-outbox/timezone gates in a single readiness contract @P0`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** single readiness verification contract for all required kernel controls
- ✅ **Test:** `[P0] returns refusal contract with failing gate list when readiness verification does not pass @P0`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** refusal response structure and failing-gate evidence
- ✅ **Test:** `[P1] records Phase-0 completion status and route-execution eligibility after successful readiness verification @P1`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** readiness record persistence contract and route-execution eligibility metadata

### E2E/Workflow Tests (3 tests)

**File:** `tests/e2e/platform/kernel-readiness-verification-suite.spec.ts` (125 lines)

- ✅ **Test:** `[P0] quality gate script emits explicit Phase-0 readiness matrix for all mandatory kernel controls @P0`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** readiness matrix is explicitly published in gate artifact output
- ✅ **Test:** `[P0] route-story workflow guard blocks execution when Phase-0 readiness is not yet recorded @P0`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** route-story execution remains blocked until readiness completion
- ✅ **Test:** `[P1] route-story workflow guard allows execution after Phase-0 readiness is recorded @P1`
  - **Status:** RED (skipped intentionally)
  - **Verifies:** route-story execution unblocks only after readiness record is present

---

## Data Factories Created

### Kernel Readiness Context Factory

**File:** `tests/support/factories/kernelReadinessContextFactory.ts`

**Exports:**
- `createKernelReadinessContext(overrides?)`
- `KernelReadinessContext`

Provides:
- required gate list
- route-story guard inputs
- quality gate script/report paths
- deterministic kernel headers for contract probes

---

## Fixtures Created

### Kernel Readiness Context Fixture

**File:** `tests/support/fixtures/kernelReadinessContext.fixture.ts`

Fixture:
- `kernelReadinessContext`

Setup:
- creates in-memory readiness context from factory

Cleanup:
- none required (pure data fixture)

---

## Implementation Checklist

### Test: aggregated readiness verification contract

**File:** `tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`

- [ ] Add `POST /api/v1/platform/_kernel/readiness/verify` contract endpoint
- [ ] Implement aggregated gate result model: tenancy/auth/csrf/envelope/eventOutbox/timezone
- [ ] Include evidence metadata (`reportPath`, `checkedAt`, `allPassed`)
- [ ] Run: `npx playwright test tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`
- [ ] ✅ Test passes (green)

### Test: failing gate refusal behavior

**File:** `tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`

- [ ] Implement refusal branch with `KERNEL_READINESS_GATE_FAILURE`
- [ ] Return deterministic `failingGates` list and `routeExecutionAllowed=false`
- [ ] Run: `npx playwright test tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`
- [ ] ✅ Test passes (green)

### Test: readiness status recording + route eligibility

**File:** `tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`

- [ ] Add `POST /api/v1/platform/_kernel/readiness/record-phase0-complete`
- [ ] Persist status record and expose `phase0Status=complete`
- [ ] Attach route execution eligibility metadata
- [ ] Run: `npx playwright test tests/api/platform/kernel-readiness-verification-suite.api.spec.ts`
- [ ] ✅ Test passes (green)

### Test: quality gate readiness matrix artifact

**File:** `tests/e2e/platform/kernel-readiness-verification-suite.spec.ts`

- [ ] Extend `scripts/quality-gates-epic0.sh` to emit explicit `phase0_readiness` gate matrix
- [ ] Include all required kernel gates and all-pass flag
- [ ] Run: `npx playwright test tests/e2e/platform/kernel-readiness-verification-suite.spec.ts`
- [ ] ✅ Test passes (green)

### Test: branch guard block/unblock behavior for Route stories

**File:** `tests/e2e/platform/kernel-readiness-verification-suite.spec.ts`

- [ ] Extend `scripts/branch-ensure-workflow.sh` with Phase-0 readiness prerequisite for Route-story execution
- [ ] Emit actionable block message when readiness is incomplete
- [ ] Emit explicit readiness confirmation when execution is allowed
- [ ] Run: `npx playwright test tests/e2e/platform/kernel-readiness-verification-suite.spec.ts`
- [ ] ✅ Test passes (green)

---

## Running Tests

```bash
# Run all Story 0.10 RED tests
npx playwright test tests/api/platform/kernel-readiness-verification-suite.api.spec.ts tests/e2e/platform/kernel-readiness-verification-suite.spec.ts

# Run API only
npx playwright test tests/api/platform/kernel-readiness-verification-suite.api.spec.ts

# Run E2E/workflow only
npx playwright test tests/e2e/platform/kernel-readiness-verification-suite.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Story 0.10 tests authored before implementation
- ✅ Readiness contract and route-execution gating expectations captured
- ✅ Tests intentionally skipped as RED scaffold (`test.skip()`)

### GREEN Phase (DEV Team - Next)

1. Implement readiness verification and readiness recording contracts.
2. Extend quality gate and workflow guard scripts for Phase-0 prerequisite enforcement.
3. Remove `test.skip()` from Story 0.10 tests.
4. Run to full green.

### REFACTOR Phase (After Green)

1. Consolidate readiness diagnostics formatting across scripts and API contracts.
2. Keep gate key naming consistent between API payloads and gate artifacts.
3. Re-run Epic-0 quality gate + workflow guard parity checks.

---

## Step 4 - Subprocess Artifacts (Parallel)

Generated temp artifacts:
- `/tmp/tea-atdd-api-tests-2026-02-18T13-31-56Z.json`
- `/tmp/tea-atdd-e2e-tests-2026-02-18T13-31-56Z.json`
- `/tmp/tea-atdd-summary-2026-02-18T13-31-56Z.json`

Persisted copies:
- `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-02-18T13-31-56Z.json`
- `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-02-18T13-31-56Z.json`
- `_bmad-output/test-artifacts/tea-atdd-summary-2026-02-18T13-31-56Z.json`

---

## Validation Notes (Step 5)

Checklist status:
- Prerequisites: pass
- Story + AC extraction: pass
- Test generation (API + E2E): pass
- Fixture/factory infrastructure: pass
- Artifact persistence: pass
- CLI session hygiene: pass (no CLI browser session opened)

Assumptions and risks:
- Readiness contract endpoints are not yet implemented.
- Branch guard readiness prerequisites are not yet implemented.
- Epic-0 quality gate artifact currently lacks explicit readiness gate matrix structure.

Recommended next workflow:
- `TA` (automate) after implementation starts, to expand coverage around regressions.
- `RV` (review tests) after green phase for quality scoring and selector/flake audits.

---

**Generated by BMad TEA Agent** - 2026-02-18
