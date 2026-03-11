---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-26T19:32:55Z'
---

# ATDD Checklist - Epic b, Story 4: Role-Restricted Neighbor Merge with Irreversible Confirmation

**Date:** 2026-02-26  
**Author:** Jeremiah  
**Primary Test Level:** API (with E2E operator confirmation/refusal parity checks)

---

## Story Summary

Story `b.4` adds high-risk identity merge governance. Neighbor merge actions must be role-restricted, explicitly confirmed as irreversible, and auditable with before/after identity linkage plus actor metadata. Any refusal path (permission, confirmation, or transactional failure) must be deterministic and prevent partial writes.

**As a** tenant operations lead  
**I want** merge actions to be restricted and audited with explicit irreversible confirmation  
**So that** high-impact identity operations are deliberate and traceable

---

## Acceptance Criteria

1. Given a user initiates neighbor merge, when permissions are evaluated, then only authorized roles can proceed.
2. Given a merge request is submitted, when confirmation checks run, then merge executes only after explicit irreversible confirmation is provided.
3. Given merge completes, when persistence and side effects run, then audit/outbox records include before/after identifiers and merge actor metadata.
4. Given merge is refused (permission, validation, or confirmation failure), when response returns, then refusal is deterministic and no partial merge writes occur.

---

## Workflow Step Outputs

### Step 1: Preflight & Context

- Story file loaded: `_bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md`
- Policy gate behavior:
  - `npm run policy:check` initially failed on protected default branch `codex/dev`
  - Auto-remediation executed: `npm run start:story-branch -- b-4 role-restricted-neighbor-merge-with-irreversible-confirmation`
  - Story branch created: `codex/story-b-4-connectshyft-role-restricted-neighbor-merge-with-irreversible-confirmation`
  - Re-run passed: `npm run policy:check`
- Workflow guard passed:
  - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md`
- Framework detected: Playwright (`playwright.config.ts`, `tests/` root)
- Existing pattern baselines reviewed:
  - Story `b.2` and `b.3` ATDD API/E2E suites
  - Story `b.3` factory/fixture contracts under `tests/support/factories` and `tests/support/fixtures`
  - Route/service capability contracts in `src/src/routes/api/v1/connectshyft.ts` and `src/src/platform/rbac/capabilities.ts`
- TEA config flags loaded:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories.md`, `component-tdd.md`, `test-quality.md`, `test-healing-patterns.md`, `selector-resilience.md`, `timing-debugging.md`
  - Playwright Utils: `overview.md`, `api-request.md`, `network-recorder.md`, `auth-session.md`, `intercept-network-call.md`, `recurse.md`, `log.md`, `file-utils.md`, `network-error-monitor.md`, `fixtures-composition.md`
  - Browser automation: `playwright-cli.md`

### Step 2: Generation Mode

- Selected mode: **AI Generation**
- Rationale: ACs are explicit and contract-driven (role matrix, irreversible confirmation gate, audit/outbox requirements, deterministic refusal/rollback) and do not require live recording to produce reliable RED-phase tests.

### Step 3: Test Strategy

- **P0 API:**
  - tenant-admin allow path with irreversible confirmation
  - orgUnit-identity-lead allow path with same contract
  - orgUnit-member forbidden path
  - confirmation-missing refusal path
- **P1 API:** transaction-abort determinism + no partial writes guard
- **P0 E2E:** irreversible confirmation modal + impact summary + success audit identifiers
- **P1 E2E:** unauthorized refusal-state UX and phrase-exactness guard before submit
- Primary level set to API due highest risk concentration in authorization + transactional integrity + audit/outbox contracts.

### Step 4: Parallel Generation + Aggregation

- Parallel subprocess artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/api-2026-02-26T19-32-01-396Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-26T19-32-01-396Z.json`
- Aggregate summary generated:
  - `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-26T19-32-01-396Z.json`
- Temp outputs also written:
  - `/tmp/tea-atdd-api-tests-2026-02-26T19-32-01-396Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-02-26T19-32-01-396Z.json`
  - `/tmp/tea-atdd-summary-2026-02-26T19-32-01-396Z.json`
- TDD RED compliance checks passed:
  - all generated tests include `test.skip(...)`
  - no placeholder assertions detected

### Step 5: Validation

- Test discovery validation command:
  - `npx playwright test tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts --list`
- Discovery result: **8 tests in 2 files**.
- CLI session hygiene: no browser CLI sessions were opened in this generation pass.

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts` (238 lines)

- ✅ **Test:** `[P0] permits TENANT_ADMIN merge after explicit irreversible confirmation and emits before/after audit metadata`
  - **Status:** RED (skipped intentionally) - merge endpoint and audit payload contract not implemented
  - **Verifies:** tenant-admin allow path + before/after identifiers + actor metadata in audit/outbox
- ✅ **Test:** `[P0] permits ORGUNIT_IDENTITY_LEAD merge with identical irreversible confirmation and auditing contract`
  - **Status:** RED (skipped intentionally) - identity-lead allow path not implemented
  - **Verifies:** role-restricted allow matrix for identity merge operators
- ✅ **Test:** `[P0] refuses ORGUNIT_MEMBER merge requests with deterministic code and no merge side effects`
  - **Status:** RED (skipped intentionally) - forbidden-role refusal contract not implemented
  - **Verifies:** deterministic refusal + no merge/audit/outbox leakage for unauthorized role
- ✅ **Test:** `[P0] refuses merge when irreversible confirmation is missing or invalid`
  - **Status:** RED (skipped intentionally) - confirmation gate contract not implemented
  - **Verifies:** explicit irreversible phrase/acknowledgement requirement
- ✅ **Test:** `[P1] transaction failure path is deterministic and preserves both pre-merge neighbor records without partial writes`
  - **Status:** RED (skipped intentionally) - rollback/no-partial-write contract not implemented
  - **Verifies:** stable transaction-abort refusal + no source/survivor data loss on failed merge

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts` (154 lines)

- ✅ **Test:** `[P0] authorized identity lead must confirm irreversible merge intent and sees before/after audit summary on success`
  - **Status:** RED (skipped intentionally) - merge modal/action/audit-summary UX not implemented
  - **Verifies:** irreversible confirmation modal, impact summary, submit path, success evidence
- ✅ **Test:** `[P1] ORGUNIT_MEMBER receives deterministic refusal guidance and merge controls remain blocked`
  - **Status:** RED (skipped intentionally) - refusal-state merge UX not implemented
  - **Verifies:** refusal code display + merge control disablement for unauthorized role
- ✅ **Test:** `[P1] tenant admin must type irreversible phrase exactly before merge request can be submitted`
  - **Status:** RED (skipped intentionally) - phrase-exactness client guard not implemented
  - **Verifies:** confirmation input validation and no request dispatch before valid phrase

### Component Tests (0 tests)

No component-only slice generated. Coverage is concentrated in API governance contracts and operator-level E2E confirmation/refusal behavior.

---

## Data Factories Created

### Story B4 Factory

**File:** `tests/support/factories/connectShyftStoryB4Factory.ts` (160 lines)

**Exports:**

- `createStoryB4Context(overrides?)`
- `createStoryB4Headers(context, overrides?)`
- `StoryB4NeighborMergePayload` and story-context types

---

## Fixtures Created

### Story B4 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryB4.fixture.ts` (92 lines)

**Fixtures:**

- `storyB4Context`
- `storyB4TenantAdminHeaders`
- `storyB4IdentityLeadHeaders`
- `storyB4OrgUnitMemberHeaders`
- `storyB4ValidMergePayload`
- `storyB4MissingConfirmationPayload`
- `storyB4RollbackProbePayload`

---

## Mock Requirements

### Neighbor Merge Governance Contracts

**Endpoint:**

- `POST /api/v1/connectshyft/neighbors/merge`

**Success Envelope Expectations:**

- `ok: true`, deterministic `code: CONNECTSHYFT_NEIGHBOR_MERGED`
- `data.scope` includes `tenantId` and merge `orgUnitId`
- `data.merge` includes `sourceNeighborId`, `survivorNeighborId`, `irreversibleConfirmed`
- `data.audit.metadata` includes `before_neighbor_id`, `after_neighbor_id`, `actor_user_id`, `org_unit_id`
- `data.outbox.metadata` mirrors merge-identifiers + actor linkage

**Refusal Envelope Expectations:**

- deterministic refusal codes for forbidden-role, confirmation-required, and transaction-aborted paths
- `refusalType: 'business'`
- no `data.merge`, no `data.audit`, no `data.outbox` on refusal paths
- transaction-failure path preserves both pre-merge neighbors and applies rollback semantics

---

## Required data-testid Attributes

### Neighbor Merge UX

- `connectshyft-neighbor-merge-action` - primary merge trigger on neighbor profile
- `connectshyft-neighbor-merge-confirmation-modal` - irreversible confirmation modal container
- `connectshyft-neighbor-merge-impact-summary` - before/after neighbor impact summary
- `connectshyft-neighbor-merge-confirmation-input` - phrase input field
- `connectshyft-neighbor-merge-confirmation-submit` - irreversible merge submit action
- `connectshyft-neighbor-merge-confirmation-error` - phrase validation feedback
- `connectshyft-neighbor-merge-success` - merge success confirmation
- `connectshyft-neighbor-merge-audit-before-id` - surfaced pre-merge identifier
- `connectshyft-neighbor-merge-audit-after-id` - surfaced post-merge identifier
- `connectshyft-neighbor-merge-refusal-state` - refusal-state container for blocked merges
- `connectshyft-neighbor-merge-refusal-code` - deterministic refusal code display

---

## Implementation Checklist

### API/Service Governance Tasks

- [ ] Add role-restricted merge capability enforcement in route + service layers.
  - [ ] allow `TENANT_ADMIN`
  - [ ] allow `ORGUNIT_IDENTITY_LEAD`
  - [ ] refuse `ORGUNIT_MEMBER` and other non-authorized roles with deterministic code
- [ ] Add explicit irreversible confirmation contract.
  - [ ] require confirmation payload object
  - [ ] require exact irreversible phrase/value
  - [ ] refuse missing/invalid confirmation with stable refusal code/message
- [ ] Implement transactional merge operation.
  - [ ] merge duplicate identity into canonical survivor neighbor
  - [ ] atomically repoint dependent records (threads/messages/call associations)
  - [ ] rollback entire operation on any failure path
- [ ] Emit audit/outbox merge events with before/after identifiers and actor/orgUnit metadata.
- [ ] Preserve shared envelope semantics for success/refusal responses.

### UI Governance Tasks

- [ ] Add merge action visibility/enablement based on role capability.
- [ ] Add irreversible confirmation modal with explicit impact copy and phrase-exactness validation.
- [ ] Add deterministic refusal-state UI for blocked merge attempts.
- [ ] Surface post-merge before/after identifiers and actor-trace evidence in operator UI.

### Test Activation Tasks (Green Phase)

- [ ] Remove `test.skip()` from:
  - `tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts`
  - `tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts`
- [ ] Run story slice and verify full pass.

**Estimated Effort:** 16-24 hours

---

## Running Tests

```bash
# List tests in this ATDD slice
npx playwright test tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts --list

# Run story slice after removing test.skip
npm run test:e2e -- tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts

# Run API ATDD only
npm run test:e2e -- tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts

# Run E2E ATDD only
npm run test:e2e -- tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API/E2E tests generated for all story acceptance criteria.
- ✅ Tests intentionally marked with `test.skip()` for RED-phase handoff semantics.
- ✅ Story-specific factory/fixture scaffolding created.
- ✅ ATDD checklist and step artifacts generated.

### GREEN Phase (DEV Team)

1. Implement merge endpoint capability matrix and irreversible confirmation gate.
2. Implement transactional merge and dependent-record repoint with strict rollback behavior.
3. Implement audit/outbox merge event payloads with before/after identifiers + actor metadata.
4. Implement merge confirmation/refusal/success operator UX surfaces with required testids.
5. Remove `test.skip()` and satisfy all ATDD assertions.

### REFACTOR Phase (DEV Team)

1. Consolidate merge refusal codes and shared envelope helpers.
2. Extract shared merge metadata builders for audit and outbox parity.
3. Simplify merge orchestration while preserving transaction and rollback invariants.

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
npx playwright test tests/api/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.api.spec.ts tests/e2e/platform/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.atdd.spec.ts --list
```

**Result:**

- Total tests discovered: 8
- API tests: 5
- E2E tests: 3
- Status: ✅ discovery complete, RED slice generated

### RED Compliance Verification

- All generated tests include `test.skip()`.
- No placeholder assertions (`expect(true).toBe(true)`) present.

---

## Assumptions and Risks

- **Assumed success code:** `CONNECTSHYFT_NEIGHBOR_MERGED`
- **Assumed refusal codes:**
  - `CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN`
  - `CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED`
  - `CONNECTSHYFT_NEIGHBOR_MERGE_TRANSACTION_ABORTED`
- **Assumed merge endpoint:** `POST /api/v1/connectshyft/neighbors/merge`
- **Assumed audit/outbox metadata fields:** `before_neighbor_id`, `after_neighbor_id`, `actor_user_id`, `org_unit_id`
- **Assumed merge UI testids** listed above will be implemented in neighbor-profile merge flow.

If canonical endpoint/code/field naming differs, align assertions to approved contracts during GREEN-phase activation.

---

## Next Steps

1. Implement merge route/service contracts and confirmation gating.
2. Implement transactional merge with rollback-safe dependent-record repointing.
3. Implement merge audit/outbox payloads and UI evidence surfaces.
4. Remove `test.skip()` and run the `b.4` ATDD slice to green.
5. Promote passing `b.4` suite into broader Epic B governance regression coverage.

---

**Generated by BMad TEA Agent** - 2026-02-26T19:32:55Z
