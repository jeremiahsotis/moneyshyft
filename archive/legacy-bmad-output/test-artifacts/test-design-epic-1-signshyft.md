---
stepsCompleted: ['step-01-detect-mode','step-02-load-context','step-03-risk-and-testability','step-04-coverage-plan','step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-03-03'
---

# Test Design: Epic 1 - SignShyft Lane Governance and Platform Skeleton

**Date:** 2026-03-03  
**Author:** Jeremiah / TEA  
**Status:** Draft  
**Scope:** Epic-level test design for SignShyft lane Epic 1 (`1.1`-`1.4`).

## Executive Summary

- Total risks identified: 10
- High-priority risks (score >= 6): 8
- Critical categories: SEC, DATA, TECH, OPS
- Coverage focus: lane isolation, API/plugin skeleton contracts, refusal determinism, and staff/signer context separation.

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Epics 2-7 feature delivery (templates, rendering engine, envelope/finalization/webhooks, ops) | Epic 1 only establishes foundational lane and contract scaffolding | Execute separate test-design workflows per epic before implementation |
| Full webhook retry/signature runtime behavior | Webhook delivery/security execution is primarily Epic 6 scope | Carry only baseline plugin/contract checks in Epic 1 |
| Multi-region, alternate storage backends, HA | Explicit v1 non-goals and outside Epic 1 acceptance criteria | Track as future architecture/NFR scope |
| RouteShyft/ConnectShyft feature behavior changes | SignShyft lane must be additive and non-interfering | Keep policy/lane gates as blockers and run cross-lane regression checks |

## Risk Assessment

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SS-R-001 | OPS | SignShyft lane metadata/filename drift breaks policy gates and causes cross-lane interference | 2 | 3 | 6 | Enforce `project_lane: signshyft` and lane-token filename checks via policy scripts in CI and pre-merge runs | Platform Governance + QA | Story 1.1 |
| SS-R-002 | SEC | Tenant/auth plugin chain omissions allow requests to execute without canonical tenant context | 3 | 3 | 9 | Gate plugin registration order and enforce negative tests for missing/spoofed tenant context | Backend + QA | Story 1.2 |
| SS-R-003 | TECH | Plugin registration order drift bypasses refusal/RLS/rate-limit assumptions | 2 | 3 | 6 | Add startup order assertions and smoke contracts on registered decorators/hooks | Backend | Story 1.2 |
| SS-R-004 | BUS | Business refusal transport drifts from HTTP 200 canonical contract and breaks UI/integration handling | 3 | 2 | 6 | Centralize refusal serializer and enforce API contract tests on representative endpoints | Backend + QA | Story 1.2-1.4 |
| SS-R-005 | DATA | DB session context (`app.tenant_id`, `app.actor_role`, `app.actor_id`) not initialized before tenant-scoped operations | 2 | 3 | 6 | Add transaction/session-context tests and fail-fast guard in request lifecycle | Backend | Story 1.2 |
| SS-R-006 | SEC | Staff/signer route-guard separation fails and exposes privileged views or signer-token flows | 2 | 3 | 6 | Add route matrix tests (staff token on signer path and vice versa) and explicit deny states | Frontend + QA | Story 1.3 |
| SS-R-007 | TECH | Canonical refusal reason enum drifts across API and client helpers (ad-hoc string usage) | 3 | 2 | 6 | Use one shared refusal source-of-truth and compile/test-time unknown-reason rejection | Backend + Frontend | Story 1.4 |
| SS-R-008 | OPS | No SignShyft-specific automated baseline exists, increasing regression escape during early implementation | 3 | 2 | 6 | Create Story 1.x API/E2E suite baseline before broad feature expansion | QA | Story 1.2-1.4 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SS-R-009 | TECH | New `apps/signshyft-*` workspace scaffolding drifts from existing build/test conventions | 2 | 2 | 4 | Add bootstrap smoke scripts and CI entry checks for new app roots | Platform + QA |
| SS-R-010 | BUS | Refusal reason copy mismatch across staff/signer surfaces causes operator confusion | 2 | 2 | 4 | Add client normalization mapping tests and copy parity checks | Frontend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| SS-R-011 | OPS | Placeholder refusal renderer visual polish gaps in non-critical states | 1 | 2 | 2 | Monitor |
| SS-R-012 | PERF | Early shell-route load variance during local dev bootstrap | 1 | 1 | 1 | Monitor |

### Risk Category Legend

- **TECH**: Technical/Architecture
- **SEC**: Security
- **PERF**: Performance
- **DATA**: Data Integrity
- **BUS**: Business Impact
- **OPS**: Operations

## Entry Criteria

- [ ] Epic 1 SignShyft stories (`1.1`-`1.4`) are available with accepted ACs.
- [ ] SignShyft sprint status file exists and reflects current story states.
- [ ] Policy guard commands are runnable (`policy:check`, lane enforcement, workflow branch guard).
- [ ] Target test environment can run SignShyft API and web shell scaffolds.
- [ ] Canonical refusal reason list and OpenAPI refusal schema are accessible to test authors.

## Exit Criteria

- [ ] All P0 tests pass (100%).
- [ ] P1 pass rate >=95% (or explicitly accepted waivers).
- [ ] High-risk items SS-R-001 through SS-R-008 have verified mitigations or approved waivers.
- [ ] SignShyft-specific automated baseline exists for Stories 1.2-1.4.
- [ ] Lane non-interference guardrails remain green.

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 indicate priority/risk, not execution timing.

### P0 (Critical)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| SS-P0-001 | SignShyft planning artifacts must include lane metadata and lane-token filenames | CI/Contract | SS-R-001 | Validate FR-SS-050/051 |
| SS-P0-002 | SignShyft sprint status isolation file is present and lane-tagged | CI/Contract | SS-R-001 | Validate FR-SS-053 |
| SS-P0-003 | `GET /public/health` returns deterministic healthy contract | API | SS-R-003 | Story 1.2 AC1 |
| SS-P0-004 | Required plugin chain registers in canonical order | API/Integration | SS-R-002, SS-R-003 | Story 1.2 AC2 |
| SS-P0-005 | Business refusals always return HTTP 200 with canonical payload shape | API | SS-R-004 | Story 1.2/1.4 AC2 |
| SS-P0-006 | Request lifecycle sets DB session context values before tenant-scoped operations | API/Integration | SS-R-005 | Story 1.2 AC4 |
| SS-P0-007 | Staff route group denies signer-token context and missing staff auth | E2E | SS-R-006 | Story 1.3 AC2 |
| SS-P0-008 | Signer route group denies staff-auth context and invalid signer token | E2E | SS-R-006 | Story 1.3 AC2 |
| SS-P0-009 | Canonical refusal reason enum accepts only locked values | Unit/API | SS-R-007 | Story 1.4 AC1 |
| SS-P0-010 | Client refusal normalization uses reason code semantics, not HTTP status | Component/E2E | SS-R-004, SS-R-010 | Story 1.4 AC3 |

Estimated P0 effort: ~18-30 hours

### P1 (High)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| SS-P1-001 | Lane policy check fails when SignShyft artifact metadata/token is missing | CI/Contract | SS-R-001 | Negative governance path |
| SS-P1-002 | Plugin decorators/hooks are available after bootstrap and route registration | API | SS-R-003 | Startup integrity |
| SS-P1-003 | Missing tenant/auth context produces canonical refusal rather than non-deterministic 500s | API | SS-R-002, SS-R-004 | Security + contract check |
| SS-P1-004 | Placeholder refusal renderer shows canonical reason families for staff and signer surfaces | Component/E2E | SS-R-010 | Story 1.3 AC3 |
| SS-P1-005 | Unknown refusal reason fails closed with safe fallback and telemetry marker | Component/Unit | SS-R-007 | Story 1.4 AC3 |
| SS-P1-006 | Refusal fixture matrix covers template/version/upload/signer/core refusal families | API/Contract | SS-R-007, SS-R-008 | Story 1.4 fixtures |
| SS-P1-007 | New `apps/signshyft-api` and `apps/signshyft-web` roots pass bootstrap/build smoke checks | CI/Contract | SS-R-009 | Workspace readiness |
| SS-P1-008 | Branch/workflow guard contracts validate SignShyft story branch naming/usage | CI/Contract | SS-R-001 | Policy-first delivery |

Estimated P1 effort: ~14-24 hours

### P2 (Medium)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| SS-P2-001 | Route fallback behavior remains deterministic for unknown staff/signer paths | E2E | SS-R-006, SS-R-010 | UX hardening |
| SS-P2-002 | Refusal payload optional fields (`field`, `details`) are serialized consistently | API | SS-R-004 | Schema consistency |
| SS-P2-003 | Policy checks confirm non-SignShyft lanes are unmodified by SignShyft story changes | CI/Contract | SS-R-001 | Non-interference |
| SS-P2-004 | Initial SignShyft suite tagging (`@P0/@P1`) supports selective execution in CI | CI/Contract | SS-R-008 | Suite operability |

Estimated P2 effort: ~6-14 hours

### P3 (Low)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| SS-P3-001 | Exploratory refusal-copy clarity checks on mobile signer surfaces | Exploratory | SS-R-010 | Non-blocking polish |
| SS-P3-002 | Bootstrap resilience checks under repeated local restarts | Integration Burn-in | SS-R-009 | Optional confidence depth |

Estimated P3 effort: ~2-6 hours

## Execution Strategy

- **PR lane (~10-15 min target):** Run all functional P0 and P1 checks plus fast P2 contract checks.
- **Nightly lane (~30-60 min):** Run full P2 matrix and extended fixture/contract validation.
- **Weekly lane (long-running):** Run P3 exploratory/burn-in checks and additional policy drift diagnostics.
- **Philosophy:** keep functional coverage in PR by default; defer only expensive/long-running checks.

## Resource Estimates

| Priority | Scenario Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~10 | ~18-30 hours | Core governance + security contracts |
| P1 | ~8 | ~14-24 hours | Determinism and operability depth |
| P2 | ~4 | ~6-14 hours | Edge hardening + CI controls |
| P3 | ~2 | ~2-6 hours | Exploratory confidence |
| **Total** | **~24** | **~40-74 hours** | **~1-2 weeks (single QA engineer)** |

## Quality Gate Criteria

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigations:** SS-R-001 through SS-R-008 complete or formally waived
- **Coverage target:** >=80% of planned Epic 1 automated scenarios
- **Security invariant:** tenant/auth context and refusal contract checks pass with no open high-severity findings

## Mitigation Plans

### SS-R-002: Tenant/auth plugin chain omissions (Score: 9)

- **Mitigation Strategy:**
  1. Assert canonical plugin registration order in bootstrap tests.
  2. Add negative API tests for missing tenant/auth context.
  3. Block merge if required plugin decorators/hooks are absent.
- **Owner:** Backend + QA
- **Timeline:** Story 1.2
- **Status:** Planned
- **Verification:** API suite and startup contract checks green in PR.

### SS-R-004: Business refusal transport drift (Score: 6)

- **Mitigation Strategy:**
  1. Centralize refusal serialization helper and ban route-local variants.
  2. Add contract tests proving HTTP 200 + canonical refusal shape.
  3. Add client normalization tests that key on `reason`, not transport code.
- **Owner:** Backend + Frontend + QA
- **Timeline:** Stories 1.2-1.4
- **Status:** Planned
- **Verification:** API and client contract suites green with fixture coverage.

## Assumptions and Dependencies

### Assumptions

1. SignShyft Epic 1 scope remains limited to Stories 1.1-1.4 in current planning artifacts.
2. Canonical refusal reason list remains locked for this epic.
3. SignShyft implementation stays lane-isolated under `apps/signshyft-*` without cross-lane runtime coupling.

### Dependencies

1. `_bmad-output/implementation-artifacts/1-2-create-signshyft-api-skeleton-with-required-plugins.md` (required for core API skeleton validation)
2. `_bmad-output/implementation-artifacts/1-3-create-signshyft-web-shell-for-staff-and-signer-route-groups.md` (required for route guard and refusal UX checks)
3. `_bmad-output/implementation-artifacts/1-4-implement-canonical-refusal-reasons-and-api-contract-fixtures.md` (required for refusal contract determinism)
4. `docs/policies/git_policy.md` and policy scripts (required for lane and workflow guard checks)

### Risks to Plan

- **Risk:** Existing test tree has no SignShyft-specific files yet.
  - **Impact:** Early regressions can escape without intentional baseline creation.
  - **Contingency:** Treat SS-P0 baseline creation as merge-blocking work for Stories 1.2-1.4.

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| Policy and lane-enforcement scripts | Epic 1 depends on lane-safe artifact governance | Run policy/lane checks on every PR |
| Existing platform test suites (`tests/api/platform`, `tests/e2e/platform`) | Must remain unaffected by SignShyft lane setup | Run targeted platform smoke/regression checks before merge |
| Future `apps/signshyft-api` bootstrap | Establishes required plugin contract for later epics | Re-run API skeleton and plugin order tests |
| Future `apps/signshyft-web` route shell | Defines staff/signer context boundary for signer flow epics | Re-run route guard and refusal renderer tests |

## Appendix A: Code Examples & Tagging

```typescript
import { test, expect } from '@playwright/test';

test('@P0 @API refusal contract remains canonical', async ({ request }) => {
  const response = await request.post('/api/v1/signshyft/staff/template-versions/immutable/patch', {
    data: { name: 'blocked-edit' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(typeof body.reason).toBe('string');
});
```

```bash
# P0 only
npx playwright test --grep @P0

# P0 + P1
npx playwright test --grep "@P0|@P1"
```

## Appendix B: Knowledge Base References

- `risk-governance.md`
- `probability-impact.md`
- `test-levels-framework.md`
- `test-priorities-matrix.md`
- `playwright-cli.md`

## References

- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics-signshyft-2026-03-03.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/architecture-signshyft-2026-03-03.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/1-1-establish-signshyft-lane-scaffolding-and-policy-wiring.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/1-2-create-signshyft-api-skeleton-with-required-plugins.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/1-3-create-signshyft-web-shell-for-staff-and-signer-route-groups.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/1-4-implement-canonical-refusal-reasons-and-api-contract-fixtures.md`
- `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/sprint-status-signshyft.yaml`

**Generated by:** BMad TEA Agent  
**Workflow:** `_bmad/tea/workflows/testarch/test-design`  
**Mode:** Epic-level  
**Epic Selector:** `1-signshyft`
