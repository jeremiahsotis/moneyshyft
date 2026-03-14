---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-22T20-20-56Z'
---

# ATDD Checklist - Epic a, Story 5: Capability-Based Route Access and Envelope Contract Compliance

**Date:** 2026-02-22  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E contract and operator-feedback coverage)

---

## Story Summary

Story `a.5` hardens ConnectShyft access and response contracts so route authorization is capability-driven and envelope behavior is deterministic across success, refusal, and system-error paths. The implementation must prevent unauthorized operations at endpoint and service boundaries while keeping client-facing contracts predictable.

**As a** tenant operations lead  
**I want** capability checks and response envelopes to be consistent across ConnectShyft APIs  
**So that** client behavior is predictable and unauthorized operations are safely refused

---

## Acceptance Criteria

1. Given users with different role capabilities call ConnectShyft APIs, when authorization executes, then permission checks are enforced server-side at endpoint and service boundaries.
2. Given any ConnectShyft API response path (success, refused, system error), when serialization executes, then all responses follow shared `success/refusal/systemError` envelope semantics.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md`
- Policy gate passed: `npm run policy:check`
- Workflow guard passed:
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md`
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root)
- Existing ConnectShyft patterns reviewed (`a-1` through `a-4` API/E2E + factory/fixture structure)
- Knowledge fragments loaded (headings and usage mapped):
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright Utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI Generation**
- Rationale: acceptance criteria are contract-driven and deterministic; required behavior can be encoded as RED-phase API and E2E slices without live recording.

### Step 3: Test Strategy

- **P0 API:** route capability enforcement, claim/takeover authorization, mutation boundary protection for numbers/escalation.
- **P1 API:** no-leak refusal envelopes, success/refusal/system-error top-level key parity.
- **P0 E2E:** operator-visible refusal messaging on numbers/escalation surfaces.
- **P1 E2E:** journey-level envelope contract parity checks using shared API helpers.
- Primary level chosen as API to validate authorization and serialization contracts at enforcement boundaries; E2E validates operator feedback behavior and journey-level contract assumptions.

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T20-20-56Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T20-20-56Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T20-20-56Z.json`
- TDD RED compliance check passed:
  - all generated tests include `test.skip(...)`
  - no placeholder assertions detected

### Step 5: Validation

- Test discovery validation executed via:
  - `npx playwright test tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts --list`
- Discovery result: **9 tests in 2 files**.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts` (346 lines)

- ✅ **Test:** `[P0] refuses inbox route access for roles without thread-view capability at endpoint boundary`
  - **Status:** RED (skipped intentionally) - inbox route capability guard not fully enforced yet
  - **Verifies:** deterministic refusal for role without thread-view capability
- ✅ **Test:** `[P0] enforces claim and takeover capability checks for tenant-viewer callers`
  - **Status:** RED (skipped intentionally) - claim/takeover capability guardrails not fully enforced yet
  - **Verifies:** claim/takeover permission boundaries and explicit refusal codes
- ✅ **Test:** `[P0] blocks unauthorized number-mapping mutation and preserves prior state at service boundary`
  - **Status:** RED (skipped intentionally) - endpoint/service boundary invariants require hardening
  - **Verifies:** denied updates do not mutate persisted mapping state
- ✅ **Test:** `[P0] blocks unauthorized escalation overwrite and preserves persisted baseline at service boundary`
  - **Status:** RED (skipped intentionally) - endpoint/service capability and boundary invariants require hardening
  - **Verifies:** denied overwrite does not mutate persisted escalation baseline
- ✅ **Test:** `[P1] capability refusals keep canonical envelope keys and exclude privileged payload data`
  - **Status:** RED (skipped intentionally) - refusal/no-leak envelope consistency requires enforcement
  - **Verifies:** canonical keys + no data leakage for forbidden operations
- ✅ **Test:** `[P1] keeps success refusal and system-error envelope contracts consistent across ConnectShyft APIs`
  - **Status:** RED (skipped intentionally) - ConnectShyft system-error contract path not implemented
  - **Verifies:** top-level key parity and system-error envelope semantics

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts` (148 lines)

- ✅ **Test:** `[P0] orgUnit-member number mapping writes are refused with deterministic operator feedback`
  - **Status:** RED (skipped intentionally) - UI refusal flow not contract-locked yet
  - **Verifies:** operator-visible deterministic refusal messaging for forbidden writes
- ✅ **Test:** `[P0] tenant-viewer escalation settings access shows refusal envelope guidance and no success state`
  - **Status:** RED (skipped intentionally) - UI capability refusal handling not contract-locked yet
  - **Verifies:** refusal guidance rendering and no false-positive success state
- ✅ **Test:** `[P1] journey contract preserves shared top-level envelope keys across success refusal and system-error responses`
  - **Status:** RED (skipped intentionally) - ConnectShyft system-error contract journey path not implemented
  - **Verifies:** journey-level envelope contract consistency

### Component Tests (0 tests)

No component-level ATDD slice generated in this pass; risk-weighted coverage is concentrated in API and E2E contracts.

---

## Data Factories Created

### Story A5 Factory

**File:** `tests/support/factories/connectShyftStoryA5Factory.ts`

**Exports:**

- `createStoryA5Context(overrides?)`
- `createStoryA5Headers(context, overrides?)`

### Story A5 Data Constants

**File:** `tests/fixtures/test-data.ts`

**Export Added:**

- `connectShyftCapabilityEnvelopeData`

---

## Fixtures Created

### Story A5 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryA5.fixture.ts`

**Fixtures:**

- `storyA5Context`
- `storyA5OrgUnitAdminHeaders`
- `storyA5OrgUnitMemberHeaders`
- `storyA5TenantViewerHeaders`
- `storyA5TenantStaffHeaders`
- `storyA5ValidNumberCreatePayload`
- `storyA5ValidEscalationPayload`

---

## Mock Requirements

### ConnectShyft Envelope Contract Probe (System Error)

**Endpoint:** `POST /api/v1/connectshyft/_contracts/envelope/response-matrix/system-error`

**Success Response (for probe contract):**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_SYSTEM_ERROR",
  "message": "ConnectShyft system error contract probe",
  "errorType": "system",
  "correlationId": "corr-story-a5-xxxx",
  "tenantId": "tenant-connectshyft-alpha"
}
```

**Failure Response (invalid probe payload):**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_CONTRACT_PROBE_INVALID",
  "message": "Invalid system error probe payload",
  "refusalType": "client",
  "correlationId": "corr-story-a5-xxxx",
  "tenantId": "tenant-connectshyft-alpha"
}
```

**Notes:** This probe route is only for envelope-contract verification and should not expose stack traces or internal implementation details.

---

## Required data-testid Attributes

### Number Mapping Screen

- `connectshyft-number-input` - number entry input
- `connectshyft-number-label-input` - mapping label input
- `connectshyft-number-validation-error` - refusal/validation banner
- `connectshyft-number-mapping-row` - rendered mapping rows

### Escalation Settings Screen

- `connectshyft-escalation-validation-error` - refusal/validation banner
- `connectshyft-escalation-save-success` - successful save confirmation

---

## Implementation Checklist

### Authorization and Capability Tasks

- [ ] Add endpoint capability guard for `GET /api/v1/connectshyft/inbox` (thread-view permission required).
- [ ] Add endpoint capability guard for `POST /api/v1/connectshyft/threads/:threadId/claim` (claim permission required).
- [ ] Add endpoint capability guard for `POST /api/v1/connectshyft/threads/:threadId/takeover` (takeover permission required).
- [ ] Standardize deterministic refusal codes/messages for capability denials:
  - [ ] `CONNECTSHYFT_INBOX_FORBIDDEN`
  - [ ] `CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN`
  - [ ] `CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN`
- [ ] Ensure forbidden mutations leave existing persisted state unchanged (numbers + escalation service boundaries).

### Envelope Contract Tasks

- [ ] Ensure all ConnectShyft success responses emit canonical envelope keys (`ok`, `code`, `message`, `correlationId`, `tenantId`).
- [ ] Ensure all refusal responses emit canonical refusal envelope keys and avoid payload leakage for denied operations.
- [ ] Add ConnectShyft system-error contract probe endpoint for deterministic envelope verification:
  - [ ] `POST /api/v1/connectshyft/_contracts/envelope/response-matrix/system-error`
- [ ] Ensure system-error payloads never leak stack traces or internal diagnostics to API clients.

### UI/Operator Feedback Tasks

- [ ] Surface deterministic refusal messages in number mapping UI when capability checks deny writes.
- [ ] Surface deterministic refusal messages in escalation settings UI on load/save when capability checks deny access.
- [ ] Ensure refusal states never display false-positive success indicators.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from API ATDD file:
  - `tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts`
- [ ] Remove `test.skip()` from E2E ATDD file:
  - `tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts`
- [ ] Run full story slice and verify pass.

**Estimated Effort:** 8-12 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts --list

# Run all failing tests for this story (after removing test.skip)
npm run test:e2e -- tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts

# Run specific API ATDD file
npm run test:e2e -- tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts

# Run specific E2E ATDD file
npm run test:e2e -- tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E acceptance tests generated.
- ✅ Tests intentionally marked with `test.skip()` to document RED-phase intent.
- ✅ Story-specific factory and fixture scaffolding created.
- ✅ Checklist and implementation handoff generated.

### GREEN Phase (DEV Team)

1. Implement capability guards on inbox/claim/takeover endpoints.
2. Lock refusal codes/messages and no-leak payload behavior.
3. Implement ConnectShyft system-error contract probe route.
4. Remove `test.skip()` and make all A5 tests pass.

### REFACTOR Phase (DEV Team)

1. Extract reusable capability guard helpers to reduce route-level duplication.
2. Centralize ConnectShyft refusal code constants.
3. Keep envelope assertions stable while simplifying implementation internals.

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
npx playwright test tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts --list
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

- **Assumed refusal codes:** `CONNECTSHYFT_INBOX_FORBIDDEN`, `CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN`, `CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN`.
- **Assumed contract probe route:** `/api/v1/connectshyft/_contracts/envelope/response-matrix/system-error`.
- If final code/message naming differs, update test assertions to the approved contract constants before green-phase activation.

---

## Next Steps

1. Implement route/service capability enforcement for inbox, claim, and takeover operations.
2. Add deterministic ConnectShyft system-error contract probe for envelope validation.
3. Remove `test.skip()` and run A5 API/E2E slice to green.
4. Promote story only after envelope and capability matrix assertions pass without skips.

---

**Generated by BMad TEA Agent** - 2026-02-22T20-20-56Z
