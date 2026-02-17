---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-17'
---

# Test Design for Architecture: Shyft Platform Kernel + RouteShyft Commitment Spine

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture/Dev teams. Serves as a contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-02-17
**Author:** Master Test Architect
**Status:** Architecture Review Pending
**Project:** Shyft
**PRD Reference:** `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md`
**ADR Reference:** `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** System-level test architecture for commitment-centric modular monolith conversion, platform kernel hardening, and RouteShyft MVP operational flows.

**Business Context** (from PRD):

- **Revenue/Impact:** Directly impacts execution reliability, overbooking reduction, and trust outcomes in donor/recipient operations.
- **Problem:** Fragmented execution and coordination, with high risk of silent drop-offs and inconsistent capacity handling.
- **GA Launch:** Not specified; this document assumes phased rollout with Phase 0 hardening before downstream module expansion.

**Architecture** (from architecture decisions):

- **Key Decision 1:** Commitment lifecycle is canonical execution spine across modules.
- **Key Decision 2:** First-party auth + CSRF + parent-domain cookie strategy with strict tenancy boundaries.
- **Key Decision 3:** Mutation discipline requires event + outbox write; no direct cross-module mutation coupling.

**Expected Scale** (from PRD/architecture):

- Multi-tenant operational system with dispatcher/cashier/driver/public workflows.
- High operational criticality for scheduling, publish, and completion proof flows.

**Risk Summary:**

- **Total risks**: 10
- **High-priority (>=6)**: 5 risks requiring immediate mitigation
- **Test effort**: ~45-80 person-days for QA implementation across P0-P3 (1 QA), excluding platform team blocker work.

---

## Quick Guide

### 🚨 BLOCKERS - Team Must Decide (Can't Proceed Without)

**Sprint 0 Critical Path** - These MUST be completed before QA can write reliable integration tests:

1. **B-001: Tenant Isolation Enforcement Hooks** - Repository-level mandatory tenant scoping and negative test hooks (recommended owner: Backend Platform)
2. **B-002: Timezone Service Contract** - Centralized UTC persist + local rendering utilities with fallback precedence (recommended owner: Platform Core)
3. **B-003: Mutation Event/Outbox Transaction Contract** - Atomic mutation + event + outbox contract exposed for validation (recommended owner: Platform Core)

**What we need from team:** Complete these 3 items in Sprint 0 or system-level test development remains blocked.

---

### ⚠️ HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R-001: Cross-tenant data exposure risk** - Enforce mandatory tenant filters + tenant-scoped keys and cross-tenant negative tests (Sprint 0)
2. **R-002: User-visible UTC leakage risk** - Adopt centralized backend/frontend timezone helpers and ban direct raw date formatting (Sprint 0)
3. **R-003: Outbox/event drift risk** - Ensure all mutation handlers produce auditable event + outbox rows atomically (Sprint 0-1)

**What we need from team:** Review recommendations and approve (or adjust) with named ownership.

---

### 📋 INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy**: Risk-based split across API/Component/E2E with minimized redundancy.
2. **Tooling**: Playwright ecosystem + API-first patterns + factory/fixture discipline.
3. **Tiered CI/CD**: PR functional coverage, nightly perf, weekly long-running resilience lanes.
4. **Coverage**: Priority-linked scenarios P0-P3 with requirement-to-risk mapping.
5. **Quality gates**: P0=100%, P1>=95%, high-risk mitigations before release.

**What we need from team:** Review and acknowledge.

---

## For Architects and Devs - Open Topics 👷

### Risk Assessment

**Total risks identified**: 10 (5 high-priority score >=6, 3 medium, 2 low)

#### High-Priority Risks (Score >=6) - IMMEDIATE ATTENTION

| Risk ID    | Category  | Description                                                     | Probability | Impact | Score | Mitigation                                                                | Owner            | Timeline |
| ---------- | --------- | --------------------------------------------------------------- | ----------- | ------ | ----- | ------------------------------------------------------------------------- | ---------------- | -------- |
| **R-001**  | **DATA**  | Tenant filter omission causing cross-tenant read/write leakage | 3           | 3      | **9** | Enforce repo-level tenancy guards + negative tests in CI                 | Platform Backend | Sprint 0 |
| **R-002**  | **BUS**   | UTC timestamps shown to users/admin causing scheduling errors   | 3           | 2      | **6** | Centralize timezone formatting/parsing helpers across monorepo           | Platform Core    | Sprint 0 |
| **R-003**  | **TECH**  | Mutation path skips event/outbox causing module drift           | 2           | 3      | **6** | Wrap mutations with command/outbox transaction rule and contract tests   | Platform Core    | Sprint 0 |
| **R-004**  | **SEC**   | CSRF/cookie misconfiguration across app.* and api.* surfaces   | 2           | 3      | **6** | Enforce environment-safe cookie policies + CSRF regression matrix        | Security/Backend | Sprint 0 |
| **R-005**  | **OPS**   | Bridge route/state divergence between WP and monolith          | 2           | 3      | **6** | Contract tests on bridge endpoints + single state authority assertions   | Route Module     | Sprint 1 |

#### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description                                                | Probability | Impact | Score | Mitigation                                                        | Owner        |
| ------- | -------- | ---------------------------------------------------------- | ----------- | ------ | ----- | ----------------------------------------------------------------- | ------------ |
| R-006   | TECH     | Idempotency gaps in driver submission retry paths          | 2           | 2      | 4     | Add idempotency-key contract checks and replay safety tests       | Route Module |
| R-007   | PERF     | Capacity checks degrade under concurrent scheduling actions | 2           | 2      | 4     | Add load profile for capacity endpoints and index tuning checks   | Backend      |
| R-008   | OPS      | Insufficient correlation logging for incident reconstruction| 1           | 3      | 3     | Enforce correlation-id propagation assertions in API middleware   | Platform     |

#### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description                                        | Probability | Impact | Score | Action  |
| ------- | -------- | -------------------------------------------------- | ----------- | ------ | ----- | ------- |
| R-009   | BUS      | Minor refusal copy inconsistency across surfaces   | 1           | 2      | 2     | Monitor |
| R-010   | PERF     | Non-critical dashboard query noise in off-peak use | 1           | 1      | 1     | Monitor |

#### Risk Category Legend

- **TECH**: Technical/Architecture
- **SEC**: Security
- **PERF**: Performance
- **DATA**: Data Integrity
- **BUS**: Business Impact
- **OPS**: Operations

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS - Architecture Team Must Address**

#### 1. Blockers to Fast Feedback (WHAT WE NEED FROM ARCHITECTURE)

| Concern                               | Impact                                   | What Architecture Must Provide                                        | Owner            | Timeline |
| ------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- | ---------------- | -------- |
| **No canonical temporal service API** | Inconsistent date handling and flaky time assertions | Shared `@platform/time` backend + frontend contracts with fallback order | Platform Core    | Sprint 0 |
| **Outbox contract not machine-checked** | Mutation drift undetected in CI          | Contract tests that fail if mutation completes without event/outbox   | Platform Backend | Sprint 0 |
| **Bridge state authority ambiguity**  | Test oracle instability for bridge flows | Explicit source-of-truth invariants in bridge API contracts           | Route Module     | Sprint 0 |

#### 2. Architectural Improvements Needed (WHAT SHOULD BE CHANGED)

1. **Timezone fallback precedence ADR**
   - **Current problem**: Fallback order is implied but not codified.
   - **Required change**: Codify `user -> tenant -> system default` precedence with invalid-timezone handling.
   - **Impact if not fixed**: Inconsistent date rendering and brittle tests.
   - **Owner**: Platform Core
   - **Timeline**: Sprint 0

2. **Outbox schema and payload contract hardening**
   - **Current problem**: Event/outbox fields are defined conceptually but not frozen at schema contract level.
   - **Required change**: Finalize `platform.events` + `platform.outbox_events` schemas and payload minimums.
   - **Impact if not fixed**: Cross-module integration instability.
   - **Owner**: Platform Backend
   - **Timeline**: Sprint 0

---

### Testability Assessment Summary

#### What Works Well

- ✅ Commitment lifecycle and refusal semantics are explicitly modeled.
- ✅ Tenancy isolation, envelope contracts, and policy gates are architecture invariants.
- ✅ Modular boundaries and phased migration sequence reduce uncontrolled divergence.

#### Accepted Trade-offs (No Action Required)

- Full distributed cache deferred in favor of indexed query optimization for Phase 0/MVP.
- Service decomposition deferred until monolith kernel discipline is stable.

---

### ASRs (Architecturally Significant Requirements)

| ASR ID | Requirement Focus                                   | Status      | Notes |
| ------ | --------------------------------------------------- | ----------- | ----- |
| ASR-01 | Tenant isolation enforced on every data path        | ACTIONABLE  | Must be contract-tested before feature expansion |
| ASR-02 | Commitment terminal-state integrity                 | ACTIONABLE  | Requires transition guard + immutable proof enforcement |
| ASR-03 | UTC persist + local-time display everywhere         | ACTIONABLE  | Requires centralized time service + DTO/UI rules |
| ASR-04 | Refusal envelope consistency                        | ACTIONABLE  | Must be validated across all relevant route endpoints |
| ASR-05 | Policy-first CI gate sequence                       | FYI         | Already represented in workflow and CI design |

---

### Risk Mitigation Plans (High-Priority Risks >=6)

#### R-001: Cross-tenant data exposure (Score: 9) - CRITICAL

**Mitigation Strategy:**
1. Enforce mandatory tenant filter utilities in repository base layer.
2. Add integration tests for cross-tenant access denial per critical endpoint group.
3. Gate merges on tenant-isolation test suite pass.

**Owner:** Platform Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Negative tests prove cross-tenant read/write attempts fail.

#### R-002: UTC leakage to users/admin (Score: 6) - HIGH

**Mitigation Strategy:**
1. Add backend/frontend centralized time utility modules.
2. Prohibit direct raw UTC formatting in UI code via lint/review checks.
3. Add DST/boundary test suite for scheduling and reporting surfaces.

**Owner:** Platform Core  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Snapshot and integration tests show localized output per user timezone.

#### R-003: Mutation event/outbox drift (Score: 6) - HIGH

**Mitigation Strategy:**
1. Standardize transactional mutation wrapper requiring event + outbox emission.
2. Add contract tests for required outbox fields and event payload minimums.
3. Add CI check for mutation handlers without outbox writes.

**Owner:** Platform Core  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Mutation integration tests fail when outbox writes are missing.

#### R-004: CSRF/cookie misconfiguration (Score: 6) - HIGH

**Mitigation Strategy:**
1. Define canonical cookie policy matrix by environment.
2. Add authenticated state-change CSRF test suite.
3. Validate app/api domain behavior via integration tests.

**Owner:** Security + Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Security regression tests pass for session and CSRF paths.

#### R-005: WP bridge state divergence (Score: 6) - HIGH

**Mitigation Strategy:**
1. Freeze bridge endpoint contracts and state transition ownership.
2. Add backend-connected contract tests for fulfillment/pending/completion endpoints.
3. Enforce single-write state authority assertions in integration tests.

**Owner:** Route Module  
**Timeline:** Sprint 1  
**Status:** Planned  
**Verification:** Bridge contract lane passes against live API with authoritative state checks.

---

### Assumptions and Dependencies

#### Assumptions

1. Monolith conversion sequence remains strict and no framework replacement occurs during Phase 0.
2. WP remains thin UI and does not retain authoritative scheduling state after bridge cutover milestones.
3. CI policy gate remains mandatory and blocks downstream execution on violations.

#### Dependencies

1. `platform.events` and `platform.outbox_events` migrations finalized before broad write-path conversion.
2. Timezone preference fields and fallback data available in user/tenant domain before scheduling UX go-live.

#### Risks to Plan

- **Risk**: Incomplete tenant/timezone fixtures reduce reliability of integration tests.
  - **Impact**: False confidence in production behavior.
  - **Contingency**: Add canonical fixture factories + seeded multi-tenant test datasets in Sprint 0.

---

**End of Architecture Document**

**Next Steps for Architecture Team:**

1. Resolve Sprint 0 blockers in Quick Guide
2. Assign owners/timelines for high-priority risks
3. Confirm ASR ownership and contract tests

**Next Steps for QA Team:**

1. Use companion QA doc for concrete test scenario execution
2. Build fixture/factory infrastructure once blockers are cleared
3. Begin P0/P1 implementation in PR lanes
