---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-19'
---

# Test Design for Architecture: ConnectShyft System-Level

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture/Dev teams. Serves as a contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-02-19
**Author:** Master Test Architect
**Status:** Architecture Review Pending
**Project:** Shyft / ConnectShyft
**PRD Reference:** `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
**ADR Reference:** `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`

---

## Executive Summary

**Scope:** System-level test architecture for ConnectShyft communication operations (inbox, threads, escalation, Twilio webhooks, governance controls) delivered in parallel with RouteShyft under strict monorepo isolation constraints.

**Business Context** (from PRD):

- **Revenue/Impact:** Improves communication execution reliability and accountability for volunteer and tenant operations.
- **Problem:** Communication work is fragmented and high-risk without deterministic routing, ownership, and escalation behavior.
- **GA Launch:** Phased rollout with feature flags and tenant/orgUnit allow-list after Sprint 0 hardening.

**Architecture** (from Architecture Decision Document):

- **Key Decision 1:** Bounded context in `modules/connectshyft` with no direct cross-module imports to/from RouteShyft.
- **Key Decision 2:** Canonical thread model locked (`UNCLAIMED | CLAIMED | CLOSED`) and single active thread uniqueness on `(tenant_id, org_unit_id, neighbor_id)`.
- **Key Decision 3:** Deterministic escalation via persisted `next_evaluation_at_utc` and replay-safe webhook ingestion with signature validation + SID receipt ledger.

**Expected Scale** (from PRD/architecture):

- Multi-tenant, multi-orgUnit operational usage with multiple Twilio numbers per orgUnit.
- Near-real-time inbound webhook processing and escalation evaluation under retry/restart conditions.

**Risk Summary:**

- **Total risks**: 12
- **High-priority (>=6)**: 6 risks requiring immediate mitigation
- **Test effort**: Architecture readiness work in Sprint 0, then QA implementation in companion QA plan (~6-10 weeks for one QA)

---

## Quick Guide

### 🚨 BLOCKERS - Team Must Decide (Can't Proceed Without)

**Sprint 0 Critical Path** - These MUST be completed before QA can write reliable integration tests:

1. **B-001: ConnectShyft schema/search_path wiring** - finalize `connectshyft` schema migrations and repository search path boundaries (recommended owner: Platform Backend)
2. **B-002: Deterministic escalation worker contract** - implement persisted due-time evaluator with Postgres `SELECT ... FOR UPDATE SKIP LOCKED` (recommended owner: Platform Backend)
3. **B-003: Import boundary enforcement** - enforce lint/CI rule blocking `modules/route` <-> `modules/connectshyft` direct imports (recommended owner: Platform Architecture)
4. **B-004: Webhook receipt ledger + retention** - ship `connectshyft.cs_webhook_receipts` unique keying and retention job (recommended owner: Platform Backend)

**What we need from team:** Complete these 4 items in Sprint 0 or system-level test development remains blocked.

---

### ⚠️ HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R-001: Active-thread race and duplication risk** - enforce insert-under-constraint then conflict-fetch strategy for thread ensure endpoint (Sprint 0)
2. **R-002: Escalation drift risk** - ensure claim sets `next_evaluation_at_utc=NULL` and evaluation-only enqueue behavior (Sprint 0)
3. **R-003: Tenant-wide identity side-effect risk** - preserve relationship-gated neighbor edits with orgUnit provenance auditing (Sprint 0)
4. **R-004: Webhook spoof/replay risk** - require signature validation before dedupe and suppress duplicate timeline effects (Sprint 0)
5. **R-005: Parallel delivery regression risk** - run RouteShyft regression lane as required gate on ConnectShyft PRs (Sprint 0-1)

**What we need from team:** Review these recommendations, confirm ownership, and lock timelines.

---

### 📋 INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy:** Risk-based split with architecture blockers in this document and execution coverage in companion QA plan.
2. **Coverage posture:** 12 risks mapped with explicit high/medium/low mitigation priorities.
3. **Execution model:** Deterministic scheduler + idempotent webhook + feature-flag rollout provides restart-safe behavior.
4. **Quality floor:** P0=100%, P1>=95%, and all high-risk mitigations complete before release.
5. **Cross-document contract:** QA implementation details live in `test-design-qa.md` to avoid duplication.

**What we need from team:** Review and acknowledge.

---

## For Architects and Devs - Open Topics 👷

### Risk Assessment

**Total risks identified**: 12 (6 high-priority score >=6, 4 medium, 2 low)

#### High-Priority Risks (Score >=6) - IMMEDIATE ATTENTION

| Risk ID    | Category  | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ---------- | --------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| **R-001** | **DATA** | Concurrent ensure requests create duplicate active threads | 3 | 3 | **9** | Enforce partial unique index + insert/constraint-conflict fetch pattern | Platform Backend | Sprint 0 |
| **R-002** | **OPS** | Escalation engine misfires after restarts/retries | 2 | 3 | **6** | Persist `next_evaluation_at_utc`, evaluate only due rows, lock rows with `SKIP LOCKED` | Platform Backend | Sprint 0 |
| **R-003** | **SEC** | Webhook spoof/replay leads to unauthorized or duplicate artifacts | 3 | 3 | **9** | Signature validation first, SID dedupe ledger second, reject duplicates deterministically | Security + Platform Backend | Sprint 0 |
| **R-004** | **TECH** | Direct RouteShyft/ConnectShyft imports create hidden coupling | 2 | 3 | **6** | CI/lint import-boundary enforcement and codeowner review checks | Platform Architecture | Sprint 0 |
| **R-005** | **BUS** | Escalation reset semantics drift from claim-only rule | 2 | 3 | **6** | Enforce claim-only reset in service contracts and state-transition tests | ConnectShyft Backend | Sprint 0 |
| **R-006** | **DATA** | Tenant-scoped neighbor edits cause unintended cross-org identity changes | 2 | 3 | **6** | Relationship-gated edits + orgUnit provenance in audit metadata | ConnectShyft Backend | Sprint 0 |

#### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-007 | PERF | Due-thread query latency degrades under higher inbox volume | 2 | 2 | 4 | Maintain scheduler index and add query-plan checks | Platform Backend |
| R-008 | OPS | Receipt ledger growth increases storage/query overhead | 2 | 2 | 4 | Run 180-day retention cleanup and monitor row growth | Platform Ops |
| R-009 | SEC | Capability mapping drift introduces unintended role access | 1 | 3 | 3 | Keep capability mapping in single source and enforce server-side checks | Platform Security |
| R-010 | OPS | Feature flags misconfigured during rollout | 1 | 3 | 3 | Require explicit allow-list and kill-switch drills per environment | Release Engineering |

#### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-011 | BUS | Non-critical copy mismatch in escalation labels | 1 | 2 | 2 | Monitor |
| R-012 | PERF | Occasional non-critical inbox sorting jitter under heavy updates | 1 | 1 | 1 | Monitor |

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

| Concern | Impact | What Architecture Must Provide | Owner | Timeline |
| ------- | ------ | ------------------------------ | ----- | -------- |
| **No deterministic escalation worker contract in runtime profiles** | Cannot reliably validate X->2X->3X progression under restart/retry | Production-equivalent worker loop definition, due-batch strategy, and retry semantics | Platform Backend | Sprint 0 |
| **No enforceable module import boundaries yet** | Hidden coupling can bypass contract-first integration and break RouteShyft safety | Lint + CI boundary guard blocking route/connectshyft cross-imports | Platform Architecture | Sprint 0 |
| **No canonical ConnectShyft seed/factory contract for integration tests** | Parallel QA execution becomes flaky and non-reproducible | Stable test data factory contract for tenant/orgUnit/neighbor/thread entities | Platform Backend | Sprint 0 |
| **No audit/event correlation invariant for governance actions** | Hard to prove neighbor edit/merge provenance across orgUnits | Required audit metadata schema and correlation-id propagation rule | Platform Backend | Sprint 0 |

#### 2. Architectural Improvements Needed (WHAT SHOULD BE CHANGED)

1. **Webhook processing transaction envelope**
   - **Current problem**: Signature, dedupe, persistence, and outbox sequencing can be implemented inconsistently.
   - **Required change**: Freeze transaction sequence and refusal behavior for each failure point.
   - **Impact if not fixed**: Replay handling drift, duplicate timeline artifacts, and brittle regression tests.
   - **Owner**: Platform Backend
   - **Timeline**: Sprint 0

2. **Escalation evaluation observability contract**
   - **Current problem**: Scheduler decisions may be opaque under incident investigation.
   - **Required change**: Emit structured logs/metrics for due-selection, skip reason, stage transition, and enqueue outcome.
   - **Impact if not fixed**: Incomplete root-cause analysis and weak operational confidence.
   - **Owner**: Platform Ops + Backend
   - **Timeline**: Sprint 0

3. **Thread ensure endpoint refusal contract hardening**
   - **Current problem**: Edge-case failures (invalid orgUnit context, closed-thread handling) can diverge across handlers.
   - **Required change**: Standardize refusal envelope responses and invariants for ensure behavior.
   - **Impact if not fixed**: Client drift and non-deterministic behavior under load.
   - **Owner**: ConnectShyft Backend
   - **Timeline**: Sprint 0

---

### Testability Assessment Summary

#### What Works Well

- ✅ Core invariants are frozen in PRD + architecture (enum lock, uniqueness, claim-only reset, scheduler model).
- ✅ Schema namespace, webhook ledger key shape, and migration location are explicitly locked.
- ✅ Parallel delivery constraints (feature flags, additive migrations, CI policy gates, RouteShyft regression gates) are concrete.

#### Accepted Trade-offs (No Action Required)

- ConnectShyft remains in monolith runtime for this phase; service decomposition is intentionally deferred.
- Twilio remains the only communication provider in scope; multi-provider orchestration is deferred post-MVP.

This is acceptable for ConnectShyft MVP provided high-priority risks are mitigated before broad rollout.

---

### ASRs (Architecturally Significant Requirements)

| ASR ID | Requirement Focus | Status | Notes |
| ------ | ----------------- | ------ | ----- |
| ASR-01 | Tenant and orgUnit scoping enforced for all operational reads/writes | ACTIONABLE | Must be validated in repository and service layers |
| ASR-02 | Single active thread invariant preserved under concurrency | ACTIONABLE | Depends on DB constraint + conflict-fetch ensure strategy |
| ASR-03 | Escalation progression remains deterministic across restarts | ACTIONABLE | Depends on persisted scheduling and lock-safe evaluator |
| ASR-04 | Webhook intake is signature-validated and replay-safe | ACTIONABLE | Depends on receipt ledger contract and suppression behavior |
| ASR-05 | RouteShyft and ConnectShyft module boundaries remain isolated | ACTIONABLE | Depends on enforceable CI import-boundary rule |
| ASR-06 | Feature-flag kill-switch can fail closed for inbound/outbound flows | FYI | Needed for controlled rollout and rollback safety |

---

### Risk Mitigation Plans (High-Priority Risks >=6)

#### R-001: Duplicate active thread creation under concurrency (Score: 9) - CRITICAL

**Mitigation Strategy:**
1. Implement partial unique index on `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.
2. Implement ensure endpoint as insert-first and conflict-fetch existing thread.
3. Add integration contract checks for concurrent ensure requests.

**Owner:** Platform Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Concurrency tests confirm only one active thread exists for all parallel request bursts.

#### R-002: Escalation drift during retries/restarts (Score: 6) - HIGH

**Mitigation Strategy:**
1. Drive escalation using persisted `next_evaluation_at_utc` only.
2. Process due threads using Postgres `SELECT ... FOR UPDATE SKIP LOCKED`.
3. Ensure claim path nulls `next_evaluation_at_utc` and evaluation transaction re-checks state before enqueue.

**Owner:** Platform Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Restart/retry test runs show no duplicate or stale escalation notifications.

#### R-003: Webhook spoof/replay causes invalid or duplicate records (Score: 9) - CRITICAL

**Mitigation Strategy:**
1. Reject webhook payloads failing Twilio signature verification.
2. Enforce idempotency through `connectshyft.cs_webhook_receipts` unique key.
3. Suppress duplicate domain timeline entries when replayed SIDs are received.

**Owner:** Security + Platform Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Security and replay tests show invalid signatures rejected and repeated SIDs ignored.

#### R-004: Hidden cross-module coupling with RouteShyft (Score: 6) - HIGH

**Mitigation Strategy:**
1. Add import boundary lint configuration for RouteShyft/ConnectShyft modules.
2. Block merges when boundary violations are detected.
3. Reinforce API/event-based integration in review checklist.

**Owner:** Platform Architecture  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** CI fails on direct cross-module imports; approved integrations occur only via contracts.

#### R-005: Escalation reset semantics drift from claim-only policy (Score: 6) - HIGH

**Mitigation Strategy:**
1. Freeze service-layer rule: outbound actions without claim do not reset escalation.
2. Enforce claim transition to reset stage and cancel pending notifications by evaluation-only enqueue model.
3. Add transition contract tests for claim, takeover, and outbound edge cases.

**Owner:** ConnectShyft Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Contract tests prove escalation state changes only on claim/takeover rules.

#### R-006: Tenant-scoped neighbor updates produce unintended global side effects (Score: 6) - HIGH

**Mitigation Strategy:**
1. Enforce relationship-gated edit policy and tenant-privileged override paths.
2. Require explicit orgUnit context for edits and persist originating `org_unit_id` in audit metadata.
3. Restrict merge operations to approved capability set with immutable audit trail.

**Owner:** ConnectShyft Backend  
**Timeline:** Sprint 0  
**Status:** Planned  
**Verification:** Authorization and audit tests confirm only permitted actors can change identity and provenance is complete.

---

### Assumptions and Dependencies

#### Assumptions

1. ConnectShyft architecture decisions are frozen for current implementation phase and will not introduce additional thread states.
2. Existing platform event/outbox mutation wrapper remains the required integration mechanism for ConnectShyft critical actions.
3. RouteShyft regression suite remains mandatory on ConnectShyft pull requests.

#### Dependencies

1. ConnectShyft schema migrations and DB indexes are deployed before broad integration testing (Sprint 0).
2. Twilio webhook credentials and signature secrets are available in test environments (Sprint 0).
3. Capability mapping source (`src/src/platform/rbac/capabilities.ts`) is updated before role-gated endpoint testing (Sprint 0).
4. Feature flags and kill-switch controls are wired in staging and production profiles before pilot enablement (Sprint 0).

#### Risks to Plan

- **Risk**: Worker scheduling cadence differs between local, CI, and staging environments.
  - **Impact**: Escalation timing assertions become unstable.
  - **Contingency**: Use deterministic scheduler tick controls in non-production test profiles.

- **Risk**: OrgUnit context assumptions leak into tenant-level governance actions.
  - **Impact**: Authorization and provenance tests become ambiguous.
  - **Contingency**: Freeze capability matrix and refusal contracts before test implementation starts.

---

**End of Architecture Document**

**Next Steps for Architecture Team:**

1. Close Sprint 0 blockers B-001 through B-004.
2. Assign owners and completion dates for all high-priority risks (R-001 through R-006).
3. Confirm ASR ownership and verification hooks.

**Next Steps for QA Team:**

1. Use `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-qa.md` for implementation sequencing.
2. Start integration coverage only after Sprint 0 blockers are complete.
3. Prioritize P0 and P1 suites tied to high-priority risks.
