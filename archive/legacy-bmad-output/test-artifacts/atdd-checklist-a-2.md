---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-22T09:41:26Z'
---

# ATDD Checklist - Epic a, Story 2: Tenant and OrgUnit Context Enforcement for ConnectShyft Routes

**Date:** 2026-02-22
**Author:** Jeremiah
**Primary Test Level:** API + E2E
**Story File:** 
`_bmad-output/implementation-artifacts/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.md`

---

## Step 1 - Preflight & Context

### Mandatory Policy Gates

- `npm run policy:check` passed on branch:
  `codex/story-a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes`
- `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.md` passed.
- Auto-remediation notes:
  - Started from protected `codex/dev` and created story branch.
  - Added required policy-compliant commit subject for this branch: `a-2: ...`.

### Story Inputs Loaded

Acceptance criteria translated from story:

1. For authenticated orgUnit-scoped ConnectShyft endpoints, tenant/orgUnit context must be resolved and validated against caller membership, except tenant-privileged bypass.
2. Missing, invalid, or cross-tenant orgUnit context must be refused with no data leakage.

Constraints captured:

- ConnectShyft routes under `/api/v1/connectshyft/*`.
- Fail-closed context enforcement and deterministic refusal semantics.
- Preserve operator-facing explainability without leaking tenant data.

### Framework and Pattern Inputs Loaded

- Playwright config: `playwright.config.ts`.
- Existing ATDD patterns sampled:
  - `tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.atdd.api.spec.ts`
  - `tests/e2e/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.atdd.spec.ts`
- Existing helpers/fixtures sampled:
  - `tests/support/helpers/apiClient.ts`
  - `tests/support/factories/tenantRepositoryFactory.ts`
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

---

## Step 2 - Generation Mode

Mode selected: **AI generation**.

Reason:

- Acceptance criteria are explicit and contract-oriented.
- Existing ConnectShyft API/E2E test conventions are already established.
- Story scope is context/refusal enforcement; no mandatory live recording was required for selector discovery.

---

## Step 3 - Test Strategy

### AC-to-Scenario Mapping

**AC1 (resolve + validate tenant/orgUnit context with tenant-privileged bypass):**

- API: reject missing orgUnit context on orgUnit-scoped endpoint. `[P0]`
- API: reject invalid orgUnit context values before route materialization. `[P0]`
- API: require orgUnit membership for non-privileged callers. `[P1]`
- API: allow tenant-privileged bypass while preserving canonical context metadata. `[P1]`

**AC2 (refuse missing/invalid/cross-tenant context with no leakage):**

- API: block cross-tenant orgUnit spoof attempts with no thread payload leakage. `[P0]`
- E2E: show explainable refusal state and hide inbox data for missing orgUnit context. `[P0]`
- E2E: show cross-tenant refusal semantics with no visible thread details. `[P1]`
- E2E: show privileged override visibility without crossing tenant boundary. `[P1]`

### Test Levels

- API first for deterministic authorization/context contracts.
- E2E for operator-visible refusal/override behavior.

### Red Phase Confirmation

All generated tests are intentionally marked with `test.skip()` and assert expected target behavior for post-implementation green-phase activation.

---

## Step 4 - Generated Failing Tests (RED)

### API Tests (5)

File:
`tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.api.spec.ts`

- `[P0]` missing orgUnit context refusal
- `[P0]` invalid orgUnit context refusal
- `[P0]` cross-tenant orgUnit spoof refusal + no leakage
- `[P1]` non-privileged membership required refusal
- `[P1]` tenant-privileged bypass success with context metadata

### E2E Tests (3)

File:
`tests/e2e/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.spec.ts`

- `[P0]` missing orgUnit context refusal UI state
- `[P1]` cross-tenant deep-link refusal UI state
- `[P1]` tenant-privileged override visibility state

### Fixture/Data Infrastructure

Updated file:
`tests/fixtures/test-data.ts`

- Added `connectShyftContextEnforcementData` for tenant/orgUnit IDs, user identities, and all-enabled flag set.

### Subprocess Artifact Aggregation

- API subprocess output:
  `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T09-40-07Z.json`
- E2E subprocess output:
  `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T09-40-07Z.json`
- Aggregated summary:
  `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T09-40-07Z.json`

### TDD Red-Phase Validation

- All generated tests include `test.skip()`.
- No placeholder assertions detected.
- All subprocess outputs marked `expected_to_fail: true`.

---

## Step 5 - Validation and Completion

Checklist validation outcome:

- Prerequisites satisfied: yes
- Mandatory policy/workflow guards passed: yes
- Test files created in expected locations: yes
- Red-phase behavior preserved (skipped, expectation-driven tests): yes
- Temp artifacts written under `_bmad-output/test-artifacts/atdd-temp`: yes
- CLI session cleanup required: no (CLI session was not opened)

### Generated Files

- `tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.api.spec.ts`
- `tests/e2e/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.atdd.spec.ts`
- `tests/fixtures/test-data.ts`
- `_bmad-output/test-artifacts/atdd-checklist-a-2.md`
- `_bmad-output/test-artifacts/atdd-temp/api-2026-02-22T09-40-07Z.json`
- `_bmad-output/test-artifacts/atdd-temp/e2e-2026-02-22T09-40-07Z.json`
- `_bmad-output/test-artifacts/atdd-temp/summary-2026-02-22T09-40-07Z.json`

### Risks / Assumptions

- Refusal codes/messages represent target contract behavior and may require exact constant alignment during implementation.
- E2E selectors for context-refusal and privileged-override UI states are intentionally specified as target-state selectors.
- Success-path metadata expectations assume context payload enrichment on ConnectShyft inbox responses.

### Next Step Recommendation

Proceed to implementation workflow for story `a-2`, then remove `test.skip()` only after context enforcement behavior is implemented and stable.
