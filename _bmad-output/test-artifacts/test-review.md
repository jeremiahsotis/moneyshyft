---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-03-06T14:04:26Z'
---

# Test Quality Review: g-1-design-tokens-and-shared-conversation-primitives

**Quality Score**: 77/100 (C - Acceptable)
**Review Date**: 2026-03-06
**Review Scope**: single (story-focused: 4 related spec files)
**Reviewer**: Murat (TEA Agent)

---

Note: This review audits existing tests; it does not generate tests.

## Executive Summary

**Overall Assessment**: Acceptable

**Recommendation**: Request Changes

### Key Strengths

✅ No hard waits, sleep calls, or random/time-based non-determinism detected in reviewed g-1 specs.
✅ Strong use of `data-testid` and aria-label assertions across Inbox/Mine/Thread workflows.
✅ Active E2E/API automate suites verify token usage, primitive rendering, and display-safe copy suppression patterns.

### Key Weaknesses

❌ All four API ATDD tests remain `test.skip`, leaving AC-level API contract checks non-executable.
❌ Two automate suites enforce `serial` mode, reducing throughput and masking order-coupling risk.
❌ Main E2E ATDD file exceeds TEA DoD length guidance and contains fallback-heavy branching that weakens strictness.

### Summary

Story g.1 has meaningful test coverage and good assertion density, but quality is constrained by coverage governance and maintainability debt. The primary concern is not missing test files, but disabled critical API ATDD checks plus serial execution settings that lower confidence in merge-time safety gates.

The suite is close to “approve with comments,” but current skipped API ATDD cases and performance/isolation constraints justify a request for targeted fixes before merge.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes |
| ------------------------------------ | ------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | ⚠️ WARN | 15         | Scenario intent is clear, but strict Given/When/Then title formatting is not used. |
| Test IDs                             | ⚠️ WARN | 15         | Priority tags exist, but structured story-level test IDs are not used. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0          | All test titles carry `@P0` or `@P1`. |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0          | No hard wait anti-patterns found. |
| Determinism (no conditionals)        | ⚠️ WARN | 4          | Core E2E tests use fallback branches that can mask missing primitives. |
| Isolation (cleanup, no shared state) | ⚠️ WARN | 2          | Serial mode suggests avoidable order coupling. |
| Fixture Patterns                     | ✅ PASS | 0          | Story fixture/context patterns are consistent and typed. |
| Data Factories                       | ✅ PASS | 0          | Factory-backed story context is used consistently. |
| Network-First Pattern                | ⚠️ WARN | 1          | No explicit intercept-before-navigate assertions in reviewed g-1 E2E specs. |
| Explicit Assertions                  | ✅ PASS | 0          | Assertions are plentiful and mostly explicit in test bodies. |
| Test Length (≤300 lines)             | ❌ FAIL | 1          | `g-1 ... atdd.spec.ts` is 335 lines. |
| Test Duration (≤1.5 min)             | ⚠️ WARN | 4          | Serial suites + repeated login/navigation loops increase runtime. |
| Flakiness Patterns                   | ⚠️ WARN | 6          | Conditional fallbacks and serial mode create avoidable fragility vectors. |

**Total Violations**: 0 Critical, 7 High, 11 Medium, 4 Low

---

## Quality Score Breakdown

```text
Weighted Model (Step-03f aggregate):

Determinism (25%):      80 × 0.25 = 20.00
Isolation (25%):        92 × 0.25 = 23.00
Maintainability (20%):  66 × 0.20 = 13.20
Coverage (15%):         62 × 0.15 =  9.30
Performance (15%):      76 × 0.15 = 11.40
                         ------------
Final Score:                         76.90 → 77/100
Grade:                               C
```

---

## Critical Issues (Must Fix)

### 1. API ATDD AC coverage is fully skipped

**Severity**: P1 (High)  
**Location**: `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts:80`  
**Criterion**: Coverage  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
All 4 API ATDD scenarios (AC1-AC4) are still `test.skip`, so API-level contract regressions can slip past merge-time execution.

**Current Code**:

```typescript
test.skip('[P0] inbox and thread contracts publish token groups ...', async (...) => {
  ...
});
```

**Recommended Fix**:

```typescript
test('[G1-ATDD-API-001][P0] inbox and thread contracts publish token groups ...', async (...) => {
  ...
});
```

**Why This Matters**:
Skipped AC-level API tests weaken the story's contract-gate reliability and violate the checklist action to remove `test.skip` once implementation lands.

---

### 2. Serial mode is enforced in automate suites without demonstrated dependency

**Severity**: P1 (High)  
**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.spec.ts:78` and `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.api.spec.ts:57`  
**Criterion**: Performance / Isolation  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
Both automate suites use `test.describe.configure({ mode: 'serial' })`, reducing parallelism and confidence in test independence.

**Current Code**:

```typescript
test.describe.configure({ mode: 'serial' });
```

**Recommended Fix**:

```typescript
// default parallel execution
// keep serial only for tightly-coupled scenarios with explicit rationale
```

**Why This Matters**:
Serial gating increases CI wall-clock time and can hide order-related defects that parallel execution would surface.

---

### 3. Main E2E ATDD file exceeds TEA DoD length and contains branch-heavy fallback logic

**Severity**: P1 (High)  
**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts:1`  
**Criterion**: Maintainability / Determinism  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
The file is 335 lines (>300 target) with nested conditional fallbacks in core P0 flows that reduce strictness and readability.

**Current Code**:

```typescript
if ((await page.getByTestId('connectshyft-thread-header').count()) === 0) {
  ...
}
```

**Recommended Fix**:

```typescript
// split by AC and stabilize preconditions
// tokens+primitives spec
// display-safe spec
// responsive spec
```

**Why This Matters**:
Large, branch-heavy tests are harder to diagnose and more likely to produce false confidence when fallback paths pass.

---

## Recommendations (Should Fix)

### 1. Extract duplicated g-1 helper logic across ATDD and automate suites

**Severity**: P2 (Medium)  
**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts:11`, `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.spec.ts:11`  
**Criterion**: Maintainability  
**Knowledge Base**: [fixtures-composition.md](../../_bmad/tea/testarch/knowledge/fixtures-composition.md)

**Issue Description**:
URL builders, CSS readers, and story-context helper logic are repeated, increasing drift risk.

**Recommended Improvement**:
Move shared helpers into `tests/support/helpers/connectshyft-g1.ts` and import from both suites.

---

### 2. Tighten fallback masking for primitive assertions

**Severity**: P2 (Medium)  
**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts:152`  
**Criterion**: Coverage  
**Knowledge Base**: [timing-debugging.md](../../_bmad/tea/testarch/knowledge/timing-debugging.md)

**Issue Description**:
Fallback “surface visible” assertions can pass even when required primitive test IDs are absent.

**Recommended Improvement**:
Fail explicitly when AC-specific primitives are missing, and reserve fallback paths for dedicated resilience tests.

---

### 3. Adopt structured story test IDs in titles

**Severity**: P2 (Medium)  
**Location**: `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts:80`  
**Criterion**: Test IDs / Traceability  
**Knowledge Base**: [selective-testing.md](../../_bmad/tea/testarch/knowledge/selective-testing.md)

**Issue Description**:
Titles only carry priority markers and story text, making long-term cross-artifact traceability harder.

**Recommended Improvement**:
Prefix test names with stable IDs (for example, `G1-ATDD-API-001`, `G1-AUTO-E2E-201`).

---

## Best Practices Found

### 1. Strong selector resilience and accessibility contract usage

**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts`  
**Pattern**: `data-testid` + aria-label assertions  
**Knowledge Base**: [selector-resilience.md](../../_bmad/tea/testarch/knowledge/selector-resilience.md)

**Why This Is Good**:
Selectors are mostly stable and aligned with resilient test-contract guidance.

### 2. No hard waits or random-time anti-patterns

**Location**: all reviewed g-1 specs  
**Pattern**: deterministic timing discipline  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Why This Is Good**:
Avoiding `waitForTimeout`/`sleep` improves flake resistance and runtime efficiency.

### 3. Display-safe suppression assertions are explicit in both E2E and API layers

**Location**: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts:228`, `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.api.spec.ts:163`  
**Pattern**: forbidden token and raw-id suppression checks  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Why This Is Good**:
The tests validate a core volunteer-safety promise directly instead of relying on indirect signals.

---

## Test File Analysis

### File Metadata

- **Reviewed Files**:
  - `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts`
  - `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts`
  - `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.spec.ts`
  - `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.api.spec.ts`
- **File Size**: 1090 lines, 40.05 KB (aggregate)
- **Test Framework**: Playwright
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4
- **Active Test Cases (test)**: 11
- **Skipped Test Cases (test.skip)**: 4
- **Average Test Length**: 99.1 lines per active test
- **Assertions**: 134 total (~12.18 per active test)
- **Data/Test Contract Patterns**: `createStoryG1Context`, typed story fixture (`connectShyftStoryG1.fixture`), `data-testid` usage

### Test Coverage Scope

- **Priority Distribution (all tests)**:
  - P0 (Critical): 8 tests
  - P1 (High): 7 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- Dominant assertions: visibility checks, content suppression checks, contract shape checks (`toMatchObject`), and threshold assertions (`toBeGreaterThanOrEqual`).

---

## Context and Integration

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md`
- **Test Design**: `_bmad-output/test-artifacts/test-design-epic-G.md`
- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-g-1.md`

### Acceptance Criteria Validation

| Acceptance Criterion | Test IDs / Scenarios | Status | Notes |
| -------------------- | -------------------- | ------ | ----- |
| AC1 token contract defined | E2E ATDD P0 #1, API ATDD P0 #1 (skipped), E2E automate P0 #1 | ⚠️ Partial | Behavioral coverage exists, but API ATDD contract lane is skipped. |
| AC2 shared primitives reused | E2E ATDD P0 #2, API ATDD P0 #2 (skipped), E2E automate P0 #1 | ⚠️ Partial | E2E validates primitive presence; API ATDD primitive contract test is skipped. |
| AC3 display-safe suppression | E2E ATDD P0 #3, API ATDD P1 #3 (skipped), API automate P1 #3, E2E automate P1 #3 | ⚠️ Partial | Good active checks, but ATDD API enforcement is disabled. |
| AC4 responsive tokenized behavior | E2E ATDD P1 #4, API ATDD P1 #4 (skipped), E2E automate P1 #2 | ⚠️ Partial | Responsive behavior validated in E2E; API contract lane still skipped. |

**Coverage**: 4/4 ACs behaviorally represented, but 4/4 API ATDD AC checks are skipped.

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)
- [data-factories.md](../../_bmad/tea/testarch/knowledge/data-factories.md)
- [test-levels-framework.md](../../_bmad/tea/testarch/knowledge/test-levels-framework.md)
- [selective-testing.md](../../_bmad/tea/testarch/knowledge/selective-testing.md)
- [test-healing-patterns.md](../../_bmad/tea/testarch/knowledge/test-healing-patterns.md)
- [selector-resilience.md](../../_bmad/tea/testarch/knowledge/selector-resilience.md)
- [timing-debugging.md](../../_bmad/tea/testarch/knowledge/timing-debugging.md)
- [overview.md](../../_bmad/tea/testarch/knowledge/overview.md)
- [api-request.md](../../_bmad/tea/testarch/knowledge/api-request.md)
- [network-recorder.md](../../_bmad/tea/testarch/knowledge/network-recorder.md)
- [auth-session.md](../../_bmad/tea/testarch/knowledge/auth-session.md)
- [intercept-network-call.md](../../_bmad/tea/testarch/knowledge/intercept-network-call.md)
- [recurse.md](../../_bmad/tea/testarch/knowledge/recurse.md)
- [log.md](../../_bmad/tea/testarch/knowledge/log.md)
- [file-utils.md](../../_bmad/tea/testarch/knowledge/file-utils.md)
- [burn-in.md](../../_bmad/tea/testarch/knowledge/burn-in.md)
- [network-error-monitor.md](../../_bmad/tea/testarch/knowledge/network-error-monitor.md)
- [fixtures-composition.md](../../_bmad/tea/testarch/knowledge/fixtures-composition.md)
- [playwright-cli.md](../../_bmad/tea/testarch/knowledge/playwright-cli.md)

See `_bmad/tea/testarch/tea-index.csv` for the full index.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Unskip g-1 API ATDD suite**
   - Priority: P1
   - Owner: QA + API contributors
   - Estimated Effort: 1-2 hours

2. **Remove serial mode from g-1 automate suites (or isolate only required serial sub-blocks)**
   - Priority: P1
   - Owner: QA
   - Estimated Effort: 30-60 minutes

3. **Split oversized g-1 E2E ATDD spec and extract shared helpers**
   - Priority: P1
   - Owner: QA
   - Estimated Effort: 2-4 hours

### Follow-up Actions (Future PRs)

1. **Adopt structured story test IDs across g-1 suites**
   - Priority: P2
   - Target: next sprint

2. **Convert fallback-path assertions into dedicated resilience tests**
   - Priority: P2
   - Target: next sprint

### Re-Review Needed?

⚠️ Re-review required after P1 fixes.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
The g-1 suite has good foundational quality and useful active coverage, but merge readiness is undermined by skipped API ATDD AC checks and unnecessary serial constraints. These issues directly affect coverage confidence and CI behavior, so they should be corrected before approval.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| atdd.api:80 | P1 | Coverage | AC1 API ATDD test skipped | Remove `test.skip`; execute in CI |
| atdd.api:117 | P1 | Coverage | AC2 API ATDD test skipped | Remove `test.skip`; execute in CI |
| atdd.api:162 | P1 | Coverage | AC3 API ATDD test skipped | Remove `test.skip`; execute in CI |
| atdd.api:204 | P1 | Coverage | AC4 API ATDD test skipped | Remove `test.skip`; execute in CI |
| automate.e2e:78 | P1 | Performance/Isolation | Serial suite mode | Remove serial or scope narrowly |
| automate.api:57 | P1 | Performance/Isolation | Serial suite mode | Remove serial or scope narrowly |
| atdd.e2e:1 | P1 | Maintainability | File >300 lines | Split by AC |
| atdd.e2e:152 | P2 | Determinism/Coverage | Primitive checks hidden behind fallback branch | Fail explicitly on missing primitives |
| atdd.e2e:181 | P2 | Maintainability | Nested fallback branching | Stabilize fixtures and split scenarios |
| automate.api:180 | P2 | Coverage | Suppression checks bypassed for empty copy | Require non-empty projection assertion |

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| ----------- | ----- | ----- | --------------- | ----- |
| 2026-03-06 | 77/100 | C | 0 | New baseline for Story g.1 |

### Related Reviews

| File | Status |
| ---- | ------ |
| `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts` | Needs maintainability improvements |
| `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts` | Blocked by skipped tests |
| `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.spec.ts` | Good coverage; remove serial mode |
| `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.api.spec.ts` | Good contracts; remove serial mode |

**Suite Average**: 77/100 (C)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0 (step-file architecture)
**Review ID**: test-review-g-1-design-tokens-and-shared-conversation-primitives-20260306
**Timestamp**: 2026-03-06T14:04:26Z
**Version**: 1.0

---

## Workflow Artifacts

- `/tmp/tea-test-review-determinism-2026-03-06T14-04-26Z.json`
- `/tmp/tea-test-review-isolation-2026-03-06T14-04-26Z.json`
- `/tmp/tea-test-review-maintainability-2026-03-06T14-04-26Z.json`
- `/tmp/tea-test-review-coverage-2026-03-06T14-04-26Z.json`
- `/tmp/tea-test-review-performance-2026-03-06T14-04-26Z.json`
- `/tmp/tea-test-review-summary-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-determinism-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-isolation-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-maintainability-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-coverage-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-performance-2026-03-06T14-04-26Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-summary-2026-03-06T14-04-26Z.json`
