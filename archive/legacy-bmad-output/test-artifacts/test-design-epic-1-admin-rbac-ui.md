---
stepsCompleted: ['step-01-detect-mode','step-02-load-context','step-03-risk-and-testability','step-04-coverage-plan','step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-20'
---

# Test Design: Epic 1 - Admin Provisioning UI and RBAC Role Journeys

**Date:** 2026-02-20  
**Author:** Jeremiah / TEA  
**Status:** Draft  
**Scope:** Targeted Epic-level design for missing frontend governance surfaces tied to Story 1.2 contracts.

## Executive Summary

- Total risks identified: 8
- High-priority risks (score >= 6): 6
- Critical categories: SEC, DATA, BUS
- Coverage focus: `SYSTEM_ADMIN` tenant provisioning, `TENANT_ADMIN` orgUnit/membership governance, deny-by-default UX and route protection.

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| ConnectShyft operational inbox and dispatch UI | This work is governance/provisioning only | Keep admin entry points isolated from operational routes |
| Backend service capability redesign | Contracts already exist and are tested | Focus on frontend delivery + integration tests |
| Cross-tenant data migration tooling | Out of story scope | Use existing tenant creation and membership APIs only |

## Risk Assessment

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AR-001 | SEC | Unauthorized users discover/access admin routes due to missing route guards | 2 | 3 | 6 | Add explicit role/capability route gates + URL direct-hit denial tests | Frontend + QA | Before merge |
| AR-002 | SEC | Non-system actors can trigger initial tenant-admin assignment path from UI | 2 | 3 | 6 | Hide action in non-system contexts and verify backend refusal handling | Frontend + QA | Before merge |
| AR-003 | DATA | Tenant context mismatch in forms causes cross-tenant mutation attempts | 2 | 3 | 6 | Force active tenant context in payload construction and validate refusal UX | Frontend | Before merge |
| AR-004 | BUS | Missing breadcrumbs/context makes operators mutate wrong scope | 2 | 3 | 6 | Add persistent breadcrumb + active scope chips on admin screens | Frontend UX | Before merge |
| AR-005 | TECH | API failure states (400/403/500) surface as opaque blank/gray views | 3 | 2 | 6 | Build deterministic in-view error surfaces and loading/empty states | Frontend | Before merge |
| AR-006 | OPS | No deterministic E2E/admin role matrix causes regression on role changes | 2 | 3 | 6 | Add role-matrix E2E + API contract suites for admin paths | QA | Before merge |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR-007 | TECH | Lack of stable selectors increases test flakiness | 2 | 2 | 4 | Add `data-testid` coverage for all admin controls | Frontend |
| AR-008 | BUS | Mobile navigation omits admin entry points for privileged users | 2 | 2 | 4 | Add responsive admin nav with clear role visibility rules | Frontend UX |

## Entry Criteria

- [ ] Story 1.2 backend contracts deployed locally and callable from frontend.
- [ ] Auth store exposes current user role and tenant context reliably.
- [ ] New admin routes defined and protected by role/capability guards.
- [ ] Test seed flow can create users for role matrix checks.

## Exit Criteria

- [ ] All P0 tests passing at 100%.
- [ ] P1 pass rate >= 95%.
- [ ] No unresolved high-risk (AR-001..AR-006) findings.
- [ ] Breadcrumb/context bar present on all admin views.
- [ ] Role-based access behavior proven for all roles in RBAC matrix.

## Test Coverage Plan

### P0 (Critical)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| AR-P0-001 | `SYSTEM_ADMIN` can access system admin view and create tenant | E2E + API | AR-001, AR-002 | Happy path + envelope validation |
| AR-P0-002 | `TENANT_ADMIN` is blocked from system admin routes (UI + direct URL) | E2E | AR-001 | Deny-by-default |
| AR-P0-003 | `TENANT_ADMIN` can access tenant admin view and create/update orgUnit | E2E + API | AR-003 | Active-tenant scoped payloads |
| AR-P0-004 | Tenant/orgUnit membership mutations reflect immediate access behavior | API + E2E | AR-003, AR-006 | Use `/rbac/evaluate` verification |
| AR-P0-005 | Non-admin roles cannot see admin navigation or execute admin actions | E2E | AR-001 | `TENANT_STAFF`, `TENANT_VIEWER`, `ORGUNIT_*` |
| AR-P0-006 | Admin view handles 400/403/500 without blank screen regressions | E2E | AR-005 | Deterministic error banner + recoverability |

Estimated P0 effort: ~16-24 hours

### P1 (High)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| AR-P1-001 | Breadcrumbs always reflect current admin scope and path | Component + E2E | AR-004 | Desktop + mobile |
| AR-P1-002 | UI hides initial tenant-admin assignment controls unless system role | Component + E2E | AR-002 | Visibility + attempted mutation path |
| AR-P1-003 | Module entitlement toggles update and show persisted state | E2E + API | AR-006 | Uses existing endpoint |
| AR-P1-004 | Role matrix smoke suite validates capability differences by role | API | AR-006 | `/api/v1/platform/admin/rbac/evaluate` |

Estimated P1 effort: ~10-16 hours

### P2 (Medium)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| AR-P2-001 | Selector contract checks for all critical admin controls | Component | AR-007 | Prevent flaky E2E |
| AR-P2-002 | Mobile admin navigation accessibility and readability | E2E | AR-008 | <= 800px |

Estimated P2 effort: ~4-8 hours

### P3 (Low)

| Test ID | Requirement / Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| AR-P3-001 | Extended exploratory UX polish and empty-state wording | Exploratory | AR-004 | Non-blocking |

Estimated P3 effort: ~2-4 hours

## Execution Strategy

- **PR lane:** all P0 + P1 suites (API + E2E role-matrix subset), target <15 minutes.
- **Nightly lane:** full P2 checks and broader role permutations.
- **Weekly lane:** exploratory P3 UX/accessibility pass.

## Resource Estimates

| Priority | Scenario Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~6 | ~16-24 hours | Core governance path |
| P1 | ~4 | ~10-16 hours | UX correctness + role matrix depth |
| P2 | ~2 | ~4-8 hours | Stability + responsive checks |
| P3 | ~1 | ~2-4 hours | Exploratory quality |
| **Total** | **~13** | **~32-52 hours** | **~4-7 dev days** |

## Quality Gate Criteria

- P0 pass rate: 100%
- P1 pass rate: >= 95%
- Coverage target: >= 80% of planned admin-rbac scenarios
- Role gate invariant: unauthorized role attempts must refuse deterministically (no silent success)
- UX invariant: no blank/gray fallback screens on handled API failures

## Assumptions and Dependencies

### Assumptions
1. Story 1.2 backend endpoints remain the contract source for admin operations.
2. Current auth payload role (`user.role`) is sufficient for initial frontend gating.
3. Existing UI design tokens and layout components remain the design baseline.

### Dependencies
1. `/Users/jeremiahotis/moneyshyft/src/src/routes/api/v1/platform-admin.ts`
2. `/Users/jeremiahotis/moneyshyft/src/src/platform/rbac/capabilities.ts`
3. Local test users spanning `SYSTEM_ADMIN`, `TENANT_ADMIN`, and non-admin roles.

## Interworking & Regression

| Service / Component | Impact | Regression Scope |
| --- | --- | --- |
| Auth store and route guards | Determines admin-route reachability | Re-run login + guarded route tests |
| Platform Admin APIs | Drives all provisioning mutations | Re-run Story 1.2 API suite |
| Header/nav layout | Admin discoverability and scope clarity | Re-run navigation + responsive checks |
| Role matrix evaluator | Permission verification contract | Re-run role matrix API tests |

## References

- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-2-tenant-and-module-entitlement-administration.md`
- `/Users/jeremiahotis/moneyshyft/src/src/routes/api/v1/platform-admin.ts`
- `/Users/jeremiahotis/moneyshyft/src/src/platform/rbac/capabilities.ts`
