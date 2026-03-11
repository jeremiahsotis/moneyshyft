---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-24'
---

# Test Design: Epic C - OrgUnit Inbox and Thread Lifecycle

**Date:** 2026-02-24  
**Author:** Jeremiah  
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for ConnectShyft Epic C (`c.1` through `c.5`), focused on canonical thread lifecycle constraints, conflict-safe thread ensure semantics, deterministic inbox/read contracts, governed lifecycle transitions, and deterministic escalation scheduler behavior.

**Risk Summary:**

- Total risks identified: 13
- High-priority risks (score >=6): 10
- Critical categories: DATA, OPS, SEC, TECH

**Coverage Summary:**

- P0 scenarios: 11 (~36-56 hours)
- P1 scenarios: 8 (~24-40 hours)
- P2/P3 scenarios: 7 (~16-32 hours)
- Total estimated effort: ~76-128 hours (~2.5-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Epic B neighbor-governance mutation behavior | Epic C validates thread lifecycle and inbox contracts, not neighbor edit/merge policy flows. | Keep Epic B suites (`b-1`..`b-4`) as parallel regression gates; ensure `c.3` outputs remain dependency-compatible. |
| Epic D outbound policy exception UX beyond reopen semantics | Epic C owns lifecycle/reopen foundation, not full outbound policy enforcement/override workflows. | Reuse reopen and transition invariants as upstream regression hooks for Epic D stories. |
| Epic E full webhook ingestion/transcription pipeline | Epic C only validates closed-thread inbound fallback/no-auto-reopen lifecycle interactions. | Keep webhook signature/replay and voicemail artifact depth in Epic E gates. |
| RouteShyft feature behavior changes | Epic C must not alter RouteShyft runtime behavior or module boundaries. | Maintain `policy:check` and import-boundary enforcement as first blocking checks. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | DATA | Concurrent thread ensure requests create duplicate active threads for the same `(tenant_id, org_unit_id, neighbor_id)`. | 3 | 3 | 9 | Enforce partial unique active-thread index + conflict-safe insert/fetch strategy with contention tests. | ConnectShyft Backend | Sprint C.1-C.2 |
| R-002 | TECH | Ensure endpoint returns inconsistent payloads between create and reuse paths, causing client idempotency drift. | 2 | 3 | 6 | Freeze response contract and assert stable thread identity/fields across retry and conflict paths. | ConnectShyft Backend + API Contracts | Sprint C.2 |
| R-003 | DATA | Canonical lifecycle state constraints/indexes are incomplete, allowing invalid state/storage invariants. | 2 | 3 | 6 | Validate enum lock (`UNCLAIMED|CLAIMED|CLOSED`) and index-backed persistence constraints at migration/integration levels. | Platform Backend | Sprint C.1 |
| R-004 | TECH | Inbox ordering and `priority_rank` mapping drift from locked deterministic contract. | 2 | 3 | 6 | Centralize rank/order logic server-side and add deterministic tie-break tests (`thread_id ASC`). | ConnectShyft Backend + Frontend | Sprint C.3 |
| R-005 | SEC | Claim/takeover/close actions can be executed by unauthorized actors due to guard inconsistency. | 3 | 3 | 9 | Enforce capability + orgUnit membership checks at route/service layers with deny-by-default tests. | Platform RBAC + ConnectShyft Backend | Sprint C.4 |
| R-006 | OPS | Lifecycle transition audit/outbox records are missing actor/orgUnit/prior/new state in some paths. | 2 | 3 | 6 | Require transaction-coupled mutation+outbox writes and validate mandatory provenance metadata fields. | Platform Events + ConnectShyft Backend | Sprint C.4 |
| R-007 | BUS | CLOSED outbound call/message behavior diverges from lock: wrong thread reopened or incorrect lifecycle reset semantics. | 2 | 3 | 6 | Enforce same-thread `CLOSED -> UNCLAIMED` reopen with `thread_reopened_by_user` event and reset assertions. | ConnectShyft Backend + Frontend | Sprint C.4 |
| R-008 | OPS | Inbound voice/fallback intake incorrectly auto-reopens CLOSED threads, violating locked lifecycle behavior. | 2 | 3 | 6 | Add explicit no-auto-reopen guards and timeline fallback assertions for inbound paths. | ConnectShyft Backend | Sprint C.4 |
| R-009 | OPS | Escalation progression (`X -> 2X -> 3X`) is non-deterministic under retries/restarts. | 3 | 3 | 9 | Use persisted `next_evaluation_at_utc`, bounded due-batch locks, and restart-safe deterministic scheduler tests. | ConnectShyft Backend + Platform Ops | Sprint C.5 |
| R-010 | OPS | Escalation reset and notification suppression occur outside explicit claim flow. | 3 | 2 | 6 | Enforce claim-only reset invariant and verify pending escalation cancellation semantics on claim. | ConnectShyft Backend | Sprint C.5 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-011 | PERF | Inbox/detail endpoints breach latency goals (`p95 <= 750ms`, `p99 <= 1500ms`) under expected load. | 2 | 2 | 4 | Add read-path performance assertions and query-plan profiling for deterministic sort/filter paths. | ConnectShyft Backend + QA |
| R-012 | PERF | Due-thread scan throughput degrades without stable scheduler index usage. | 2 | 2 | 4 | Validate due-selection query plans and run periodic scheduler throughput checks. | Platform Backend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-013 | OPS | Story dependency sequencing drifts (e.g., C4/C5 starts before C2/C3 readiness), producing false-green coverage. | 1 | 2 | 2 | Monitor via sprint-status dependency gate and workflow guard enforcement. |

### Risk Category Legend

- **TECH**: Technical architecture and deterministic contract risks
- **SEC**: Authorization and policy-enforcement risks
- **PERF**: Latency/throughput and scale-path risks
- **DATA**: Persistence and invariant integrity risks
- **BUS**: Operator workflow/business outcome risks
- **OPS**: Delivery, scheduler, and operational safety risks

---

## Entry Criteria

- [ ] Epic C stories (`c.1` through `c.5`) are approved with stable acceptance criteria
- [ ] Epic A escalation baseline config (`a.4`) is available for scheduler baseline dependency
- [ ] ConnectShyft schema namespace and migration pipeline are available in local/CI environments
- [ ] Shared response envelope + tenancy/context + capability guards from prior stories remain green
- [ ] Sprint dependency gating is active (`no_story_starts_with_unmet_dependencies`)

## Exit Criteria

- [ ] All P0 scenarios pass (100%)
- [ ] P1 pass rate is >=95% with triaged exceptions only
- [ ] No unresolved high-priority defects in thread identity, lifecycle transitions, or escalation semantics
- [ ] Deterministic ordering, reopen behavior, and claim-only reset semantics are validated in API/E2E lanes
- [ ] Team agrees coverage is sufficient for Epic C readiness and downstream dependency unblocking

---

## Test Coverage Plan

**Priority note:** P0/P1/P2/P3 represent risk and criticality, not execution timing.

### P0 (Critical)

**Criteria:** Blocks core lifecycle functionality + high risk (>=6) + no viable workaround  
**Purpose:** Protect thread identity invariants, lifecycle governance, and deterministic escalation behavior.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| C-P0-001 | `cs_threads` enforces canonical state enum and required lifecycle metadata fields. | API/Integration | R-003 | c.1 AC1 |
| C-P0-002 | Partial unique active-thread constraint blocks duplicates under contention. | Integration | R-001, R-003 | c.1 AC2 |
| C-P0-003 | Concurrent `POST /api/v1/connectshyft/threads` requests return one shared active thread identity. | API | R-001, R-002 | c.2 AC1/AC2 |
| C-P0-004 | Conflict/retry ensure paths never leave multiple active rows for one identity key. | API/Integration | R-001 | c.2 AC1 |
| C-P0-005 | Inbox/thread detail responses remain orgUnit-scoped and include required metadata fields. | API | R-004 | c.3 AC1 |
| C-P0-006 | Inbox ordering follows locked deterministic sort (`priority_rank`, `last_activity_at_utc`, `thread_id`). | API | R-004 | c.3 AC2 |
| C-P0-007 | Claim/takeover/close enforce valid transition matrix with capability/membership guardrails. | API | R-005 | c.4 AC1 |
| C-P0-008 | CLOSED outbound call/message reopens same thread as `UNCLAIMED` and emits `thread_reopened_by_user`. | API/E2E | R-007 | c.4 AC3 |
| C-P0-009 | CLOSED inbound voice/fallback events do not auto-reopen thread state. | API | R-008 | c.4 AC4 |
| C-P0-010 | Scheduler advances escalation deterministically using persisted due timestamps (`X -> 2X -> 3X`). | Integration | R-009 | c.5 AC1 |
| C-P0-011 | Explicit claim resets escalation state and suppresses pending escalation notifications. | API/Integration | R-010 | c.5 AC2 |

### P1 (High)

**Criteria:** Critical operator flows + medium/high risk + common usage paths  
**Purpose:** Validate human-facing contract semantics and auditability beyond core invariants.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| C-P1-001 | Urgency labels map to plain-language contract (no raw stage leakage). | API/E2E | R-004 | c.3 AC3 |
| C-P1-002 | Voicemail on CLAIMED threads keeps item in Mine with voicemail indicator and no Inbox bounce. | E2E | R-004, R-008 | c.3 AC4 |
| C-P1-003 | Thread detail action sets match state contract (`UNCLAIMED`, `CLAIMED`, `CLOSED`). | API/E2E | R-005, R-007 | c.3 AC5 |
| C-P1-004 | Successful lifecycle transitions emit audit/outbox with actor, orgUnit, prior/new state fields. | API/Integration | R-006 | c.4 AC2 |
| C-P1-005 | Invalid transitions and unauthorized lifecycle actions return deterministic refusal envelopes without leakage. | API | R-005 | c.4 AC1 |
| C-P1-006 | Escalation baseline validation enforces integer range (`1-24`) and default fallback behavior. | API | R-009, R-010 | c.5 AC1 + a.4 dependency |
| C-P1-007 | Retry/restart scheduler runs remain replay-safe with no duplicate escalation side effects. | Integration | R-009, R-010 | c.5 resilience |
| C-P1-008 | Downstream compatibility contract holds: c.3 outputs unblock dependent stories (`b.3`, `b.4`, `d.1`). | CI Contract | R-013 | dependency governance |

### P2 (Medium)

**Criteria:** Secondary and regression-hardening behavior  
**Purpose:** Prevent drift in performance, no-leak contracts, and delivery safety checks.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| C-P2-001 | Inbox/detail latency budgets (`p95/p99`) hold under representative data volume. | API Perf | R-011 | c.3 NFR-CS-011 |
| C-P2-002 | Due-thread query plans use scheduler indexes and remain stable over growth. | Integration/Perf | R-012 | c.1/c.5 query safety |
| C-P2-003 | Blocked claim/takeover/close attempts keep no-leak payload constraints (no hidden thread internals). | API | R-005 | refusal contract hardening |
| C-P2-004 | Route/service contract parity remains stable across create/reuse ensure paths and lifecycle actions. | API Contract | R-002, R-006 | payload consistency |
| C-P2-005 | Policy and import-boundary checks stay green after Epic C route/module additions. | CI Contract | R-013 | parallel-delivery safety |

### P3 (Low)

**Criteria:** Exploratory and long-duration resilience checks  
**Purpose:** Increase confidence for timing- and concurrency-sensitive paths.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| C-P3-001 | High-contention burn-in for thread ensure race windows across repeated parallel runs. | Integration Burn-in | R-001, R-002 | optional deep hardening |
| C-P3-002 | Long-run scheduler chaos drill (restarts, delayed ticks) verifies deterministic progression and recovery. | Ops Simulation | R-009, R-010 | weekly resilience confidence |

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when runtime remains under ~15 minutes; defer only expensive/long-running suites.

### PR

- Run all P0 and P1 scenarios and fast P2 checks.
- Keep this lane merge-blocking for Epic C readiness.

### Nightly

- Run extended P2 suites (performance/query-plan checks and contract consistency checks).
- Run expanded scheduler retry/restart scenarios that exceed PR budget.

### Weekly

- Run long-duration burn-in and chaos-style scheduler/ensure stress suites.
- Run extended dependency and traceability checks for downstream epic compatibility.

---

## Resource Estimates

| Priority | Scenario Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | 11 | ~36-56 hours | Concurrency, lifecycle transitions, and scheduler determinism complexity |
| P1 | 8 | ~24-40 hours | UX contract semantics, auditability, and dependency assertions |
| P2 | 5 | ~12-24 hours | Performance and regression hardening |
| P3 | 2 | ~4-8 hours | Exploratory burn-in and chaos drills |
| Total | 26 | ~76-128 hours | ~2.5-4 weeks for one QA engineer |

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- P0 pass rate: **100%**
- P1 pass rate: **>=95%**
- High-risk mitigations (`R-001` through `R-010`) complete before release sign-off
- Planned automated coverage across Epic C scope: **>=80%**

### Non-Negotiable Conditions

- [ ] Single active-thread invariant remains intact under concurrency
- [ ] CLOSED outbound actions reopen same thread correctly; CLOSED inbound does not auto-reopen
- [ ] Claim-only escalation reset and pending notification suppression are validated
- [ ] Deterministic inbox ordering/rank mapping remains stable and server-authoritative
- [ ] Lifecycle transitions preserve complete audit/outbox provenance metadata

---

## Mitigation Plans (Highest Priority)

### R-001: Duplicate active-thread creation under contention (Score: 9)

- Mitigation strategy: partial unique active index + conflict-safe ensure implementation + parallel contention tests.
- Owner: ConnectShyft Backend
- Timeline: Sprint C.1-C.2
- Status: Planned
- Verification: repeated concurrent ensure tests always return a single active thread identity and one active row.

### R-005: Unauthorized lifecycle transitions (Score: 9)

- Mitigation strategy: strict capability/membership guardrails at route and service layers with deterministic refusal behavior.
- Owner: Platform RBAC + ConnectShyft Backend
- Timeline: Sprint C.4
- Status: Planned
- Verification: unauthorized users cannot claim/takeover/close; authorized paths succeed with auditable side effects.

### R-009: Non-deterministic escalation progression (Score: 9)

- Mitigation strategy: persisted due-time scheduler, lock-safe due-row processing, restart/retry-safe mutation semantics.
- Owner: ConnectShyft Backend + Platform Ops
- Timeline: Sprint C.5
- Status: Planned
- Verification: controlled-clock and restart tests preserve exact progression sequence and no duplicate escalation events.

---

## Assumptions and Dependencies

### Assumptions

1. Epic C acceptance criteria and sprint-change hardening rules remain authoritative during implementation.
2. Existing tenancy, envelope, and capability contracts from prior platform/ConnectShyft stories stay stable.
3. Scheduler and lifecycle services continue using centralized time and transaction/outbox primitives.

### Dependencies

1. `c.2` depends on `c.1` (schema/index invariants must exist first).
2. `c.3` depends on `c.2` (ensure identity contract before read-model hardening).
3. `c.4` depends on `c.2` and `c.3` (transition semantics rely on ensured/read contracts).
4. `c.5` depends on `c.4` and `a.4` (claim semantics + escalation baseline config).

### Risks to Plan

- Risk: runtime scheduler cadence/config differs across local, CI, and staging.
  - Impact: timing assertions become noisy and can hide true regressions.
  - Contingency: use deterministic clock controls and environment-specific scheduler test profiles.

- Risk: UI hardening updates drift from locked lifecycle action semantics.
  - Impact: API/UI mismatch for action availability and urgency labeling.
  - Contingency: enforce API/E2E parity checks and treat sprint change proposal as source of truth for conflicts.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 test skeletons for Epic C stories.
- Run `*automate` to scaffold broader API/E2E coverage from this plan once implementation surfaces are ready.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| Platform tenancy/orgUnit context | Epic C endpoints require strict context enforcement for all read/write lifecycle actions. | Keep `a-2` context-enforcement API/E2E suites green and extend with Epic C lifecycle endpoints. |
| Platform RBAC capability model | Claim/takeover/close and thread visibility contracts rely on capability correctness. | Keep `a-5` capability/envelope suites green and add Epic C role-matrix scenarios. |
| Platform events/outbox pipeline | Lifecycle transitions require transaction-coupled audit and outbox persistence. | Re-run outbox/event contract suites and add Epic C transition provenance assertions. |
| Escalation config baseline (`a.4`) | Scheduler progression depends on validated integer-hour baseline and recipient config. | Re-run escalation config suites with Epic C scheduler integration checks. |
| Downstream Epic dependencies (`b.3`, `b.4`, `d.1`) | Epic C contracts unblock relationship-gated edits and outbound lifecycle policy behavior. | Enforce sprint dependency gates and maintain traceability from Epic C acceptance criteria to downstream suites. |

---

## Appendix

### Knowledge Base References

- `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/risk-governance.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/probability-impact.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/test-levels-framework.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad/tea/testarch/knowledge/playwright-cli.md`

### Related Documents

- PRD: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- Epic breakdown: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- Architecture: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- Sprint change hardening: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`
- Story inputs: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.md` through `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/c-5-deterministic-escalation-scheduler-with-claim-only-reset.md`
- Sprint status: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Official Documentation Cross-Check

- Playwright parallelism and best practices: `https://playwright.dev/docs/test-parallel`, `https://playwright.dev/docs/best-practices`
- Cypress test isolation guidance: `https://docs.cypress.io/app/core-concepts/test-isolation`
- Pact provider verification guidance: `https://docs.pact.io/getting_started/provider_verification`
- GitHub Actions workflow concepts: `https://docs.github.com/en/actions/concepts/workflows-and-actions`

---

**Generated by:** BMad TEA Agent - Test Architect Module  
**Workflow:** `_bmad/tea/testarch/test-design`
