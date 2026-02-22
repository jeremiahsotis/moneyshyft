---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-22T11:50:21Z'
---

# ATDD Checklist - Epic a, Story 3: OrgUnit Number Mapping Management

**Date:** 2026-02-22
**Author:** Jeremiah
**Primary Test Level:** API + E2E
**Story File:**
`_bmad-output/implementation-artifacts/a-3-orgunit-number-mapping-management.md`

---

## Step 1 - Preflight & Context

### Mandatory Policy Gates

- `npm run policy:check` passed on branch:
  `codex/story-a-3-connectshyft-orgunit-number-mapping-management`
- `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/a-3-orgunit-number-mapping-management.md` passed.
- Auto-remediation/reconciliation notes:
  - Initial branch creation used `routeshyft` lane token and failed status sync for this story.
  - Recreated branch with explicit lane override:
    `npm run start:story-branch -- --lane connectshyft a-3 orgunit-number-mapping-management`.
  - Policy/workflow guards revalidated and passed.

### Story Inputs Loaded

Acceptance criteria translated from story:

1. OrgUnit admin create/update flows support multiple mappings per orgUnit when values are valid Twilio E.164 numbers.
2. Duplicate `(tenant_id, twilio_number_e164)` attempts are blocked deterministically with actionable validation feedback.

Constraints captured:

- FR coverage: `FR-CS-025`, `FR-CS-026`.
- Deterministic inbound routing depends on stable number-to-context mapping.
- Enforce tenant and orgUnit boundaries on mapping writes.
- Reuse shared refusal envelope semantics.

### Framework and Pattern Inputs Loaded

- Playwright config: `playwright.config.ts`.
- Existing ATDD patterns sampled:
  - `tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.atdd.api.spec.ts`
  - `tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.api.spec.ts`
  - `tests/e2e/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.atdd.spec.ts`
  - `tests/e2e/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.spec.ts`
- Existing helpers/fixtures sampled:
  - `tests/support/helpers/apiClient.ts`
  - `tests/support/factories/tenantRepositoryFactory.ts`
  - `tests/support/factories/connectShyftStoryA2Factory.ts`
  - `tests/support/fixtures/connectShyftStoryA2.fixture.ts`
  - `tests/fixtures/test-data.ts`

### TEA Config Flags Read

From `_bmad/tea/config.yaml`:

- `tea_use_playwright_utils: true`
- `tea_browser_automation: auto`

### Knowledge Fragments Applied

Core:

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`

Playwright-utils mode:

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

Automation mode:

- `playwright-cli.md`

Additional scenario fragments loaded for this story:

- `api-testing-patterns.md`
- `fixture-architecture.md`
- `network-first.md`

---

## Step 2 - Generation Mode

Mode selected: **AI generation**.

Reason:

- Acceptance criteria are clear and contract-driven.
- API/UI route shapes are defined in planning artifacts (`/api/v1/connectshyft/numbers`, Numbers & OrgUnit Config screen).
- Red-phase outputs are expectation-driven and do not require live selector recording to proceed.

---

## Step 3 - Test Strategy

### AC-to-Scenario Mapping

**AC1 (multiple valid E.164 mappings per orgUnit):**

- API: create first valid mapping and create second valid mapping under same orgUnit with deterministic read-back. `[P0]`
- API: update existing mapping to a new valid E.164 value. `[P0]`
- E2E: admin can save multiple mappings and table reflects both mappings after each save. `[P0]`

**AC2 (duplicate tenant mapping blocked with actionable validation):**

- API: reject invalid non-E.164 values with explicit field-level validation. `[P0]`
- API: reject duplicate `(tenant_id, twilio_number_e164)` across orgUnits with deterministic refusal payload. `[P0]`
- E2E: duplicate number attempt surfaces inline actionable feedback and blocks persistence. `[P0]`
- E2E: invalid E.164 input stays blocked and does not alter persisted table state. `[P1]`
- API: enforce orgUnit/tenant boundaries on write attempts. `[P1]`

### Test Levels

- API first for uniqueness, validation, and boundary contracts.
- E2E for admin-facing numbers/config workflow and validation UX parity.

### Red Phase Confirmation

All generated tests are intentionally marked with `test.skip()` and assert expected target behavior for later green-phase activation.

---

## Step 4 - Generated Failing Tests (RED)

### API Tests (5)

File:
`tests/api/platform/a-3-orgunit-number-mapping-management.atdd.api.spec.ts`

- `[P0]` multi-number create support per orgUnit
- `[P0]` update path for valid E.164 number mapping
- `[P0]` invalid non-E.164 validation refusal
- `[P0]` duplicate tenant-level number mapping refusal
- `[P1]` tenant/orgUnit boundary enforcement on mapping writes

### E2E Tests (3)

File:
`tests/e2e/platform/a-3-orgunit-number-mapping-management.atdd.spec.ts`

- `[P0]` multi-number mapping UI flow with deterministic table state
- `[P0]` duplicate number validation UX with blocked persistence
- `[P1]` invalid E.164 validation UX with stable form/table state

### Fixture/Data Infrastructure

Updated file:
`tests/fixtures/test-data.ts`

- Added `connectShyftNumberMappingData` for tenant/orgUnit IDs, operator identities, and canonical valid/invalid number fixtures.

New supporting files:

- `tests/support/factories/connectShyftStoryA3Factory.ts`
- `tests/support/fixtures/connectShyftStoryA3.fixture.ts`

### Subprocess Artifact Aggregation

- API subprocess output:
  `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T11-48-54Z.json`
- E2E subprocess output:
  `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T11-48-54Z.json`
- Aggregated summary:
  `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T11-48-54Z.json`

Mirror temp outputs (for subprocess compatibility):

- `/tmp/tea-atdd-api-tests-2026-02-22T11-48-54Z.json`
- `/tmp/tea-atdd-e2e-tests-2026-02-22T11-48-54Z.json`
- `/tmp/tea-atdd-summary-2026-02-22T11-48-54Z.json`

### TDD Red-Phase Validation

- All generated tests include `test.skip()`.
- No placeholder assertions detected.
- Subprocess outputs marked `expected_to_fail: true`.

---

## Step 5 - Validation and Completion

Checklist validation outcome:

- Prerequisites satisfied: yes
- Mandatory policy/workflow guards passed: yes
- Test files created in expected locations: yes
- Red-phase behavior preserved (skipped, expectation-driven tests): yes
- Temp artifacts stored under `_bmad-output/test-artifacts/atdd-temp`: yes
- CLI session cleanup required: no (CLI session was not opened)

### Generated Files

- `tests/api/platform/a-3-orgunit-number-mapping-management.atdd.api.spec.ts`
- `tests/e2e/platform/a-3-orgunit-number-mapping-management.atdd.spec.ts`
- `tests/support/factories/connectShyftStoryA3Factory.ts`
- `tests/support/fixtures/connectShyftStoryA3.fixture.ts`
- `tests/fixtures/test-data.ts`
- `_bmad-output/test-artifacts/atdd-checklist-a-3.md`
- `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T11-48-54Z.json`
- `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T11-48-54Z.json`
- `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T11-48-54Z.json`

### Risks / Assumptions

- Number-mapping API route shape is based on architecture decisions and may be finalized with a different resource path during implementation.
- Refusal codes/messages represent target contract behavior and may be normalized to shared constants during implementation.
- E2E selectors are intentionally target-state selectors for the future admin screen implementation.

### Next Step Recommendation

Proceed to implementation workflow for story `a-3`, then remove `test.skip()` only after number-mapping API and UI behavior is implemented and stable.
