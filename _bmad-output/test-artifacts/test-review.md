---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-03-07'
---

# Test Quality Review: g-4-add-neighbor-and-directory-rebuild

**Quality Score**: 77/100 (C - Acceptable)
**Review Date**: 2026-03-07
**Review Scope**: directory (story artifact with linked test specs)
**Reviewer**: TEA Agent (Murat)

---

Note: This review audits existing tests; it does not generate tests.

## Executive Summary

**Overall Assessment**: Acceptable

**Recommendation**: Request Changes

### Key Strengths

✅ Strong explicit assertion coverage with 152 total `expect(...)` assertions across the reviewed g.4 suite.
✅ No hard waits (`waitForTimeout`) or serial-only blocks were found.
✅ Test IDs and priority markers are consistent (`[G4-...][P0|P1]` + `@P0/@P1`).
✅ Network-first synchronization patterns (`waitForResponse` before action) are used in critical directory-start paths.
✅ Story acceptance criteria AC1-AC5 are covered by at least one active E2E/API test path.

### Key Weaknesses

❌ API ATDD contract tests are fully skipped (`G4-ATDD-API-001..005`), leaving a major enforcement gap in CI.
❌ Time-based seed generation via `Date.now()` introduces non-reproducible test data behavior.
❌ Seeded entities are created in several tests without explicit per-test teardown guarantees.
❌ Two files exceed the preferred 300-line maintainability threshold.
❌ Helper logic is duplicated between g.4 E2E ATDD and automate specs.

### Summary

This review covered story artifact `_bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md` plus four linked test files (2 E2E, 2 API). Test quality is directionally strong on assertions, selector strategy, and network synchronization. However, quality-gate confidence is reduced by one high-impact gap: the ATDD API suite is entirely skipped, which weakens direct CI protection for critical API acceptance behavior.

Risk posture is moderate: no immediate flakiness anti-patterns (hard waits, random calls, serial bottlenecks), but deterministic replay and isolation discipline should be tightened before final sign-off.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes |
| ------------------------------------ | ------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS | 0          | Scenarios follow Given/When/Then structure in test comments and flow |
| Test IDs                             | ✅ PASS | 0          | All tests include story-linked IDs |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0          | All cases are tagged P0/P1 |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0          | No hard waits detected |
| Determinism (no conditionals)        | ⚠️ WARN | 2          | `Date.now()` used for seed values in two automate specs |
| Isolation (cleanup, no shared state) | ⚠️ WARN | 3          | Create/ensure flows seed data without explicit teardown in-file |
| Fixture Patterns                     | ⚠️ WARN | 1          | Shared helper logic duplicated instead of centralized fixture/helper module |
| Data Factories                       | ✅ PASS | 0          | Story factory payload/context utilities used consistently |
| Network-First Pattern                | ✅ PASS | 0          | Response waits are registered before triggering actions |
| Explicit Assertions                  | ✅ PASS | 0          | Assertions remain visible in test bodies |
| Test Length (≤300 lines)             | ⚠️ WARN | 2          | 366-line and 301-line files exceed target size |
| Test Duration (≤1.5 min)             | ⚠️ WARN | 1          | Runtime not measured here; high setup density suggests monitoring needed |
| Flakiness Patterns                   | ⚠️ WARN | 2          | Time-dependent seeds and skipped critical API suite reduce reliability confidence |

**Total Violations**: 0 Critical, 4 High, 6 Medium, 1 Low

---

## Quality Score Breakdown

```text
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -4 × 5 = -20
Medium Violations:       -6 × 2 = -12
Low Violations:          -1 × 1 = -1

Bonus Points:
  Excellent BDD:          +0
  Comprehensive Fixtures: +0
  Data Factories:         +5
  Network-First:          +5
  Perfect Isolation:      +0
  All Test IDs:           +0
                          --------
Total Bonus:              +10

Final Score:              77/100
Grade:                    C
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Unskip the g.4 ATDD API suite to restore CI contract enforcement

**Severity**: P1 (High)
**Location**: `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts:58`
**Criterion**: Coverage
**Knowledge Base**: [test-quality](../../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
All five ATDD API tests are currently `test.skip(...)`. This removes direct CI enforcement for core contract behaviors tied to R-G-004 and can hide regressions that E2E alone may not catch quickly.

**Current Code**:
```typescript
// ⚠️ Could be improved (current implementation)
test.skip(
  '[G4-ATDD-API-001][P0] add-neighbor create contract accepts ... @P0',
  async (...) => { ... }
);
```

**Recommended Improvement**:
```typescript
// ✅ Better approach (recommended)
test(
  '[G4-ATDD-API-001][P0] add-neighbor create contract accepts ... @P0',
  async (...) => { ... }
);
```

**Benefits**:
Restores deterministic API-level protection for acceptance criteria and reduces reliance on broader E2E-only signals.

**Priority**:
P1 because it directly affects quality-gate trust in critical story behavior.

### 2. Replace `Date.now()` seed generation with deterministic fixture-driven seeds

**Severity**: P1 (High)
**Location**: `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.automate.spec.ts:171`, `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.automate.api.spec.ts:126`
**Criterion**: Determinism
**Knowledge Base**: [test-quality](../../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
Time-derived seed values make exact reruns harder to reproduce and reduce deterministic debugging behavior under retries.

**Current Code**:
```typescript
// ⚠️ Could be improved (current implementation)
const seedSuffix = Date.now().toString();
```

**Recommended Improvement**:
```typescript
// ✅ Better approach (recommended)
const seedSuffix = `${test.info().workerIndex}-${test.info().repeatEachIndex}-${scenarioId}`;
```

**Benefits**:
Predictable data generation across reruns and easier triage of failed cases.

**Priority**:
P1 due to direct impact on repeatability and failure diagnosis.

### 3. Add teardown discipline for seeded neighbors/threads

**Severity**: P2 (Medium)
**Location**: `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts:205`, `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.automate.spec.ts:168`
**Criterion**: Isolation
**Knowledge Base**: [data-factories](../../../_bmad/tea/testarch/knowledge/data-factories.md)

**Issue Description**:
Multiple tests create records via API helpers but do not explicitly track/delete created entities in test-local teardown.

**Current Code**:
```typescript
// ⚠️ Could be improved (current implementation)
await createNeighborSeed(request, context, { ... });
```

**Recommended Improvement**:
```typescript
// ✅ Better approach (recommended)
const createdNeighborIds: string[] = [];
afterEach(async ({ request }) => {
  for (const neighborId of createdNeighborIds) {
    await apiRequest(request, { method: 'DELETE', path: `${context.paths.neighborsCollection}/${neighborId}` });
  }
});
```

**Benefits**:
Improves parallel-run safety and reduces environment state buildup.

**Priority**:
P2 because current uniqueness strategy mitigates immediate collisions, but cleanup remains best practice.

### 4. Split oversized specs and centralize duplicated g.4 helper code

**Severity**: P2 (Medium)
**Location**: `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts:1`, `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.automate.api.spec.ts:1`
**Criterion**: Maintainability
**Knowledge Base**: [fixtures-composition](../../../_bmad/tea/testarch/knowledge/fixtures-composition.md)

**Issue Description**:
Two files exceed length guidance and helper functions are duplicated across E2E specs.

**Current Code**:
```typescript
// ⚠️ Could be improved (current implementation)
const buildStoryG4UrlParams = (...) => { ... };
const createNeighborSeed = async (...) => { ... };
```

**Recommended Improvement**:
```typescript
// ✅ Better approach (recommended)
import {
  buildStoryG4AddNeighborUrl,
  buildStoryG4DirectoryUrl,
  createNeighborSeed,
  ensureExistingThreadSeed,
} from '../../support/helpers/connectShyftStoryG4Helpers';
```

**Benefits**:
Lower maintenance overhead, fewer drift bugs, and clearer test intent per file.

**Priority**:
P2 because this impacts long-term quality more than immediate correctness.

---

## Best Practices Found

### 1. Network-first request synchronization before user action

**Location**: `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts:276`
**Pattern**: network-first
**Knowledge Base**: [network-first](../../../_bmad/tea/testarch/knowledge/network-first.md)

**Why This Is Good**:
Response waiter is established before clicking action controls, reducing race conditions.

**Code Example**:
```typescript
const ensureResponse = page.waitForResponse(
  (response) =>
    response.url().includes('/api/v1/connectshyft/threads')
    && response.request().method() === 'POST',
);
await existingCard.getByTestId('connectshyft-directory-start-conversation-action').click();
const ensured = await ensureResponse;
```

**Use as Reference**:
Apply this pattern consistently for all async UI transitions relying on backend side effects.

### 2. Strong explicit assertion style in story-focused checks

**Location**: `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.automate.api.spec.ts:226`
**Pattern**: explicit assertions
**Knowledge Base**: [test-quality](../../../_bmad/tea/testarch/knowledge/test-quality.md)

**Why This Is Good**:
Assertions remain in test bodies and validate key contract fields directly.

**Code Example**:
```typescript
expect(body).toMatchObject({
  ok: true,
  code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
});
expect(body.data?.neighbor?.phones).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ label: 'mobile', isShared: true, isPrimary: true }),
  ]),
);
```

**Use as Reference**:
Keep this explicit assertion style as tests evolve.

---

## Test File Analysis

### File Metadata

- **Scope Files Reviewed**:
  - `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts` (366 lines, 12.85 KB)
  - `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.automate.spec.ts` (292 lines, 10.01 KB)
  - `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts` (272 lines, 10.40 KB)
  - `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.automate.api.spec.ts` (301 lines, 9.59 KB)
- **Test Framework**: Playwright
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4
- **Test Cases (it/test)**: 19 total
- **Skipped Cases**: 5 (`G4-ATDD-API-001..005`)
- **Average File Length**: 307.75 lines per file
- **Factories/Context Utilities**: `createStoryG4Context`, `createStoryG4NeighborCreatePayload`, `createStoryG4ThreadEnsurePayload`

### Test Coverage Scope

- **Priority Distribution**:
  - P0 (Critical): 11 tests
  - P1 (High): 8 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: 152
- **Assertions per Test**: 8.0 (avg)
- **Assertion Types**: status/code checks, URL checks, DOM visibility/content checks, payload shape checks, lifecycle metadata checks

---

## Context and Integration

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md`
- **Test Design**: `_bmad-output/test-artifacts/test-design-epic-G.md`
- **Framework Config**: `playwright.config.ts`

### Acceptance Criteria Validation

| Acceptance Criterion | Test ID(s) | Status | Notes |
| -------------------- | ---------- | ------ | ----- |
| AC1: Add Neighbor supports required field set | G4-ATDD-E2E-001, G4-ATDD-API-001 (skipped) | ✅ Covered (partial API enforcement gap) | E2E active; API ATDD currently skipped |
| AC2: Validation refusal is clear/no partial writes | G4-ATDD-E2E-002, G4-AUTO-API-304, G4-ATDD-API-002 (skipped) | ✅ Covered (partial API enforcement gap) | Active API automate case covers refusal contract |
| AC3: Directory search remains conference-scoped | G4-ATDD-E2E-003, G4-ATDD-API-003 (skipped) | ✅ Covered (partial API enforcement gap) | E2E active; API ATDD skipped |
| AC4: Deterministic ensure open/start behavior | G4-ATDD-E2E-004/005, G4-AUTO-API-301/302, G4-ATDD-API-004/005 (skipped) | ✅ Covered (partial API enforcement gap) | E2E + API automate active |
| AC5: Mobile/tablet layout touch-friendly/context-visible | G4-ATDD-E2E-006 | ✅ Covered | E2E active |

**Coverage**: 5/5 criteria covered (100%), with a major caveat that API ATDD canonical cases are skipped.

---

## Knowledge Base References

This review consulted the following TEA knowledge fragments:

- `test-quality.md`
- `data-factories.md`
- `test-levels-framework.md`
- `selective-testing.md`
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
- `burn-in.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Activate API ATDD g.4 tests**
   - Priority: P1
   - Owner: QA + Backend
   - Estimated Effort: 2-4 hours

2. **Replace Date.now-based seeds with deterministic fixture seeds**
   - Priority: P1
   - Owner: QA
   - Estimated Effort: 1-2 hours

3. **Add cleanup discipline for seeded entities in g.4 suites**
   - Priority: P2
   - Owner: QA
   - Estimated Effort: 2-3 hours

### Follow-up Actions (Future PRs)

1. **Split oversized g.4 specs and extract shared helper module**
   - Priority: P2
   - Target: next_sprint

2. **Track per-file duration in CI and enforce 1.5-minute threshold alerts**
   - Priority: P3
   - Target: backlog

### Re-Review Needed?

⚠️ Re-review after high-priority fixes - request changes, then re-review.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
The test suite demonstrates good engineering hygiene in assertions, selector usage, and network synchronization, but the skipped ATDD API suite creates a material quality-gate gap for critical contract behavior. Because those tests are tagged P0/P1 and map directly to high-risk story outcomes, they should be re-enabled (or replaced with equivalent active contract tests) before final confidence can be granted.

Time-dependent seed generation (`Date.now()`) and limited cleanup discipline are secondary but meaningful reliability concerns. Addressing those changes will improve deterministic reruns and reduce long-run flake risk.

> Test quality is acceptable with 77/100 score, but high-priority coverage and determinism fixes are needed before merge confidence is complete.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| 58 | P1 | Coverage | ATDD API tests are skipped | Unskip or port to active runnable assertions |
| 171 | P1 | Determinism | `Date.now()` used for seeded data | Use deterministic fixture seed helper |
| 126 | P1 | Determinism | `Date.now()` in API automate seed path | Use deterministic fixture seed helper |
| 1 | P1 | Maintainability | ATDD E2E file exceeds 300 lines | Split by behavior area |
| 205 | P2 | Isolation | Seeded neighbors without explicit teardown | Add fixture/local cleanup hooks |
| 168 | P2 | Isolation | API-seeded E2E data lacks teardown | Add teardown tracking/deletion |
| 127 | P2 | Isolation | API seeded entities not explicitly cleaned | Add fixture-managed cleanup |
| 1 | P2 | Maintainability | Automate API file slightly over 300 lines | Split lifecycle vs refusal checks |
| 71 | P2 | Fixture Patterns | Duplicated helper logic across E2E specs | Centralize shared g.4 helpers |
| 57 | P2 | Coverage | API ATDD suite remains RED-placeholder | Promote to runnable green tests |
| 205 | P3 | Performance | Repeated per-test seed overhead | Batch seed setup where safe |

### Related Reviews

| File | Score | Grade | Critical | Status |
| ---- | ----- | ----- | -------- | ------ |
| g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts | 79/100 | C | 0 | Needs follow-up |
| g-4-add-neighbor-and-directory-rebuild.automate.spec.ts | 80/100 | B | 0 | Acceptable |
| g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts | 68/100 | D | 0 | Request changes |
| g-4-add-neighbor-and-directory-rebuild.automate.api.spec.ts | 81/100 | B | 0 | Acceptable |

**Suite Average**: 77/100 (C)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v5.0
**Review ID**: test-review-g-4-add-neighbor-and-directory-rebuild-20260307
**Timestamp**: 2026-03-07 12:06:18
**Version**: 1.0

---

## Feedback on This Review

1. Review TEA patterns in `_bmad/tea/testarch/knowledge/`
2. Consult `_bmad/tea/testarch/tea-index.csv` for deeper guidance
3. Request targeted follow-up on specific violations if needed

This review is guidance, not rigid rules. Context matters; if a deviation is intentional, document it explicitly in test comments and PR notes.
