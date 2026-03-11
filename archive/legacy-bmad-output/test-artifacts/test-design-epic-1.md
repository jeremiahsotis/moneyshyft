---
stepsCompleted: ['step-01-detect-mode','step-02-load-context','step-03-risk-and-testability','step-04-coverage-plan','step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-19'
---

# Test Design: Epic 1 - Platform Kernel and Tenant Access Foundations

**Date:** 2026-02-19
**Author:** Master Test Architect
**Status:** Draft
**Scope:** Epic-level test design for Stories 1.1-1.6 (tenant context, entitlement governance, auth/session+CSRF, envelope contract, policy guards, security/redaction verification).

## Executive Summary

- Total risks identified: 9
- High-priority risks (score >=6): 8
- Critical categories: SEC, DATA, TECH, OPS
- Coverage focus: tenant/orgUnit isolation, privileged-access boundaries, CSRF/auth/session correctness, envelope consistency, policy gate discipline, and sensitive-data redaction guarantees.

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Route intake/dispatch/driver domain workflows (Epic 2+) | Epic 1 is platform access and security foundation only | Keep downstream epics blocked on Epic 1 gates where dependencies exist |
| ConnectShyft Epic 1 track | Separate planning stream with its own story set | Re-run `test-design` with explicit ConnectShyft epic selection when needed |
| Cross-tenant federation and consent-layer expansion | Deferred by PRD/policy constraints | Maintain fail-closed scoping and feature-flag restrictions |

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | DATA | Tenant scope leakage from mixed default scope columns (`household_id` vs `tenant_id`) during migrations/adoption | 2 | 3 | 6 | Standardize scope helpers with explicit aggregate column mapping; enforce with cross-tenant contract tests | Platform Backend | Story 1.1 |
| R-002 | SEC | OrgUnit membership bypass if tenant-level capability bypass is broader than intended | 2 | 3 | 6 | Restrict bypass semantics to explicitly approved privileged capabilities and add negative matrix tests | Security + Platform Backend | Story 1.1/1.2 |
| R-003 | SEC | Initial `TENANT_ADMIN` assignment policy regression for non-system actors | 2 | 3 | 6 | Add explicit API contract tests and enforcement checks for initial tenant-admin assignment paths | Platform Backend + QA | Story 1.2 |
| R-004 | SEC | CSRF enforcement depth gap across all authenticated state-changing routes | 2 | 3 | 6 | Run full route inventory matrix (missing/invalid/valid CSRF token behavior) | Security + QA | Story 1.3/1.6 |
| R-005 | TECH | Shared API envelope drift from ad-hoc route responses | 3 | 2 | 6 | Migrate to shared helpers and add anti-drift checks for non-envelope responses | Platform Backend | Story 1.4 |
| R-006 | SEC | Sensitive-field redaction gap in logs/event payloads | 2 | 3 | 6 | Centralize redaction policy and add deterministic log/event redaction tests | Security + Platform Backend | Story 1.6 |
| R-008 | OPS | Epic 1 readiness risk from missing dedicated Story 1.x API/E2E suite baseline | 3 | 2 | 6 | Build story-aligned API-first suites and triage/replace skipped legacy coverage | QA | Story 1.1-1.6 |
| R-009 | SEC | Unsafe default secret fallback risk (JWT/DB) when production hardening is missed | 2 | 3 | 6 | Add production startup fail-fast config checks and CI security config tests | Security + Platform Ops | Story 1.6 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-007 | OPS | Policy/branch guard bypass in manual local workflows if guard commands are not invoked | 1 | 3 | 3 | Keep policy stage first in CI, and enforce guard command usage in workflow scripts/templates | DevEx + Maintainers |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| None | - | No low-priority risks retained after consolidation | - | - | - | Monitor via regression reviews |

## Entry Criteria

- [ ] Stories 1.1 through 1.6 exist in `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/` and are `ready-for-dev`
- [ ] Tenant/orgUnit seed and cleanup fixtures are available for parallel-safe test execution
- [ ] CI policy gate and branch guard commands are active and runnable in local/PR contexts
- [ ] Auth/session test environment configured (cookie/CSRF behavior validated per environment profile)
- [ ] Security redaction policy definition available for deterministic assertions

## Exit Criteria

- [ ] All P0 scenarios pass at 100%
- [ ] P1 pass rate is >=95%
- [ ] No unresolved high-priority risks (R-001, R-002, R-003, R-004, R-005, R-006, R-008, R-009)
- [ ] Shared envelope and CSRF/auth/session contracts are stable across Epic 1 route inventory
- [ ] Epic 1 coverage target (>=80% planned automated scenarios) is reached

## Test Coverage Plan

**Note:** P0/P1/P2/P3 represent **risk/business priority**, not execution timing.

### P0 (Critical)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-1.1-001 | Canonical request context resolved from auth claims, not spoofed headers | API | R-001 | Core tenancy invariant |
| TD-1.1-002 | OrgUnit-scoped routes reject missing/invalid orgUnit context | API | R-001, R-002 | No silent fallback |
| TD-1.1-003 | Cross-tenant/cross-orgUnit override attempts are denied (read+write) | API | R-001 | Deterministic refusal contract |
| TD-1.2-001 | Non-system actor cannot assign initial `TENANT_ADMIN` | API | R-003 | Governance-critical path |
| TD-1.3-001 | Refresh issue persists hashed token metadata with expiry/revocation support | API | R-004 | Session integrity baseline |
| TD-1.3-002 | Replay/revoked refresh token paths are rejected deterministically | API | R-004 | Security-critical |
| TD-1.3-003 | CSRF required for authenticated state-changing routes | API | R-004 | Missing/invalid/valid matrix |
| TD-1.4-001 | Shared envelope shape remains consistent across platform and module routes | API | R-005 | Contract reliability |
| TD-1.4-002 | Business refusal remains HTTP 200 + `ok=false` | API | R-005 | Client determinism |
| TD-1.6-001 | Security regression validates isolation + CSRF + cookie posture | API/E2E | R-004, R-006 | Release-blocking security lane |
| TD-1.6-002 | Log/event payloads exclude prohibited secret/plaintext sensitive fields | Integration | R-006 | Redaction contract |

Estimated P0 effort: ~24-38 hours

### P1 (High)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-1.1-004 | Scope helper applies correct tenant/orgUnit filter keys per aggregate | Unit | R-001 | Prevent subtle query drift |
| TD-1.2-002 | Entitlement/membership updates reflect immediately in capability checks | API | R-002, R-003 | No stale authorization state |
| TD-1.2-003 | Membership mutations persist event+outbox atomically | Integration | R-003 | Mutation contract proof |
| TD-1.3-004 | Parent-domain cookie policy remains environment-safe | API | R-004 | Dev/stage/prod profile checks |
| TD-1.4-003 | Anti-drift check flags ad-hoc non-envelope responses | Unit | R-005 | Prevent regression |
| TD-1.5-001 | CI policy stage blocks downstream lanes on failure | CI/Contract | R-007 | Governance control |
| TD-1.5-002 | Branch/workflow guard rejects invalid branch-story/workflow combinations | CI/Contract | R-007 | Workflow discipline |
| TD-1.6-003 | Production config fails fast when default secrets are present | Unit/CI | R-009 | Security hardening gate |

Estimated P1 effort: ~20-34 hours

### P2 (Medium)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-1.x-001 | Story-aligned API suite baseline replaces/absorbs skipped legacy scenarios | Process/CI | R-008 | Delivery readiness |
| TD-1.x-002 | Extended role matrix checks (viewer/identity-lead/tenant-staff boundaries) | API | R-002 | Edge privilege coverage |
| TD-1.x-003 | Redaction policy edge-cases (nested payload keys, structured metadata) | Integration | R-006 | Regression safety |
| TD-1.x-004 | Failure diagnostics quality for policy/branch guard output | CI | R-007 | Operator usability |

Estimated P2 effort: ~10-20 hours

### P3 (Low)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| TD-1.x-005 | Exploratory envelope consistency spot-checks in low-traffic endpoints | E2E | R-005 | Opportunistic hardening |

Estimated P3 effort: ~4-8 hours

## Execution Strategy

- **PR lane:** run all functional P0 + P1 tests and selected fast P2 checks in parallelized API/unit/integration lanes, targeting <15 minutes total runtime.
- **Nightly lane:** run broader P2 coverage and contract-drift scans that are valuable but not release-blocking per-PR.
- **Weekly lane:** run long-running diagnostics, exploratory P3 scenarios, and skipped-spec replacement audits.

## Resource Estimates

| Priority | Scenario Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~11 | ~24-38 hours | Security, tenancy, and contract-critical coverage |
| P1 | ~8 | ~20-34 hours | Governance and hardening lanes |
| P2 | ~4 | ~10-20 hours | Readiness and edge coverage |
| P3 | ~1 | ~4-8 hours | Exploratory hardening |
| **Total** | **~24** | **~58-100 hours** | **~1.5-3 weeks (single QA with dev support)** |

## Quality Gate Criteria

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigation status:** complete for all score >=6 risks before release
- **Coverage target:** >=80% of planned Epic 1 automated scenarios
- **Governance gate:** policy-first CI stage remains blocking for downstream lanes

## Assumptions and Dependencies

### Assumptions

1. Epic 1 remains scoped to platform access/security foundation and does not absorb Epic 2+ functional work.
2. Existing Epic 0 kernel contract suites remain reliable baselines to extend (not replace).
3. Role/capability matrix remains the single source of truth for authorization behavior.

### Dependencies

1. `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status.yaml` remains current and authoritative.
2. CI scripts for policy guard and workflow enforcement remain executable in local and PR contexts.
3. Security team provides explicit prohibited-field redaction list for deterministic assertions.

### Risks to Plan

- **Risk:** residual skipped legacy specs hide regressions.
  - **Impact:** false confidence in readiness.
  - **Contingency:** convert/replace skipped specs with story-aligned API-first tests and explicit waiver log.

- **Risk:** branch/policy guard commands are bypassed manually in local dev.
  - **Impact:** governance drift before PR stage.
  - **Contingency:** add pre-merge automation hooks and documented remediation commands.

## Interworking & Regression

| Service / Component | Impact | Regression Scope |
| --- | --- | --- |
| Platform tenancy context + middleware chain | Epic 1 enforces hard tenancy/orgUnit boundaries | Re-run tenancy diagnostics + cross-tenant/cross-orgUnit negative suites |
| Platform RBAC capability mapping | Entitlement and role mutations affect access behavior globally | Re-run capability matrix + membership mutation contract tests |
| Auth/session + CSRF middleware | Session rotation and state-changing route protection are foundational | Re-run refresh rotation, revoked/replay, and CSRF route inventory suites |
| Shared response envelope helpers | API client contract depends on uniform envelope semantics | Re-run envelope consistency suites across platform + module routes |
| CI policy and workflow guards | Governance invariants gate release readiness | Re-run policy gate and branch guard harness suites on PR and nightly |

## References

- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-2-tenant-and-module-entitlement-administration.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-4-shared-response-envelope-and-refusal-helpers.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-5-policy-gate-and-branch-workflow-guard-enforcement.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-6-security-controls-and-redaction-verification.md`
- `/Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md`
