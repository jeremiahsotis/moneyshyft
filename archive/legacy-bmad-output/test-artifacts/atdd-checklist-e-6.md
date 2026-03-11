---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-04'
---

# ATDD Checklist - Epic e, Story 6: Parallel Delivery Safety Gates for ConnectShyft Rollout

**Date:** 2026-03-04
**Author:** Jeremiah
**Primary Test Level:** API
**Generation Mode:** AI generation (no browser recording)
**Story File:** `_bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md`

---

## Story Summary

This story hardens ConnectShyft release safety by requiring policy-first CI execution, deterministic guardrail failures for boundary/provider bypasses, and merge-time completion of both RouteShyft regression and ConnectShyft quality lanes. It also requires rollout controls (feature-flag and provider allow-list) plus explicit rollback documentation to remain current and verifiable.

**As a** release maintainer  
**I want** policy and regression gates enforced for ConnectShyft pull requests  
**So that** ConnectShyft can ship in parallel with RouteShyft without cross-module regressions

---

## Acceptance Criteria

1. Given a ConnectShyft branch or pull request pipeline, when CI executes, then `npm run policy:check` runs as the first blocking gate.
2. Given ConnectShyft code changes introduce route/connectshyft direct import-boundary violations or provider-coupled bypass paths, when policy checks run, then CI blocks the change deterministically.
3. Given ConnectShyft pull requests are evaluated, when CI completes, then RouteShyft regression lanes and ConnectShyft-targeted quality gates both pass before merge.
4. Given rollout controls are evaluated for production enablement, when release criteria are applied, then feature-flag/allow-list controls and explicit rollback path documentation remain current and testable.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts` (186 lines)

- ✅ **[E6-ATDD-API-001][P0]** ConnectShyft CI executes `npm run policy:check` as the first blocking gate before lint/test quality stages
  - **Status:** RED (intentionally skipped with `test.skip()` until implementation aligns)
  - **Verifies:** AC1 policy-first CI ordering contract.
- ✅ **[E6-ATDD-API-002][P0]** policy checks block provider-coupled bypass paths and route/connectshyft boundary violations deterministically
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC2 deterministic guardrail failure behavior.
- ✅ **[E6-ATDD-API-003][P0]** merge gating enforces both RouteShyft regression lane completion and ConnectShyft quality gates before release-readiness turns ready
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC3 cross-lane merge-blocking contract.
- ✅ **[E6-ATDD-API-004][P1]** rollout controls keep feature-flag allow-list gates explicit and rollback playbooks current and testable
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC4 rollout + rollback operability contract.

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts` (107 lines)

- ✅ **[E6-ATDD-E2E-001][P1]** maintainer journey fails fast on protected branches and provides story-branch remediation plus workflow-guard diagnostics
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC1/AC2 operator diagnostics workflow.
- ✅ **[E6-ATDD-E2E-002][P0]** release-readiness summary blocks merge when ConnectShyft quality gates or RouteShyft regression lane are incomplete
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC3 release-readiness merge safety behavior.
- ✅ **[E6-ATDD-E2E-003][P1]** operator release-playbook journey keeps allow-list controls and rollback references synchronized across deployment docs and provider rollout contracts
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC4 operational readiness documentation + control alignment.

### Component Tests (0 tests)

No component-level tests were generated for this CI/policy/release-governance story.

---

## Data Factories Created

### ConnectShyft Story E6 Factory

**File:** `tests/support/factories/connectShyftStoryE6Factory.ts`

**Exports:**

- `createStoryE6Context(overrides?)` - story-specific policy/CI/deployment context for deterministic ATDD guard coverage.

---

## Fixtures Created

### ConnectShyft Story E6 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryE6.fixture.ts`

**Fixtures:**

- `storyE6Context` - scoped Story e.6 test context (workflow paths, policy scripts, deployment docs, and story metadata).

---

## Mock Requirements

### Policy Harness Failure Injection

**Target:** `scripts/enforce-git-policy.sh` via `runPolicyScriptInTempRepo`

- Seed provider-coupling violations under `src/src/modules/connectshyft/` to assert deterministic policy blocking.
- Seed route/connectshyft boundary-leak imports to assert deterministic boundary guard blocking.

### Branch Guard Failure Injection

**Target:** `scripts/branch-ensure-workflow.sh` via `runBranchWorkflowGuardInTempRepo`

- Use mismatched story branch to verify exact expected branch pattern diagnostics for `e-6` and lane token `connectshyft`.

### CI Graph Contract Verification

**Target:** `.github/workflows/test.yml` and `.github/workflows/burn-in.yml`

- Validate policy-first job ordering and merge-blocking dependencies for quality and regression lanes.

---

## Required `data-testid` Attributes

This story is CI/release-governance focused and does not require new UI `data-testid` contracts.

---

## Implementation Checklist

### Test: [E6-ATDD-API-001][P0]

**File:** `tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts`

- [ ] Ensure `policy` remains the first blocking CI gate and executes `npm run policy:check`.
- [ ] Keep downstream CI graph dependencies (`lint` <- `policy`, `test` <- `lint`, `quality-gates` <- `test`) deterministic.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-API-002][P0]

**File:** `tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts`

- [ ] Enforce deterministic blocking for direct provider coupling outside approved adapter contracts.
- [ ] Enforce deterministic blocking for route/connectshyft direct boundary import leaks.
- [ ] Emit actionable diagnostics in policy output for both violation classes.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-API-003][P0]

**File:** `tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts`

- [ ] Require RouteShyft regression lane completion in merge-readiness computation.
- [ ] Require ConnectShyft quality gates to pass before release-readiness becomes `ready`.
- [ ] Keep report-stage blocker summaries explicit for operator actionability.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-API-004][P1]

**File:** `tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts`

- [ ] Keep rollout allow-list controls explicit and fail-closed when invalid.
- [ ] Maintain provider-registry coverage for allow-list include/exclude behavior.
- [ ] Keep deployment rollback docs synchronized with release workflow references.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-E2E-001][P1]

**File:** `tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts`

- [ ] Preserve actionable branch-first policy diagnostics for protected branch execution.
- [ ] Preserve actionable branch-workflow guard diagnostics for story mismatch.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-E2E-002][P0]

**File:** `tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts`

- [ ] Ensure release-readiness summary blocks include RouteShyft regression lane when incomplete.
- [ ] Ensure release-readiness summary blocks include ConnectShyft quality gate failures.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E6-ATDD-E2E-003][P1]

**File:** `tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts`

- [ ] Keep deployment quick-rollback guidance and detailed rollback runbook aligned.
- [ ] Keep provider allow-list controls documented and verifiable in rollout contract code.
- [ ] Remove `test.skip()` and run targeted test.

---

## Running Tests

```bash
# Run story-specific API + E2E files
npx playwright test tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts

# Run only API story file
npx playwright test tests/api/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.api.spec.ts

# Run only E2E story file
npx playwright test tests/e2e/platform/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.atdd.spec.ts
```

---

## Validation Notes

- Mandatory policy gate execution completed before ATDD generation:
  - `npm run policy:check` (passed after branch auto-remediation)
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md` (passed)
- Branch auto-remediation applied from protected default branch to story branch:
  - `npm run start:story-branch -- e-6 parallel-delivery-safety-gates-for-connectshyft-rollout`
- All generated tests are red-phase by design via `test.skip()`.
- No Playwright CLI/MCP browser recording session was opened for this story.
- Temporary ATDD JSON artifacts were saved under `_bmad-output/test-artifacts/`.

---

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
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
- `playwright-cli.md`

---

## Next Steps

1. Implement the missing merge-blocking regression dependency for RouteShyft lane status in release-readiness and quality-gate dependencies.
2. Implement or wire deterministic route/connectshyft boundary violation enforcement in policy gates.
3. Remove `test.skip()` incrementally per scenario and run these story tests to progress from red to green.
4. Continue with the dev-story workflow for e.6 implementation and code review.
