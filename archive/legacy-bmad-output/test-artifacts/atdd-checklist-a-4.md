---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-22T18-54-35Z'
---

# ATDD Checklist - Epic a, Story 4: Escalation Baseline and Recipient Configuration

**Date:** 2026-02-22  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E contract coverage)

---

## Story Summary

Story `a.4` introduces orgUnit-scoped escalation configuration for ConnectShyft. The implementation must persist an integer-hour baseline (`X`, default 24, allowed 1-24) and required recipient assignments while refusing invalid timing/recipient payloads with deterministic refusal semantics.

**As a** orgUnit administrator  
**I want** to configure escalation baseline `X` in integer hours and recipient targets  
**So that** unclaimed threads escalate to the correct recipients at defined intervals

---

## Acceptance Criteria

1. Given an orgUnit admin updates escalation settings, when baseline and recipients are submitted, then configuration is persisted with required-recipient validation and valid integer-hour timings (`X` default 24, allowed 1-24).
2. Given invalid escalation recipient assignments or invalid timing values, when validation executes, then deterministic refusal messaging is returned and invalid settings are not persisted.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/a-4-escalation-baseline-and-recipient-configuration.md`
- Policy gate passed on lane `connectshyft`.
- Workflow guard passed for ATDD story scope.
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root).
- Existing ConnectShyft ATDD patterns reviewed (`a-2`, `a-3` API/E2E slices and factory/fixture structure).

### Step 2: Generation Mode

- Selected mode: **AI Generation**.
- Rationale: Acceptance criteria are explicit and contract-focused; UI/endpoint contracts are clear enough to generate deterministic RED-phase coverage without live recording.

### Step 3: Test Strategy

- **P0 API:** success persistence path, default baseline behavior, integer/range validation, required-recipient validation.
- **P1 API:** cross-tenant/invalid recipient assignment refusal.
- **P0 E2E:** admin save flow, invalid baseline UX refusal.
- **P1 E2E:** required primary recipient UX refusal.
- Primary level chosen as API to enforce business/contract determinism; E2E validates operator-facing form behavior and refusal presentation.

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T18-54-35Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T18-54-35Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T18-54-35Z.json`
- TDD RED compliance check passed:
  - All generated tests contain `test.skip(...)`
  - No placeholder assertions detected

### Step 5: Validation

- Test discovery check passed via:
  - `npx playwright test tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts --list`
- Discovery result: **9 tests in 2 files**.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts` (239 lines)

- ✅ **Test:** `[P0] persists valid escalation baseline and recipient targets for orgUnit-scoped configuration`
  - **Status:** RED (skipped intentionally) - endpoint not implemented
  - **Verifies:** successful save contract and persisted payload envelope
- ✅ **Test:** `[P0] applies default baseline of 24 hours when baseline is omitted and recipients are valid`
  - **Status:** RED (skipped intentionally) - defaulting logic not implemented
  - **Verifies:** default baseline behavior
- ✅ **Test:** `[P0] refuses baseline values outside 1-24 hours and keeps prior configuration unchanged`
  - **Status:** RED (skipped intentionally) - validation/refusal path not implemented
  - **Verifies:** deterministic range refusal semantics
- ✅ **Test:** `[P0] refuses non-integer baseline values and returns deterministic field-level refusal details`
  - **Status:** RED (skipped intentionally) - integer guard not implemented
  - **Verifies:** non-integer refusal semantics
- ✅ **Test:** `[P0] blocks save when required primary recipient assignment is missing`
  - **Status:** RED (skipped intentionally) - required recipient validation not implemented
  - **Verifies:** required recipient refusal semantics
- ✅ **Test:** `[P1] refuses cross-tenant recipient assignments with deterministic refusal semantics`
  - **Status:** RED (skipped intentionally) - recipient scope guard not implemented
  - **Verifies:** recipient boundary enforcement

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts` (86 lines)

- ✅ **Test:** `[P0] orgUnit admin saves valid escalation baseline and recipients from settings screen`
  - **Status:** RED (skipped intentionally) - escalation settings UI not implemented
  - **Verifies:** primary save path and success feedback contract
- ✅ **Test:** `[P0] invalid baseline values are blocked with deterministic validation feedback and no save confirmation`
  - **Status:** RED (skipped intentionally) - inline validation not implemented
  - **Verifies:** invalid timing UX refusal behavior
- ✅ **Test:** `[P1] missing required primary recipient shows deterministic refusal state and blocks persistence`
  - **Status:** RED (skipped intentionally) - recipient requirement UX not implemented
  - **Verifies:** required recipient UX refusal behavior

### Component Tests (0 tests)

No component-level ATDD slice generated in this pass; risk coverage concentrated in API + E2E contracts.

---

## Data Factories Created

### Story A4 Factory

**File:** `tests/support/factories/connectShyftStoryA4Factory.ts`

**Exports:**

- `createStoryA4Context(overrides?)`
- `createStoryA4Headers(context, overrides?)`

### Story A4 Data Constants

**File:** `tests/fixtures/test-data.ts`

**Export Added:**

- `connectShyftEscalationConfigData`

---

## Fixtures Created

### Story A4 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryA4.fixture.ts`

**Fixtures:**

- `storyA4Context`
- `storyA4AdminHeaders`
- `storyA4TenantStaffHeaders`
- `storyA4ValidConfigPayload`
- `storyA4InvalidRangePayload`

---

## Mock Requirements

### Recipient Directory and Scope Resolver Mock

**Endpoint:** `GET /api/v1/connectshyft/escalation/recipients`

**Success Response:**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_ESCALATION_RECIPIENTS_RESOLVED",
  "data": {
    "orgUnitId": "org-connectshyft-alpha-east",
    "recipients": [
      {
        "userId": "user-connectshyft-a4-primary-recipient",
        "scope": "ORGUNIT"
      }
    ]
  }
}
```

**Failure Response:**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT",
  "refusalType": "business",
  "data": {
    "fieldErrors": [
      {
        "field": "recipients.primaryOrgUnitAdminUserId",
        "reason": "RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE"
      }
    ]
  }
}
```

**Notes:** UI select options should be sourced from orgUnit/tenant-scoped recipients only.

---

## Required data-testid Attributes

### Escalation Settings Screen

- `connectshyft-escalation-baseline-input` - baseline integer-hours input
- `connectshyft-escalation-recipient-primary` - primary recipient selector
- `connectshyft-escalation-recipient-secondary` - secondary recipient selector
- `connectshyft-escalation-recipient-tenant-staff` - tenant-staff recipient selector
- `connectshyft-escalation-validation-error` - timing validation refusal banner
- `connectshyft-escalation-recipient-error-primary` - required primary-recipient error text
- `connectshyft-escalation-save-success` - successful save confirmation
- `connectshyft-escalation-baseline-display` - persisted baseline display text

---

## Implementation Checklist

### API Contract Tasks

- [ ] Add escalation config route handlers for ConnectShyft (`GET/PUT /api/v1/connectshyft/escalation/config` assumed).
- [ ] Persist orgUnit-scoped escalation baseline and recipient targets.
- [ ] Enforce integer-only baseline validation.
- [ ] Enforce baseline bounds `1..24` with default `24` when omitted.
- [ ] Enforce required primary recipient assignment.
- [ ] Enforce recipient tenant/orgUnit scope validity.
- [ ] Return deterministic refusal envelopes:
  - `CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE`
  - `CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER`
  - `CONNECTSHYFT_ESCALATION_RECIPIENT_REQUIRED`
  - `CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT`
- [ ] Return deterministic success envelope:
  - `CONNECTSHYFT_ESCALATION_CONFIG_SAVED`

### UI Tasks

- [ ] Add route: `/app/connectshyft/settings/escalation`.
- [ ] Build escalation settings form with baseline + recipient controls.
- [ ] Add inline timing validation and recipient-required validation states.
- [ ] Wire success and refusal rendering with deterministic `data-testid`s.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from API ATDD file:
  - `tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts`
- [ ] Remove `test.skip()` from E2E ATDD file:
  - `tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts`
- [ ] Run full story ATDD slice and ensure tests pass.

**Estimated Effort:** 8-12 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts --list

# Run all failing tests for this story (after removing test.skip)
npm run test:e2e -- tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts

# Run specific API ATDD file
npm run test:e2e -- tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts

# Run specific E2E ATDD file
npm run test:e2e -- tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E acceptance tests generated.
- ✅ Tests intentionally marked with `test.skip()` to document red-phase intent.
- ✅ Data factory and fixtures scaffolded.
- ✅ Checklist and implementation handoff generated.

### GREEN Phase (DEV Team)

1. Implement backend escalation config contract.
2. Implement escalation settings UI route/form.
3. Remove `test.skip()` and make tests pass.
4. Keep acceptance behavior deterministic (success/refusal envelopes).

### REFACTOR Phase (DEV Team)

1. Deduplicate validation logic and constants.
2. Extract shared recipient-validation helpers.
3. Verify no behavior regressions.

---

## Knowledge Base References Applied

Core fragments loaded:

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`

Playwright utils fragments loaded:

- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`

Browser automation fragment loaded:

- `playwright-cli.md`

---

## Test Execution Evidence

### Discovery Verification

**Command:**

```bash
npx playwright test tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.api.spec.ts tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.atdd.spec.ts --list
```

**Result:**

- Total tests discovered: 9
- API tests: 6
- E2E tests: 3
- Status: ✅ discovery complete, RED slice generated

### RED Compliance Verification

- All generated tests include `test.skip()`.
- No placeholder assertions (`expect(true).toBe(true)`) present.

---

## Assumptions and Risks

- **Assumed endpoint contract path:** `/api/v1/connectshyft/escalation/config` (to be confirmed during implementation).
- **Assumed UI route path:** `/app/connectshyft/settings/escalation`.
- If backend/frontend route names differ, update ATDD test paths before green-phase activation.

---

## Next Steps

1. Implement API persistence and refusal envelopes for escalation config.
2. Build escalation settings UI with required `data-testid` hooks.
3. Remove `test.skip()` and execute story slice to reach green phase.
4. Promote story to review only after ATDD slice passes with real assertions.

---

**Generated by BMad TEA Agent** - 2026-02-22T18-54-35Z
