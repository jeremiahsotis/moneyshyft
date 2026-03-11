---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-24T16:54:01Z'
---

# ATDD Checklist - Epic b, Story 3: Relationship-Gated Neighbor Edits with Provenance Audit

**Date:** 2026-02-24  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E operator governance-path parity checks)

---

## Story Summary

Story `b.3` adds governance controls to neighbor profile edits so identity mutations are allowed only when the actor has an active-thread relationship in the current orgUnit or tenant-privileged authority. Successful edits must emit provenance-rich audit/outbox metadata containing originating `org_unit_id`, actor identity, and mutation context; denied edits must return deterministic refusal messaging with no data leakage.

**As an** orgUnit identity lead  
**I want** relationship-gated neighbor edits with provenance logging  
**So that** sensitive identity updates remain governed and auditable

---

## Acceptance Criteria

1. Given a user attempts to edit a neighbor, when authorization is evaluated, then edits are permitted only for users with active-thread relationship in the current orgUnit or tenant-privileged roles.
2. Given an authorized neighbor edit succeeds, when audit/outbox records are written, then originating `org_unit_id` metadata is included with actor and mutation context.
3. Given a user lacks relationship or privileged access, when edit is attempted, then operation is refused with deterministic policy messaging and no data leakage.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/b-3-relationship-gated-neighbor-edits-with-provenance-audit.md`
- Policy gate behavior:
  - `npm run policy:check` initially failed on protected default branch `codex/dev`
  - Auto-remediation executed: `npm run start:story-branch -- b-3 relationship-gated-neighbor-edits-with-provenance-audit`
  - Story branch created: `codex/story-b-3-connectshyft-relationship-gated-neighbor-edits-with-provenance-audit`
  - Re-run passed: `npm run policy:check`
- Workflow guard passed:
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/b-3-relationship-gated-neighbor-edits-with-provenance-audit.md`
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root)
- Existing pattern baselines reviewed:
  - Story `a.2` context enforcement ATDD API/E2E suites
  - Story `b.1` and `b.2` neighbor ATDD API/E2E suites
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
- Rationale: acceptance criteria and architecture constraints are explicit and deterministic for red-phase API + E2E contract generation; recording mode was not required.

### Step 3: Test Strategy

- **P0 API:** related identity-lead allow path; tenant-privileged bypass allow path; deterministic refusal/no-leak path.
- **P1 API:** refusal determinism across repeated unauthorized attempts.
- **P0 E2E:** related-actor edit journey with provenance metadata visibility.
- **P1 E2E:** refusal UX for unrelated actor and privileged-override UX parity.
- Primary level set to API due highest governance risk concentration (authorization matrix + audit/outbox provenance schema).

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-24T16-53-31-231Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-24T16-53-31-231Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-24T16-53-31-231Z.json`
- Temp outputs also written:
  - `/tmp/tea-atdd-api-tests-2026-02-24T16-53-31-231Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-24T16-53-31-231Z.json`
  - `/tmp/tea-atdd-summary-2026-02-24T16-53-31-231Z.json`
- TDD RED compliance checks passed:
  - all generated tests include `test.skip(...)`
  - no placeholder assertions detected

### Step 5: Validation

- Test discovery validation command:
  - `npx playwright test tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts --list`
- Discovery result: **7 tests in 2 files**.
- CLI session hygiene: no browser CLI sessions were opened in this generation pass.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts` (186 lines)

- ✅ **Test:** `[P0] permits related identity leads to edit neighbors and emits org_unit_id provenance in audit and outbox metadata`
  - **Status:** RED (skipped intentionally) - relationship-gated authorization and provenance payload contracts not implemented
  - **Verifies:** active-thread related allow path plus provenance metadata (`org_unit_id`, actor, mutation context)
- ✅ **Test:** `[P0] permits tenant-privileged roles to bypass relationship checks and still records provenance metadata`
  - **Status:** RED (skipped intentionally) - privileged bypass governance contract not implemented
  - **Verifies:** tenant-privileged allow path + provenance parity with relationship path
- ✅ **Test:** `[P0] refuses unrelated callers with deterministic policy messaging and no neighbor or provenance leakage`
  - **Status:** RED (skipped intentionally) - deterministic policy refusal contract not implemented
  - **Verifies:** no-leak refusal envelope (`neighbor`, `audit`, `outbox` absent)
- ✅ **Test:** `[P1] keeps refusal code and policy message stable across repeated unauthorized edit attempts`
  - **Status:** RED (skipped intentionally) - refusal determinism guard not implemented
  - **Verifies:** stable refusal code/message across repeated denied mutation attempts

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts` (154 lines)

- ✅ **Test:** `[P0] related identity lead can save neighbor edits and sees provenance metadata surfaced in operator UI`
  - **Status:** RED (skipped intentionally) - relationship-gated edit UI + provenance surfaces not implemented
  - **Verifies:** related actor edit path, policy indicator, save success, provenance UI fields
- ✅ **Test:** `[P1] unrelated identity lead sees deterministic refusal guidance and edit controls remain blocked`
  - **Status:** RED (skipped intentionally) - refusal-state UX path not implemented
  - **Verifies:** refusal code visibility, refusal guidance copy, blocked save control behavior
- ✅ **Test:** `[P1] tenant-privileged operators can edit without active relationship and receive explicit override notice`
  - **Status:** RED (skipped intentionally) - privileged override UX path not implemented
  - **Verifies:** override notice + permitted mutation path in operator UI

### Component Tests (0 tests)

No component-level slice generated for this story. Coverage is intentionally concentrated in API governance contracts and operator-level E2E parity.

---

## Data Factories Created

### Story B3 Factory

**File:** `tests/support/factories/connectShyftStoryB3Factory.ts` (171 lines)

**Exports:**

- `createStoryB3Context(overrides?)`
- `createStoryB3Headers(context, overrides?)`
- `StoryB3NeighborUpdatePayload` and related story-context types

---

## Fixtures Created

### Story B3 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryB3.fixture.ts` (98 lines)

**Fixtures:**

- `storyB3Context`
- `storyB3RelatedActorHeaders`
- `storyB3TenantPrivilegedHeaders`
- `storyB3UnrelatedActorHeaders`
- `storyB3RelatedUpdatePayload`
- `storyB3TenantPrivilegedUpdatePayload`

---

## Mock Requirements

### Neighbor Edit Governance Contracts

**Endpoints:**

- `PUT /api/v1/connectshyft/neighbors/:neighborId`

**Success Envelope Expectations:**

- `ok: true`, deterministic `code: CONNECTSHYFT_NEIGHBOR_UPDATED`
- `data.scope` includes `tenantId` and originating `orgUnitId`
- `data.neighbor` includes updated identity payload
- `data.audit.metadata` includes `org_unit_id`, actor, and mutation context
- `data.outbox.metadata` includes provenance metadata matching audit context

**Refusal Envelope Expectations:**

- `ok: false`, deterministic refusal `code`, `refusalType: 'business'`
- deterministic policy message for unrelated callers
- no `data.neighbor`, no `data.audit`, no `data.outbox` on refusal paths

---

## Required data-testid Attributes

### Neighbor Profile Governance UI

- `connectshyft-neighbor-edit-policy-indicator` - policy evaluation indicator for relationship/privileged path
- `connectshyft-neighbor-provenance-orgunit` - surfaced originating orgUnit provenance value
- `connectshyft-neighbor-provenance-actor` - surfaced actor provenance value
- `connectshyft-neighbor-profile-save-success` - deterministic success state after save
- `connectshyft-neighbor-profile-refusal-state` - refusal-state container for blocked edits
- `connectshyft-neighbor-profile-refusal-code` - deterministic refusal code rendering
- `connectshyft-context-override-notice` - tenant-privileged override notice
- `connectshyft-neighbor-first-name-input` - editable first name field
- `connectshyft-neighbor-last-name-input` - editable last name field

---

## Implementation Checklist

### API/Service Governance Tasks

- [ ] Add relationship-gated edit authorization in route + service layers for neighbor updates:
  - [ ] allow when actor has active-thread relationship in current orgUnit
  - [ ] allow tenant-privileged bypass via capability checks
  - [ ] deny otherwise with deterministic policy refusal code/message
- [ ] Ensure denied edits do not perform mutation writes and do not emit audit/outbox side effects.
- [ ] Add provenance payload contract for successful edits:
  - [ ] include originating `org_unit_id`
  - [ ] include actor identity metadata
  - [ ] include mutation context (before/after summary, policy path)
- [ ] Keep success/refusal envelope semantics aligned with existing ConnectShyft response helpers.

### UI Governance Tasks

- [ ] Surface relationship-gate policy indicator before save.
- [ ] Surface deterministic refusal guidance and code for denied edits.
- [ ] Block or disable edit controls on refusal paths.
- [ ] Surface tenant-privileged override notice when bypass path is used.
- [ ] Surface provenance summary fields after successful edits.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from:
  - `tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts`
  - `tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts`
- [ ] Run story slice and verify full pass.

**Estimated Effort:** 14-20 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts --list

# Run story slice after removing test.skip
npm run test:e2e -- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts

# Run API ATDD only
npm run test:e2e -- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts

# Run E2E ATDD only
npm run test:e2e -- tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E tests generated for all story acceptance criteria.
- ✅ Tests intentionally marked with `test.skip()` for RED-phase handoff semantics.
- ✅ Story-specific factory/fixture scaffolding created.
- ✅ ATDD checklist and step artifacts generated.

### GREEN Phase (DEV Team)

1. Implement relationship-gated authorization path (active-thread relation + tenant-privileged bypass).
2. Implement provenance audit/outbox metadata contract for successful edits.
3. Implement refusal-state UI for denied edits and provenance surfaces for successful edits.
4. Remove `test.skip()` and satisfy all ATDD assertions.

### REFACTOR Phase (DEV Team)

1. Consolidate policy/refusal constants and provenance metadata helpers.
2. Remove duplicate authorization checks while preserving route + service guard layering.
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
npx playwright test tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts --list
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

- **Assumed refusal code:** `CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED`
- **Assumed provenance envelope fields:** `data.audit.metadata.org_unit_id`, `data.outbox.metadata.org_unit_id`, actor metadata, mutation context.
- **Assumed UI policy/refusal data-testid hooks** listed above will be implemented in the profile route.
- If canonical field/code naming differs, align assertions to approved contract constants during GREEN-phase activation.

---

## Next Steps

1. Implement relationship-gated neighbor edit authorization and deterministic refusal contracts in route + service layers.
2. Add provenance audit/outbox metadata emission with originating `org_unit_id` and actor context.
3. Implement profile UI policy/refusal/provenance surfaces with required `data-testid` hooks.
4. Remove `test.skip()` and run the `b.3` ATDD slice to green.
5. Use passing `b.3` governance suite as prerequisite input for story `b.4` merge safety automation.

---

**Generated by BMad TEA Agent** - 2026-02-24T16:54:01Z
