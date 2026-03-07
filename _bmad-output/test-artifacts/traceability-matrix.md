# Traceability Matrix - Epic G (g-1..g-6)

**Date:** 2026-03-07  
**Evaluator:** Jeremiah (TEA Agent)

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
| --- | ---: | ---: | ---: | --- |
| P0 | 21 | 21 | 100% | PASS |
| P1 | 6 | 6 | 100% | PASS |
| P2 | 0 | 0 | 100% | PASS |
| P3 | 0 | 0 | 100% | PASS |
| **Total** | **27** | **27** | **100%** | **PASS** |

## Traceability Matrix

| Criterion | Story | Priority | Coverage | Mapped Tests |
| --- | --- | --- | --- | --- |
| G1-AC1 | g-1 | P0 | FULL | `G1-ATDD-API-001`, `G1-ATDD-E2E-001`, `G1-AUTO-E2E-201` |
| G1-AC2 | g-1 | P0 | FULL | `G1-ATDD-API-002`, `G1-ATDD-E2E-002`, `G1-AUTO-E2E-201` |
| G1-AC3 | g-1 | P0 | FULL | `G1-ATDD-API-003`, `G1-ATDD-E2E-003`, `G1-AUTO-E2E-203` |
| G1-AC4 | g-1 | P1 | FULL | `G1-ATDD-API-004`, `G1-ATDD-E2E-004`, `G1-AUTO-E2E-202` |
| G2-AC1 | g-2 | P0 | FULL | `G2-ATDD-API-001`, `G2-AUTO-E2E-201`, `GEPIC-AUTO-E2E-301` |
| G2-AC2 | g-2 | P0 | FULL | `G2-ATDD-API-004`, `G2-AUTO-E2E-201`, `GEPIC-AUTO-API-301` |
| G2-AC3 | g-2 | P0 | FULL | `G2-ATDD-API-002`, `G2-AUTO-E2E-202`, `GEPIC-AUTO-E2E-301` |
| G2-AC4 | g-2 | P0 | FULL | `G2-ATDD-E2E-003`, `G2-AUTO-E2E-203`, `GEPIC-AUTO-E2E-302` |
| G2-AC5 | g-2 | P1 | FULL | `G2-ATDD-E2E-004`, `G2-AUTO-API-302`, `G2-AUTO-E2E-204` |
| G3-AC1 | g-3 | P0 | FULL | `7.3-API-001`, `7.3-E2E-001`, `G3-AUTO-E2E-204` |
| G3-AC2 | g-3 | P0 | FULL | `7.3-API-001`, `7.3-E2E-002`, `G3-AUTO-API-203` |
| G3-AC3 | g-3 | P0 | FULL | `7.3-API-002`, `7.3-API-003`, `7.3-API-004`, `7.3-E2E-003` |
| G3-AC4 | g-3 | P1 | FULL | `7.3-API-006`, `7.3-E2E-005`, `G3-AUTO-E2E-202` |
| G3-AC5 | g-3 | P0 | FULL | `7.3-API-007`, `7.3-E2E-006`, `G3-AUTO-API-202` |
| G4-AC1 | g-4 | P0 | FULL | `G4-ATDD-API-001`, `G4-ATDD-E2E-001`, `G4-AUTO-API-303` |
| G4-AC2 | g-4 | P0 | FULL | `G4-ATDD-API-002`, `G4-AUTO-API-304`, `G4-ATDD-E2E-002` |
| G4-AC3 | g-4 | P0 | FULL | `G4-ATDD-API-003`, `G4-ATDD-E2E-003`, `G4-AUTO-E2E-301` |
| G4-AC4 | g-4 | P0 | FULL | `G4-ATDD-API-004`, `G4-ATDD-API-005`, `G4-AUTO-API-301`, `G4-AUTO-API-302`, `G4-ATDD-E2E-004`, `G4-ATDD-E2E-005` |
| G4-AC5 | g-4 | P1 | FULL | `G4-ATDD-E2E-006`, `G4-AUTO-E2E-303`, `G4-AUTO-E2E-304` |
| G5-AC1 | g-5 | P0 | FULL | `G5-ATDD-API-001`, `G5-ATDD-E2E-001`, `G5-AUTO-API-301` |
| G5-AC2 | g-5 | P0 | FULL | `G5-ATDD-API-002`, `G5-ATDD-API-003`, `G5-ATDD-E2E-002`, `G5-AUTO-E2E-301` |
| G5-AC3 | g-5 | P0 | FULL | `G5-ATDD-API-005`, `G5-ATDD-E2E-004`, `G5-AUTO-API-303` |
| G5-AC4 | g-5 | P1 | FULL | `G5-ATDD-E2E-006`, `G5-AUTO-E2E-303`, `GEPIC-AUTO-E2E-302` |
| G6-AC1 | g-6 | P0 | FULL | `G6-ATDD-API-001`, `G6-ATDD-E2E-001`, `GEPIC-AUTO-API-301` |
| G6-AC2 | g-6 | P1 | FULL | `G6-ATDD-API-002`, `G6-ATDD-E2E-002`, `G6-ATDD-E2E-005`, `G6-AUTO-E2E-303` |
| G6-AC3 | g-6 | P0 | FULL | `G6-ATDD-API-003`, `G6-AUTO-API-303`, `G6-ATDD-E2E-003` |
| G6-AC4 | g-6 | P0 | FULL | `G6-ATDD-API-004`, `G6-AUTO-API-304`, `G6-ATDD-E2E-006`, `G6-AUTO-E2E-305` |

## Gap Analysis

- Critical gaps (P0): 0
- High gaps (P1): 0
- Medium gaps (P2): 0
- Low gaps (P3): 0
- Partial/limited coverage items: 0

## Coverage by Test Level

| Test Level | Criteria Covered | Coverage % |
| --- | ---: | ---: |
| E2E | 27 | 100% |
| API | 24 | 89% |
| COMPONENT | 0 | 0% |
| UNIT | 0 | 0% |

## Quality Observations

- Skipped tests detected in g-2 ATDD suites: 8 (`tests/api/platform/g-2-*.atdd.api.spec.ts` + `tests/e2e/platform/g-2-*.atdd.spec.ts`).
- No hard waits (`waitForTimeout` / `sleep`) were detected in Epic G API/E2E suites.
- No `Date.now()` dynamic ID usage was detected in Epic G API/E2E suites.
- Oversized suite (>300 LOC):
  - `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts` (309 LOC)

## Phase 2 Gate Decision

**Decision:** PASS ✅

**Rationale:** P0 coverage is 100% and overall coverage is 100% (target: 90%).

### Recommended Actions
- [MEDIUM] Convert or unskip the remaining g-2 ATDD tests so ATDD and automate lanes both provide active execution signal.
- [LOW] Split `g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts` into smaller suites to stay under the 300 LOC maintainability threshold.
- [LOW] Run a targeted Epic G CI burn-in capture (`scripts/burn-in.sh 10` + `scripts/quality-gates.sh`) before final release sign-off.

## Generated Artifacts

- Coverage matrix JSON: `/tmp/tea-trace-coverage-matrix-2026-03-07T19-06-02Z.json`
- Traceability report: `_bmad-output/test-artifacts/traceability-report.md`
- Matrix document: `_bmad-output/test-artifacts/traceability-matrix.md`
