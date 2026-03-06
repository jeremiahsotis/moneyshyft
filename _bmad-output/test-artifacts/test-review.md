---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-03-06T20:03:56.267Z'
---

# Test Quality Review: g-2-inbox-and-mine-surface-rebuild

**Quality Score**: 75/100 (C - Acceptable)
**Review Date**: 2026-03-06
**Review Scope**: single (story-seeded: 5 related test files)
**Reviewer**: Murat (TEA Agent)

---

Note: This review audits existing tests; it does not generate tests.

## Executive Summary

**Overall Assessment**: Acceptable

**Recommendation**: Request Changes

### Key Strengths

- No hard waits (`waitForTimeout`, `sleep`, `setTimeout`) detected across reviewed files.
- Strong story-level traceability in active g.2 automate suites (`G2-AUTO-E2E-*`, `G2-AUTO-API-*`) with clear P0/P1 labeling.
- Coverage is strong for core g.2 acceptance behaviors: queue card rendering, display-safe copy, deterministic queue search/order, responsive layouts, voicemail ownership, and outbound dispatch contracts.

### Key Weaknesses

- Two story-critical suites are locked to serial mode, reducing isolation confidence and CI throughput.
- Maintainability debt is high: 3 files exceed 300 lines, including one very large route integration suite (1354 lines).
- Negative-path depth is thinner than happy-path depth for outbound dispatch/refusal UX and actor-context malformed variants.

### Summary

The g.2 test surface is functionally strong and meaningfully aligned with story outcomes, but quality is constrained by execution-model and maintainability risks. Serial suite configuration and oversized specs increase long-term flake/perf pressure, while medium-depth negative-path gaps leave some regression exposure.

With targeted fixes, this can move to an approve-with-comments state quickly; for now, request changes is the safer gate decision.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes |
| ------------------------------------ | ------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | WARN    | 63         | Scenario intent is clear, but strict Given/When/Then title format is not consistently used. |
| Test IDs                             | WARN    | 53         | Story IDs are strong in g.2 automate suites; most backend Jest tests lack explicit IDs. |
| Priority Markers (P0/P1/P2/P3)       | WARN    | 53         | Priority markers are present in g.2 automate suites only; backend suites are mostly untagged. |
| Hard Waits (sleep, waitForTimeout)   | PASS    | 0          | No hard wait anti-patterns detected. |
| Determinism (no conditionals)        | WARN    | 4          | Branching on runtime option counts and dynamic timestamp generation introduces small variance. |
| Isolation (cleanup, no shared state) | FAIL    | 3          | Two serial-mode suite constraints plus process-global env mutation risk in route integration tests. |
| Fixture Patterns                     | PASS    | 0          | Story factory/fixture usage is consistent in g.2 automate suites. |
| Data Factories                       | PASS    | 0          | Factory-backed story context pattern is applied (`createStoryG2Context`). |
| Network-First Pattern                | WARN    | 1          | `waitForResponse` usage exists, but limited explicit intercept-before-navigate mocking patterns. |
| Explicit Assertions                  | PASS    | 0          | Assertions are explicit and frequent across suites. |
| Test Length (<=300 lines)            | FAIL    | 3          | Three files exceed the maintainability threshold (350, 715, 1354 lines). |
| Test Duration (<=1.5 min)            | WARN    | 4          | Serial mode and large integration footprint likely increase CI wall-clock time. |
| Flakiness Patterns                   | WARN    | 5          | Serial-mode coupling and runtime-branching patterns increase medium risk. |

**Total Violations**: 0 Critical, 7 High, 10 Medium, 3 Low

---

## Quality Score Breakdown

```text
Weighted Model (Step-03f aggregate):

Determinism (25%):      86 x 0.25 = 21.50
Isolation (25%):        75 x 0.25 = 18.75
Maintainability (20%):  55 x 0.20 = 11.00
Coverage (15%):         88 x 0.15 = 13.20
Performance (15%):      70 x 0.15 = 10.50
                         ------------
Final Score:                         74.95 -> 75/100
Grade:                               C
```

---

## Critical Issues (Must Fix)

No P0 critical issues were detected.

### 1. Serial execution mode in g.2 E2E automate suite

**Severity**: P1 (High)  
**Location**: `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:15`  
**Criterion**: Isolation / Performance  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:  
Suite-level serial mode reduces parallel safety and can mask order coupling.

**Current Code**:

```typescript
test.describe.configure({ mode: 'serial' });
```

**Recommended Fix**:

```typescript
// Prefer default parallel mode
// Keep serial only around explicitly dependent sub-scenarios
```

**Why This Matters**:  
Parallel-safe suites provide better reliability signal and lower CI runtime.

---

### 2. Serial execution mode in g.2 API automate suite

**Severity**: P1 (High)  
**Location**: `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts:60`  
**Criterion**: Isolation / Performance  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:  
API automate suite is forced to serial execution despite largely independent request-level cases.

**Current Code**:

```typescript
test.describe.configure({ mode: 'serial' });
```

**Recommended Fix**:

```typescript
// Remove serial mode and rely on deterministic per-test setup
```

**Why This Matters**:  
Serial mode directly lowers test throughput and can hide isolation defects.

---

### 3. Oversized provider-registry route integration suite

**Severity**: P1 (High)  
**Location**: `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts:115`  
**Criterion**: Maintainability / Performance  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:  
The file is 1354 lines and carries dense mixed concerns (dispatch, webhook correlation, signature, replay behavior).

**Current Code**:

```typescript
describe('connectshyft provider adapter registry route integration', () => {
```

**Recommended Fix**:

```typescript
// Split by concern:
// - provider dispatch routing
// - webhook correlation and conflict handling
// - signature validation
// - replay safety / idempotency
```

**Why This Matters**:  
Large mixed suites slow triage, increase reviewer load, and reduce change isolation.

---

## Recommendations (Should Fix)

### 1. Split runtime-branching E2E paths into dedicated scenarios

**Severity**: P2 (Medium)  
**Location**: `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:149` and `:180`  
**Criterion**: Determinism  
**Knowledge Base**: [timing-debugging.md](../../_bmad/tea/testarch/knowledge/timing-debugging.md)

**Issue Description**:  
Current flow branches on live option count availability.

**Current Code**:

```typescript
if (await messagePhoneOptions.count() > 0) {
```

**Recommended Improvement**:

```typescript
// scenario A: fixture with callable/textable options present
// scenario B: fixture without options present
```

**Benefits**: deterministic single-path tests and clearer failure signal.

---

### 2. Reduce process-global env mutation in route integration tests

**Severity**: P2 (Medium)  
**Location**: `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts:1268`  
**Criterion**: Isolation  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:  
Some cases mutate `process.env` within test flow.

**Current Code**:

```typescript
process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'false';
```

**Recommended Improvement**:

```typescript
// Wrap env overrides in scoped helper with guaranteed restoration
```

**Benefits**: stronger isolation and safer parallelization potential.

---

### 3. Expand negative-path coverage for outbound dispatch UX

**Severity**: P2 (Medium)  
**Location**: `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:127`  
**Criterion**: Coverage  
**Knowledge Base**: [selective-testing.md](../../_bmad/tea/testarch/knowledge/selective-testing.md)

**Issue Description**:  
Outbound positive flows are covered, but refusal/failure UX pathways have less E2E depth.

**Recommended Improvement**:

```typescript
// Add E2E assertions for provider refusal and transient dispatch failure UX states
```

**Benefits**: higher confidence in real-user failure handling.

---

### 4. Add malformed actor-context API variants beyond whitespace user-id

**Severity**: P2 (Medium)  
**Location**: `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts:63`  
**Criterion**: Coverage  
**Knowledge Base**: [api-request.md](../../_bmad/tea/testarch/knowledge/api-request.md)

**Issue Description**:  
Boundary validation exists, but malformed actor-context permutations are limited.

**Recommended Improvement**:

```typescript
// Add variants: missing orgunit, mismatched tenant/orgunit, malformed membership payload
```

**Benefits**: tighter regression protection for access-control edge conditions.

---

## Best Practices Found

### 1. Strong story traceability in active automate tests

**Location**: g.2 automate API/E2E files  
**Pattern**: explicit `G2-AUTO-*` IDs with P0/P1 tags  
**Knowledge Base**: [selective-testing.md](../../_bmad/tea/testarch/knowledge/selective-testing.md)

### 2. Good deterministic wait discipline

**Location**: reviewed files aggregate  
**Pattern**: no hard waits, explicit `waitForResponse` where needed  
**Knowledge Base**: [timing-debugging.md](../../_bmad/tea/testarch/knowledge/timing-debugging.md)

### 3. Strong assertion density in high-risk backend integration surfaces

**Location**: `connectshyft.provider-registry.test.ts` and related suites  
**Pattern**: explicit contract-level `toMatchObject` and refusal metadata checks  
**Knowledge Base**: [test-quality.md](../../_bmad/tea/testarch/knowledge/test-quality.md)

---

## Test File Analysis

### File Metadata

- **Reviewed Files**:
  - `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts`
  - `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts`
  - `apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
  - `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`
- **File Size**: 2872 lines, 94.79 KB (aggregate)
- **Test Frameworks**: Playwright, Jest
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 7
- **Test Cases**: 63
- **Skipped Tests**: 0
- **Average Test Length**: 45.59 lines per test (aggregate)
- **Fixtures/Factories Noted**: `createStoryG2Context`, story fixture wrappers, request/build header helpers

### Test Coverage Scope

- **Story IDs present**: `G2-AUTO-E2E-201..206`, `G2-AUTO-API-301..304`
- **Priority Distribution**:
  - P0 (Critical): 5 tests
  - P1 (High): 5 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown/untagged: 53 tests

### Assertions Analysis

- **Total Assertions**: 249
- **Assertions per Test**: 3.95 (average)
- **Common Assertion Types**: `toBe`, `toEqual`, `toMatchObject`, `toHaveCount`, `toBeVisible`

---

## Context and Integration

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md`
- **Test Design**: `_bmad-output/test-artifacts/test-design-epic-G.md`
- **ATDD Checklist**: `_bmad-output/test-artifacts/atdd-checklist-g-2.md`

### Acceptance Criteria Validation

| Acceptance Criterion | Test IDs | Status | Notes |
| -------------------- | -------- | ------ | ----- |
| AC1 card-level queue row rendering and context pills | `G2-AUTO-E2E-201` | Covered | Includes suppression checks and tap-target behavior. |
| AC2 display-safe volunteer copy (no backend-centric tokens) | `G2-AUTO-E2E-201` | Covered | Validates forbidden token and raw-id suppression. |
| AC3 deterministic ordering and persistent search | `G2-AUTO-E2E-202` | Covered | Verifies queue search persistence and order stability across reload/navigation. |
| AC4 responsive queue/thread behavior by breakpoint | `G2-AUTO-E2E-203` | Covered | Mobile/tablet/desktop layout assertions included. |
| AC5 claimed voicemail remains in Mine with indicator | `G2-AUTO-E2E-204`, `G2-AUTO-API-302` | Covered | E2E and API both assert ownership semantics. |

**Coverage**: 5/5 acceptance criteria covered (100%).

---

## Knowledge Base References

This review consulted the following TEA fragments:

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

---

## Next Steps

### Immediate Actions (Before Merge)

1. Remove serial mode from both g.2 automate suites unless dependency is explicitly justified.
   - Priority: P1
   - Owner: QA / story implementer
   - Estimated Effort: 30-60 minutes

2. Split oversized provider-registry test files into domain-focused suites.
   - Priority: P1
   - Owner: Backend test owners
   - Estimated Effort: 2-4 hours

3. Add negative-flow coverage for outbound refusal/error paths and actor-context malformed variants.
   - Priority: P1
   - Owner: QA + API owners
   - Estimated Effort: 1-2 hours

### Follow-up Actions (Future PRs)

1. Add stable test IDs and priority tags to backend Jest suites for stronger selective execution governance.
   - Priority: P2
   - Target: next sprint

2. Evaluate storage-state login reuse for E2E suite runtime optimization.
   - Priority: P2
   - Target: next sprint

### Re-Review Needed?

Yes. Re-review recommended after P1 actions are addressed.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:

The reviewed g.2 suite has good behavioral coverage and clean hard-wait discipline, but quality gates are held back by serial-mode execution and maintainability overhead from oversized specs. These issues are fixable and localized, but they affect reliability signal and CI efficiency enough to justify a request-changes decision.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:15` | P1 | Isolation/Performance | Serial mode | Remove suite-level serial mode |
| `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts:60` | P1 | Isolation/Performance | Serial mode | Remove suite-level serial mode |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts:115` | P1 | Maintainability | File is 1354 lines | Split by concern |
| `apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts:34` | P1 | Maintainability | File is 715 lines | Split by concern |
| `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:14` | P1 | Maintainability | File is 350 lines | Split by behavior domain |
| `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:149` | P2 | Determinism | Runtime branching by option count | Create deterministic scenario splits |
| `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts:180` | P2 | Determinism | Runtime branching by option count | Create deterministic scenario splits |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts:1268` | P2 | Isolation | Process-global env mutation | Use scoped env override helper |
| `apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts:530` | P3 | Determinism | Dynamic timestamp generation | Prefer fixed timestamps where practical |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts:643` | P3 | Determinism | Dynamic number generation from time | Prefer deterministic unique fixture strategy |

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| ----------- | ----- | ----- | --------------- | ----- |
| 2026-03-06 | 75/100 | C | 0 | New baseline for Story g.2 |

### Related Reviews

| File | Score Impact | Status |
| ---- | ------------ | ------ |
| `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts` | Medium | Needs serial-mode and branching cleanup |
| `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts` | Medium | Needs serial-mode cleanup and extra boundary variants |
| `apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts` | Medium | Needs file-size decomposition |
| `apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts` | Low | Acceptable, minor maintainability debt |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` | High | Needs decomposition and env-scope hardening |

**Suite Average**: 75/100 (C)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0 (step-file architecture)
**Review ID**: test-review-g-2-inbox-and-mine-surface-rebuild-20260306
**Timestamp**: 2026-03-06T20:03:56.267Z
**Version**: 1.0

---

## Workflow Artifacts

- `/tmp/tea-test-review-determinism-2026-03-06T19-56-24-979Z.json`
- `/tmp/tea-test-review-isolation-2026-03-06T19-56-24-979Z.json`
- `/tmp/tea-test-review-maintainability-2026-03-06T19-56-24-979Z.json`
- `/tmp/tea-test-review-coverage-2026-03-06T19-56-24-979Z.json`
- `/tmp/tea-test-review-performance-2026-03-06T19-56-24-979Z.json`
- `/tmp/tea-test-review-summary-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-determinism-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-isolation-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-maintainability-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-coverage-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-performance-2026-03-06T19-56-24-979Z.json`
- `_bmad-output/test-artifacts/test-review-temp/tea-test-review-summary-2026-03-06T19-56-24-979Z.json`
