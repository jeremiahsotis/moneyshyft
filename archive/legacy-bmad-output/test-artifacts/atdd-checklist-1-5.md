---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-20T12:59:29Z'
---

# ATDD Checklist - Epic 1, Story 5: Policy Gate and Branch Workflow Guard Enforcement

**Date:** 2026-02-20
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

This story enforces git-policy discipline as a hard delivery invariant by requiring the policy stage to block downstream CI quality lanes and by validating strict branch/workflow alignment for story and epic workflows. The generated ATDD suite defines expected guard behavior and diagnostics before any implementation changes are made.

**As a** maintainer  
**I want** CI and local workflow guards to enforce git policy  
**So that** branch/workflow discipline is mandatory and auditable

---

## Acceptance Criteria

1. Given a pipeline run starts, when policy checks execute, then downstream quality jobs are blocked on policy failure.
2. Branch guard commands validate story/epic workflow branch compliance.

---

## Failing Tests Created (RED Phase)

### E2E Tests (2 tests)

**File:** `tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts` (66 lines)

- ✅ **Test:** `[P1] maintainer journey: local policy and branch guard commands fail fast with actionable diagnostics on branch mismatch @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** End-to-end local maintainer workflow diagnostics for policy + branch guard mismatch paths

- ✅ **Test:** `[P1] maintainer journey: epic workflow guard accepts codex/epic-1-ops and blocks story branch reuse for epic workflows @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** Epic workflow branch pass/fail journey behavior

### API Tests (5 tests)

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts` (153 lines)

- ✅ **Test:** `[P0] blocks downstream CI quality lanes behind a policy-first dependency chain and runs policy:check as the first gate @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** AC1 dependency graph and policy-first ordering

- ✅ **Test:** `[P0] rejects local runs on protected default branches with concrete policy reference and remediation commands @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** AC1 policy diagnostics and remediation quality

- ✅ **Test:** `[P0] enforces story workflow branch alignment for ATDD and reports exact expected branch pattern on mismatch @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** AC2 story workflow branch pattern enforcement

- ✅ **Test:** `[P1] enforces epic workflow branch naming and rejects non-matching epic ops branches @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** AC2 epic workflow branch contract enforcement

- ✅ **Test:** `[P1] blocks story workflows when required --story argument is omitted and returns explicit diagnostics @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected to fail until implementation assertions are made active
  - **Verifies:** Input-guard diagnostics for required story arguments

### Component Tests (0 tests)

**File:** `N/A`

No component-level behaviors are required for this story.

---

## Data Factories Created

### PolicyWorkflowGuardStory15 Context Factory

**File:** `tests/support/factories/policyWorkflowGuardStory15Factory.ts`

**Exports:**

- `createPolicyWorkflowGuardStory15Context(overrides?)` - story-scoped canonical context for policy/workflow guard tests

---

## Fixtures Created

### Story 1.5 Policy/Guard Fixtures

**File:** `tests/support/fixtures/policyWorkflowGuardStory15.fixture.ts`

**Fixtures:**

- `story15Context` - provides centralized test inputs for workflow file, scripts, story id/path, and canonical branch names

---

## Mock Requirements

No external service mocks are required. These tests execute against local file/script harnesses and isolated temporary git repositories.

---

## Required data-testid Attributes

No UI data-testid requirements for this story.

---

## Implementation Checklist

### Test: policy-first CI graph and policy:check-first enforcement

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`

- [ ] Keep `policy` as first blocking CI job in `.github/workflows/test.yml`
- [ ] Preserve `needs: policy` on lint and downstream dependency chain (`lint -> test -> burn-in -> quality-gates`)
- [ ] Preserve `npm run policy:check` in policy job
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: policy diagnostics and remediation output quality

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`

- [ ] Ensure `scripts/enforce-git-policy.sh` emits policy path and remediation commands on local default-branch failure
- [ ] Ensure failure headline remains explicit and actionable
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: story workflow branch pattern guard

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`

- [ ] Keep `scripts/branch-ensure-workflow.sh` story pattern: `codex/story-{storyId}-<slug>`
- [ ] Keep mismatch diagnostics with current branch and expected pattern
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: epic workflow branch guard

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`

- [ ] Keep epic branch requirement: `codex/epic-{epic}-ops`
- [ ] Keep mismatch diagnostics for epic workflows
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: missing --story argument guard behavior

**File:** `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`

- [ ] Keep mandatory `--story` requirement for story workflows
- [ ] Keep explicit `Story workflow requires --story` diagnostic
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.25 hours

### Test: local maintainer mismatch journey behavior

**File:** `tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts`

- [ ] Keep fail-fast mismatch behavior across policy + branch guard commands
- [ ] Keep actionable diagnostics and branch context in combined journey
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: epic maintainer workflow journey behavior

**File:** `tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts`

- [ ] Keep epic happy path on `codex/epic-1-ops`
- [ ] Keep epic guard failure when a story branch is reused for epic workflow
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts

# Run specific API file
npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts

# Run specific E2E file
npm run test:e2e -- tests/e2e/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.spec.ts

# Headed mode
npm run test:e2e -- --headed tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts

# Debug mode
npm run test:e2e -- --debug tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.atdd.api.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing (skipped) ATDD tests generated for AC1 and AC2
- ✅ Story-specific fixture + factory created
- ✅ Branch guard temp-repo harness created for isolated branch/workflow checks
- ✅ Implementation checklist created

### GREEN Phase (DEV Team - Next Steps)

1. Remove `test.skip()` from the highest-priority P0 tests first.
2. Run the specific file and make implementation changes until tests pass.
3. Progress from P0 to P1 coverage.

### REFACTOR Phase

- Consolidate any duplicated harness behavior into shared utilities if new stories reuse the same patterns.
- Keep diagnostics stable while reducing script complexity.

