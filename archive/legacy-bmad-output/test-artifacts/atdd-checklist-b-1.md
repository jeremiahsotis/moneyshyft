---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T12:51:26Z'
---

# ATDD Checklist - Epic b, Story 1: Tenant-Scoped Neighbor Creation with Required Phone

**Date:** 2026-02-24  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E operator-flow coverage)

---

## Story Summary

Story `b.1` introduces tenant-scoped neighbor creation with a hard requirement that at least one valid phone number is supplied. The feature must enforce deterministic refusal behavior for missing or invalid phone data and maintain shared envelope contract semantics for both success and refusal responses.

**As an** orgUnit member  
**I want** to create neighbors with at least one phone number in tenant scope  
**So that** communications can begin with valid contact records

---

## Acceptance Criteria

1. Given an authorized user submits neighbor data, when create neighbor is requested, then neighbor identity is stored tenant-scoped.
2. Given a create request omits phone entries, when validation executes, then the request is refused with deterministic refusal messaging.
3. Given a create request includes at least one valid phone entry, when persistence succeeds, then accepted records include normalized phone values and are returned via shared response envelope semantics.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/b-1-tenant-scoped-neighbor-creation-with-required-phone.md`
- Policy gate passed:
  - `npm run policy:check`
- Workflow guard passed:
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/b-1-tenant-scoped-neighbor-creation-with-required-phone.md`
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root)
- Existing ConnectShyft patterns reviewed (`a-1` through `a-5` ATDD and supporting factory/fixture patterns)
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright Utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI Generation**
- Rationale: acceptance criteria are deterministic and endpoint/validation contract oriented; RED-phase tests can be specified directly from story constraints without requiring recording-mode capture.

### Step 3: Test Strategy

- **P0 API:** create success contract, phone-required refusal, cross-tenant/orgUnit refusal.
- **P1 API:** invalid-format refusal, capability refusal, envelope-key parity validation.
- **P0 E2E:** operator create journey with valid phone; missing-phone refusal message visibility.
- **P1 E2E:** cross-scope refusal envelope expectations surfaced in journey-level verification.
- Primary test level set to API for contract and validation determinism; E2E adds operator-facing guardrail coverage.

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-24T12-51-26Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-24T12-51-26Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-24T12-51-26Z.json`
- Temp outputs also written:
  - `/tmp/tea-atdd-api-tests-2026-02-24T12-51-26Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-24T12-51-26Z.json`
  - `/tmp/tea-atdd-summary-2026-02-24T12-51-26Z.json`
- TDD RED compliance checks passed:
  - all generated tests include `test.skip(...)`
  - no placeholder assertions detected

### Step 5: Validation

- Test discovery validation executed:
  - `npx playwright test tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts --list`
- Discovery result: **9 tests in 2 files**.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts` (151 lines)

- ✅ **Test:** `[P0] creates tenant-scoped neighbor records and returns normalized phone values in success envelope`
  - **Status:** RED (skipped intentionally) - neighbor create endpoint contract not implemented
  - **Verifies:** tenant/orgUnit scoping, phone normalization, success envelope shape
- ✅ **Test:** `[P0] refuses create requests that omit phone entries with deterministic refusal messaging`
  - **Status:** RED (skipped intentionally) - phone-required validation contract not implemented
  - **Verifies:** missing-phone refusal code/message and no false-positive payload
- ✅ **Test:** `[P0] refuses create requests when orgUnit scope crosses tenant boundaries`
  - **Status:** RED (skipped intentionally) - cross-tenant scope refusal path for neighbor create not implemented
  - **Verifies:** deterministic tenant/orgUnit mismatch refusal behavior
- ✅ **Test:** `[P1] refuses invalid phone formats with deterministic refusal code and no data leakage`
  - **Status:** RED (skipped intentionally) - phone-format validation contract not implemented
  - **Verifies:** invalid-format refusal semantics and no leaked normalized payload
- ✅ **Test:** `[P1] refuses callers without neighbor-create capability before mutation processing`
  - **Status:** RED (skipped intentionally) - capability gate for neighbor create not implemented
  - **Verifies:** pre-mutation authorization refusal behavior
- ✅ **Test:** `[P1] keeps canonical envelope keys across success and refusal paths for neighbor create`
  - **Status:** RED (skipped intentionally) - envelope parity for new neighbor route not implemented
  - **Verifies:** top-level key contract consistency (`ok`, `code`, `message`, `correlationId`, `tenantId`)

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts` (99 lines)

- ✅ **Test:** `[P0] operator can submit neighbor create form with one valid phone and see normalized result state`
  - **Status:** RED (skipped intentionally) - create-neighbor UI flow not implemented
  - **Verifies:** operator journey success path and normalized-phone rendering
- ✅ **Test:** `[P0] operator sees deterministic validation refusal when submitting create flow without phone values`
  - **Status:** RED (skipped intentionally) - validation UX messaging path not implemented
  - **Verifies:** actionable missing-phone feedback in operator UI
- ✅ **Test:** `[P1] cross-tenant or invalid-scope create attempts surface deterministic refusal envelope semantics`
  - **Status:** RED (skipped intentionally) - cross-scope refusal journey contract not implemented
  - **Verifies:** journey-level refusal semantics for scope mismatch

### Component Tests (0 tests)

No component-level slice was generated in this pass; coverage is concentrated in API contract behavior and operator E2E flow contracts.

---

## Data Factories Created

### Story B1 Factory

**File:** `tests/support/factories/connectShyftStoryB1Factory.ts` (119 lines)

**Exports:**

- `createStoryB1Context(overrides?)`
- `createStoryB1Headers(context, overrides?)`
- `StoryB1NeighborCreatePayload` and related type contracts

---

## Fixtures Created

### Story B1 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryB1.fixture.ts` (90 lines)

**Fixtures:**

- `storyB1Context`
- `storyB1AuthorizedHeaders`
- `storyB1TenantViewerHeaders`
- `storyB1ValidPayload`
- `storyB1NoPhonePayload`
- `storyB1InvalidPhonePayload`
- `storyB1CrossTenantPayload`

---

## Mock Requirements

### Neighbor Create Endpoint Contract

**Endpoint:** `POST /api/v1/connectshyft/neighbors`

**Success Envelope (expected):**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_NEIGHBOR_CREATED",
  "message": "Neighbor created",
  "correlationId": "corr-story-b1-xxxx",
  "tenantId": "tenant-connectshyft-alpha",
  "data": {
    "neighbor": {
      "tenantId": "tenant-connectshyft-alpha",
      "orgUnitId": "org-connectshyft-alpha-east",
      "phones": [
        {
          "label": "mobile",
          "value": "+12605550199"
        }
      ]
    }
  }
}
```

**Refusal Envelope Examples (expected):**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED",
  "message": "At least one phone is required",
  "refusalType": "business",
  "correlationId": "corr-story-b1-xxxx",
  "tenantId": "tenant-connectshyft-alpha"
}
```

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT",
  "message": "Phone value is invalid",
  "refusalType": "business",
  "correlationId": "corr-story-b1-xxxx",
  "tenantId": "tenant-connectshyft-alpha"
}
```

---

## Required data-testid Attributes

### Neighbor Create Flow

- `connectshyft-neighbor-first-name-input` - first name entry
- `connectshyft-neighbor-last-name-input` - last name entry
- `connectshyft-neighbor-phone-input` - phone value input
- `connectshyft-neighbor-phone-label-select` - phone label selector
- `connectshyft-neighbor-validation-error` - deterministic refusal/validation banner
- `connectshyft-neighbor-create-success` - success confirmation banner
- `connectshyft-neighbor-phone-value` - rendered normalized phone value

---

## Implementation Checklist

### Neighbor Create API Tasks

- [ ] Add `POST /api/v1/connectshyft/neighbors` route in `src/src/routes/api/v1/connectshyft.ts`.
- [ ] Enforce orgUnit scope using existing context resolution (`resolveConnectShyftOrgUnitContext`).
- [ ] Enforce create capability gate for neighbor mutation (`NEIGHBOR_EDIT_ALL` and/or `ORG_UNIT_NEIGHBOR_EDIT_RELATED` based on scope model).
- [ ] Validate at least one phone entry is supplied and emit deterministic refusal when absent.
- [ ] Validate phone format and normalize accepted values before persistence.
- [ ] Return canonical shared envelope keys for both success and refusal paths.

### Persistence and Domain Tasks

- [ ] Add/confirm `connectshyft.cs_neighbors` and `connectshyft.cs_neighbor_phones` persistence support.
- [ ] Persist tenant/orgUnit scope with neighbor identity and phone rows.
- [ ] Ensure normalized phone values are returned from create response data.
- [ ] Refuse cross-tenant/orgUnit mismatches with deterministic refusal codes.

### UI/Operator Tasks

- [ ] Implement neighbor create route/screen under `/app/connectshyft/neighbors/new`.
- [ ] Surface deterministic refusal states for missing phone and invalid format.
- [ ] Display normalized accepted phone value post-create.
- [ ] Ensure refusal responses never expose tenant/orgUnit data outside authorized context.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from:
  - `tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts`
  - `tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts`
- [ ] Run story slice and verify full pass.

**Estimated Effort:** 10-14 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts --list

# Run story slice after removing test.skip
npm run test:e2e -- tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts

# Run API ATDD only
npm run test:e2e -- tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts

# Run E2E ATDD only
npm run test:e2e -- tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E tests generated for all story ACs.
- ✅ Tests intentionally marked with `test.skip()` for RED-phase handoff semantics.
- ✅ Story-specific factory/fixture scaffolding created.
- ✅ ATDD checklist and step artifacts generated.

### GREEN Phase (DEV Team)

1. Implement neighbor create endpoint + persistence + validation behavior.
2. Implement operator create flow and refusal UX.
3. Remove `test.skip()` and satisfy all ATDD assertions.

### REFACTOR Phase (DEV Team)

1. Extract shared neighbor-validation and normalization helpers where duplication appears.
2. Keep refusal code constants centralized with ConnectShyft route/service contract definitions.
3. Preserve envelope parity while simplifying implementation internals.

---

## Knowledge Base References Applied

Core:

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`

Playwright Utils:

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

Browser automation:

- `playwright-cli.md`

---

## Test Execution Evidence

### Discovery Verification

**Command:**

```bash
npx playwright test tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.api.spec.ts tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.atdd.spec.ts --list
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

- **Assumed endpoint:** `POST /api/v1/connectshyft/neighbors`
- **Assumed refusal codes:**
  - `CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED`
  - `CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT`
  - `CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN`
- **Assumed success code:** `CONNECTSHYFT_NEIGHBOR_CREATED`
- If finalized contract names differ, update assertions to approved constants before GREEN-phase activation.

---

## Next Steps

1. Implement the `b.1` create-neighbor backend route and persistence contracts.
2. Implement operator-facing create flow validation and normalized-phone presentation.
3. Remove `test.skip()` and run the b.1 ATDD slice to green.
4. Advance to story `b.2` ATDD only after b.1 contract and validation paths are stable.

---

**Generated by BMad TEA Agent** - 2026-02-24T12:51:26Z
