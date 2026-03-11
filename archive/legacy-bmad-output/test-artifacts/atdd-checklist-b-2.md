---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T14:14:49Z'
---

# ATDD Checklist - Epic b, Story 2: Shared Tenant Identity and Shared-Phone Indicators

**Date:** 2026-02-24  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E operator-profile parity checks)

---

## Story Summary

Story `b.2` extends ConnectShyft neighbor contracts so identity updates and per-phone shared indicators behave as tenant-scoped data visible across authorized orgUnits. The slice also hardens tenant isolation so cross-tenant reads or updates are refused without leaking neighbor identity payloads.

**As an** operator working across orgUnits in one tenant  
**I want** neighbor identity updates and shared-phone markers to be consistently visible  
**So that** contact context remains aligned across operational teams

---

## Acceptance Criteria

1. Given neighbor identity or phone metadata is updated in one orgUnit context, when another authorized orgUnit in the same tenant loads that profile, then shared tenant identity updates are immediately visible.
2. Given a phone entry is marked as shared or non-shared, when profile data is rendered via API/UI, then persisted shared-phone indicators are returned and displayed consistently.
3. Given users from another tenant attempt access, when read APIs execute, then cross-tenant identity visibility is refused with no data leakage.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/b-2-shared-tenant-identity-and-shared-phone-indicators.md`
- Policy gate behavior:
  - `npm run policy:check` initially failed on default branch `codex/dev`
  - Auto-remediation executed: `npm run start:story-branch -- b-2 shared-tenant-identity-and-shared-phone-indicators`
  - Re-run passed: `npm run policy:check`
- Workflow guard passed:
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/b-2-shared-tenant-identity-and-shared-phone-indicators.md`
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root)
- Existing patterns reviewed:
  - Story `b.1` API/E2E ATDD slices
  - ConnectShyft story fixtures/factories under `tests/support/fixtures` and `tests/support/factories`
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright Utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI Generation**
- Rationale: acceptance criteria and architecture references define deterministic API + UI contracts; recording mode is not required for this red-phase specification pass.

### Step 3: Test Strategy

- **P0 API:** tenant-wide identity propagation across orgUnits; shared-phone indicator persistence consistency; cross-tenant refusal with no data leakage.
- **P1 API:** cross-tenant update refusal hardening.
- **P0 E2E:** neighbor profile update flow with explicit tenant-wide impact copy and shared marker visibility.
- **P1 E2E:** cross-tenant deep-link refusal state with hidden profile form.
- Primary level set to API due contract and tenant boundary risk concentration; E2E covers operator-facing parity and refusal UX.

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-24T14-14-38Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-24T14-14-38Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-24T14-14-38Z.json`
- Temp outputs also written:
  - `/tmp/tea-atdd-api-tests-2026-02-24T14-14-38Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-24T14-14-38Z.json`
  - `/tmp/tea-atdd-summary-2026-02-24T14-14-38Z.json`
- TDD RED compliance checks passed:
  - all generated tests include `test.skip(...)`
  - no placeholder assertions detected

### Step 5: Validation

- Test discovery validation command:
  - `npx playwright test tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts --list`
- Discovery result: **7 tests in 2 files**.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts` (200 lines)

- ✅ **Test:** `[P0] propagates neighbor identity updates across authorized orgUnits in the same tenant immediately`
  - **Status:** RED (skipped intentionally) - tenant-shared neighbor update/read contract not implemented
  - **Verifies:** same-tenant cross-orgUnit read-through of updated identity fields
- ✅ **Test:** `[P0] persists shared-phone indicator toggles and returns consistent flags in detail and collection contracts`
  - **Status:** RED (skipped intentionally) - shared-phone indicator persistence and projection contracts not implemented
  - **Verifies:** `isShared` parity across detail and collection response surfaces
- ✅ **Test:** `[P0] refuses cross-tenant profile reads with deterministic refusal semantics and zero identity leakage`
  - **Status:** RED (skipped intentionally) - cross-tenant neighbor read boundary enforcement not implemented for profile routes
  - **Verifies:** refusal semantics with no neighbor payload leakage
- ✅ **Test:** `[P1] refuses cross-tenant identity updates without leaking persisted phone metadata`
  - **Status:** RED (skipped intentionally) - cross-tenant update refusal behavior not implemented
  - **Verifies:** mutation-path tenant boundary enforcement and metadata redaction

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts` (124 lines)

- ✅ **Test:** `[P0] operator updates tenant-shared profile data and sees explicit tenant-wide impact guidance before save`
  - **Status:** RED (skipped intentionally) - neighbor profile edit UI and warning-copy contract not implemented
  - **Verifies:** save flow intent, impact copy visibility, and shared indicator presentation
- ✅ **Test:** `[P0] authorized operators in another orgUnit immediately see shared identity and phone indicator updates`
  - **Status:** RED (skipped intentionally) - cross-orgUnit profile parity render path not implemented
  - **Verifies:** same-tenant read visibility in alternate orgUnit context
- ✅ **Test:** `[P1] cross-tenant deep links render refusal state and keep neighbor profile fields hidden`
  - **Status:** RED (skipped intentionally) - refusal-state UI path for cross-tenant profile access not implemented
  - **Verifies:** refusal-code UX, safe hidden-state behavior for profile form

### Component Tests (0 tests)

No component-level slice was generated in this pass; coverage is concentrated in API contract boundaries plus operator journey contracts.

---

## Data Factories Created

### Story B2 Factory

**File:** `tests/support/factories/connectShyftStoryB2Factory.ts` (143 lines)

**Exports:**

- `createStoryB2Context(overrides?)`
- `createStoryB2Headers(context, overrides?)`
- `StoryB2NeighborUpdatePayload` and related type contracts

---

## Fixtures Created

### Story B2 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryB2.fixture.ts` (95 lines)

**Fixtures:**

- `storyB2Context`
- `storyB2PrimaryHeaders`
- `storyB2PeerOrgUnitHeaders`
- `storyB2CrossTenantHeaders`
- `storyB2IdentityUpdatePayload`
- `storyB2SharedIndicatorTogglePayload`

---

## Mock Requirements

### Neighbor Profile Contracts

**Endpoints:**

- `PUT /api/v1/connectshyft/neighbors/:neighborId`
- `GET /api/v1/connectshyft/neighbors/:neighborId`
- `GET /api/v1/connectshyft/neighbors`

**Success Envelope Expectations:**

- `ok: true` and deterministic `code`
- `data.neighbor` includes tenant-shared identity fields and phone entries
- phone entries include persisted shared indicators (`isShared`) and stable ordering

**Refusal Envelope Expectations:**

- `ok: false`, `refusalType: 'business'`, deterministic tenant-boundary code
- no `data.neighbor` payload on cross-tenant refusal paths

---

## Required data-testid Attributes

### Neighbor Profile (Tenant-Scoped)

- `connectshyft-neighbor-first-name-input` - editable first name field
- `connectshyft-neighbor-last-name-input` - editable last name field
- `connectshyft-neighbor-phone-shared-toggle-mobile` - shared-flag toggle control for mobile phone row
- `connectshyft-neighbor-phone-shared-indicator-mobile` - rendered shared badge/label in profile view
- `connectshyft-neighbor-profile-save-success` - deterministic success banner after profile save
- `connectshyft-neighbor-profile-refusal-state` - refusal-state container for access denials
- `connectshyft-neighbor-profile-refusal-code` - refusal code surface for deterministic UX verification
- `connectshyft-neighbor-profile-form` - primary form wrapper hidden on refusal flows

---

## Implementation Checklist

### Neighbor Profile API Tasks

- [ ] Add neighbor profile routes in `src/src/routes/api/v1/connectshyft.ts`:
  - [ ] `GET /neighbors/:neighborId`
  - [ ] `PUT /neighbors/:neighborId`
  - [ ] `GET /neighbors` projection with shared indicator field parity
- [ ] Implement tenant-shared read/write semantics in `src/src/modules/connectshyft/neighbors.ts`:
  - [ ] identity updates visible across authorized orgUnits in same tenant
  - [ ] strict cross-tenant refusal with zero identity leakage
- [ ] Persist and project shared-phone indicator metadata per phone entry.
- [ ] Keep deterministic envelope contracts and refusal semantics consistent with existing ConnectShyft conventions.

### UI Tasks

- [ ] Add Neighbor Profile route/view under `frontend/src/views/ConnectShyft/` and router registration.
- [ ] Render explicit warning copy for tenant-wide update impact.
- [ ] Render shared-phone badges and toggles with stable `data-testid` hooks.
- [ ] Surface refusal-state UI for cross-tenant/deep-link denial scenarios.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from:
  - `tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts`
  - `tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts`
- [ ] Run story slice and verify full pass.

**Estimated Effort:** 12-16 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts --list

# Run story slice after removing test.skip
npm run test:e2e -- tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts

# Run API ATDD only
npm run test:e2e -- tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts

# Run E2E ATDD only
npm run test:e2e -- tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E tests generated for all story acceptance criteria.
- ✅ Tests intentionally marked with `test.skip()` for RED-phase handoff semantics.
- ✅ Story-specific factory/fixture scaffolding created.
- ✅ ATDD checklist and step artifacts generated.

### GREEN Phase (DEV Team)

1. Implement neighbor profile read/update endpoints and tenant-shared identity behavior.
2. Persist and render shared-phone indicators consistently across API and UI.
3. Remove `test.skip()` and satisfy all ATDD assertions.

### REFACTOR Phase (DEV Team)

1. Consolidate neighbor profile contract constants and envelope composition helpers.
2. Remove duplicated shared-indicator projection logic between collection/detail handlers.
3. Preserve deterministic refusal semantics while simplifying internals.

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
npx playwright test tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.api.spec.ts tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.atdd.spec.ts --list
```

**Result:**

- Total tests discovered: 7
- API tests: 4
- E2E tests: 3
- Status: ✅ discovery complete, RED slice generated

### RED Compliance Verification

- All generated tests include `test.skip()`.
- No placeholder assertions (`expect(true).toBe(true)`) present.

---

## Assumptions and Risks

- **Assumed API codes:**
  - `CONNECTSHYFT_NEIGHBOR_UPDATED`
  - `CONNECTSHYFT_NEIGHBOR_RESOLVED`
  - `CONNECTSHYFT_NEIGHBORS_RESOLVED`
  - `CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH`
- **Assumed profile path:** `/app/connectshyft/neighbors/:neighborId`
- **Assumed phone metadata:** `isShared` boolean per phone entry.
- If finalized contract names differ, update assertions to approved constants before GREEN-phase activation.

---

## Next Steps

1. Implement the `b.2` neighbor profile API read/update semantics and shared indicator persistence.
2. Implement profile UI surfaces and refusal-state behavior with the required `data-testid` contracts.
3. Remove `test.skip()` and run the b.2 ATDD slice to green.
4. Use resulting passing suite as prerequisite for story `b.3` governance-focused edit controls.

---

**Generated by BMad TEA Agent** - 2026-02-24T14:14:49Z
