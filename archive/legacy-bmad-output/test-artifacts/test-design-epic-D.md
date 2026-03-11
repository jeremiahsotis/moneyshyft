---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-27'
---

# Test Design: Epic D - Policy-Safe Outbound Communication

**Date:** 2026-02-27
**Author:** Jeremiah (TEA workflow execution)
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for outbound communication safety across stories `d-1` through `d-4`, including lifecycle reopen semantics, preference override policy, audit/outbox atomicity, refusal contracts, and operator-safe UI interaction.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score >=6): 8
- Critical categories: DATA, SEC, TECH, OPS

**Coverage Summary:**

- P0 scenarios: ~22 tests (~28-44 hours)
- P1 scenarios: ~26 tests (~22-36 hours)
- P2/P3 scenarios: ~24 tests (~14-32 hours)
- **Total effort**: ~64-112 hours (~2-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Twilio carrier/provider internal reliability guarantees | Epic D validates our contract behavior, not provider SLA internals. | Keep provider outages handled via deterministic refusal/error envelopes and incident runbooks. |
| Full inbound webhook architecture redesign (Epic E) | Epic D consumes inbound constraints but does not redesign webhook ingestion. | Keep Epic E webhook suites as parallel regression dependency. |
| New lifecycle state expansion beyond `UNCLAIMED/CLAIMED/CLOSED` | Epic D assumes canonical state model is locked. | Enforce enum constraints in API/DB tests and fail on non-canonical state exposure. |
| Non-ConnectShyft product surfaces | This plan is scoped to ConnectShyft outbound safety contracts. | Run existing platform/RouteShyft regressions as merge gates. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-D-001 | TECH | Closed-thread outbound semantics drift (`new thread` vs `same-thread reopen`) due planning/architecture contract conflict. | 3 | 3 | 9 | Lock API contract and tests to same-thread reopen + `thread_reopened_by_user` lineage. | Backend Lead | Sprint D.1 |
| R-D-002 | BUS | Outbound on `UNCLAIMED` incorrectly resets escalation without explicit claim. | 2 | 3 | 6 | Add contract tests that assert no escalation reset for unclaimed outbound paths. | Backend Lead | Sprint D.1 |
| R-D-003 | OPS | Outbound call flow permits non-bridge or auto-redial behavior, creating unsafe operator outcomes. | 2 | 3 | 6 | Enforce bridge-only path and explicit no-auto-retry checks in API/service tests. | Voice Integrations | Sprint D.1-D.2 |
| R-D-004 | SEC | `prefers_texting=NO` policy can be bypassed if override reason validation is incomplete. | 3 | 3 | 9 | Require override reason + refusal contract tests for missing/invalid override data. | Backend + Security | Sprint D.2 |
| R-D-005 | DATA | Refusal path writes partial side effects (message/audit/outbox/state), violating determinism. | 3 | 3 | 9 | Add transaction-boundary assertions for refusal no-write guarantees. | Backend Lead | Sprint D.2-D.3 |
| R-D-006 | DATA | Successful outbound/governance actions persist domain state without atomic audit+outbox provenance. | 2 | 3 | 6 | Validate atomic writes and provenance fields in integration tests. | Backend Lead | Sprint D.3 |
| R-D-007 | TECH | UI state-action matrix drifts by breakpoint or state, exposing hidden or unsafe controls. | 2 | 3 | 6 | Add responsive E2E matrix tests for `UNCLAIMED/CLAIMED/CLOSED` action sets. | Frontend Lead | Sprint D.4 |
| R-D-008 | OPS | No dedicated Epic D suite allows regressions to hide behind existing C-lane tests. | 3 | 2 | 6 | Create story-aligned `d-1..d-4` API/E2E suites and CI tags. | QA Lead | Sprint D.1-D.4 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-D-009 | BUS | Policy refusal and override copy is not accessible/plain-language across desktop/tablet/mobile. | 2 | 2 | 4 | Add accessibility+content assertions in UI tests. | Frontend + UX |
| R-D-010 | OPS | Story dependency sequencing (`d-4` depends on `d-1/d-2/c-3`) is not enforced in execution flow. | 2 | 2 | 4 | Gate CI/story readiness checks using sprint-status and dependency assertions. | PM + QA |
| R-D-011 | PERF | Outbound lifecycle + metadata retrieval latency degrades thread-detail responsiveness. | 2 | 2 | 4 | Add API latency budgets and nightly performance checks. | Backend + QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-D-012 | SEC | Provider-specific error-code variance creates minor refusal copy drift without policy breach. | 1 | 2 | 2 | Monitor |

### Risk Category Legend

- **TECH**: Architecture and contract consistency risk
- **SEC**: Security/policy enforcement risk
- **PERF**: Performance and latency risk
- **DATA**: Integrity/atomicity/provenance risk
- **BUS**: Operator and business behavior risk
- **OPS**: Delivery sequencing and operability risk

---

## Entry Criteria

- [ ] Stories `d-1`..`d-4` acceptance criteria are locked and traceable to FR-CS-016/022/023/024.
- [ ] Dependency story `c-3` contract baseline remains green in current branch.
- [ ] ConnectShyft module entitlement and feature flags are enabled in test environment.
- [ ] Shared envelope helpers and mutation wrapper are available for outbound paths.
- [ ] Test fixtures exist for thread states (`UNCLAIMED`, `CLAIMED`, `CLOSED`) and `prefers_texting` variants.
- [ ] Audit/outbox stores are queryable in test environment for atomicity assertions.

## Exit Criteria

- [ ] All P0 tests pass (100%).
- [ ] P1 pass rate >=95% (or formally approved waiver).
- [ ] No open high-severity defects in policy enforcement, refusal no-side-effect behavior, or lifecycle reopen semantics.
- [ ] High-priority mitigations (R-D-001..R-D-008) are complete or explicitly waived with owner+expiry.
- [ ] Automated coverage reaches >=80% of planned Epic D matrix.

---

## Test Coverage Plan

**Note:** P0/P1/P2/P3 define priority/risk, not execution timing.

### P0 (Critical)

**Criteria:** Core safety behavior + high risk + no acceptable workaround.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Outbound call/message from `CLOSED` reopens same thread id, emits `thread_reopened_by_user`, and returns deterministic lifecycle metadata. | API + Integration | R-D-001 | 4 | QA | Includes prior/new state lineage assertions. |
| Outbound on `UNCLAIMED` does not reset escalation stage/count until explicit claim. | API | R-D-002 | 3 | QA | Includes negative claim-reset checks. |
| Call path enforces bridge-only orchestration, no auto-redial/retry, `CONNECTED` auto-claim only. | API + Integration | R-D-003 | 4 | QA | Includes transport/policy refusal branches. |
| `prefers_texting=NO` blocks SMS until valid override reason provided. | API | R-D-004 | 3 | QA | Validates required reason schema. |
| Missing/invalid override reason returns refusal with zero side effects. | API + Integration | R-D-004, R-D-005 | 3 | QA | Asserts no message/audit/outbox/state writes. |
| Approved override persists structured override + audit metadata with outbound event. | API + Integration | R-D-005, R-D-006 | 3 | QA | Verifies metadata linkage and actor provenance. |
| Success path writes domain + audit + outbox atomically for outbound/governance actions. | API + Integration | R-D-006 | 2 | QA | Transaction boundary assertions. |

**Total P0:** ~22 tests

### P1 (High)

**Criteria:** High-impact operator workflows and policy UX contracts.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| State-action matrix is explicit across breakpoints (`UNCLAIMED: Call/Text/Claim`, `CLAIMED: Call/Text/Close`, `CLOSED: Call/Send Message`). | E2E | R-D-007 | 5 | QA + Frontend | Desktop/tablet/mobile views. |
| Policy prompts, override inputs, and refusal banners are keyboard/screen-reader accessible. | E2E + Accessibility | R-D-007, R-D-009 | 4 | QA + Frontend | Focus order and ARIA coverage. |
| Closed-thread outbound UI feedback is explicit and deterministic (no hidden transition). | E2E | R-D-001, R-D-007 | 3 | QA | Verifies visible reopen confirmation. |
| Refusal envelope reason codes map to explicit operator-safe copy. | API + E2E | R-D-009 | 4 | QA | Success/refusal/error mapping checks. |
| Inbound voice/fallback on `CLOSED` does not auto-reopen thread. | API + Integration | R-D-001 | 3 | QA | Guards reopened-by-user lineage correctness. |
| Existing `c-4` lifecycle suites stay green with Epic D additions (regression anchor). | API + E2E | R-D-008 | 3 | QA | Prevents drift in foundational lifecycle behavior. |
| Story readiness/dependency gate checks enforce D-lane sequencing. | CI Contract | R-D-010 | 4 | QA + PM | Uses sprint status and workflow guards. |

**Total P1:** ~26 tests

### P2 (Medium)

**Criteria:** Secondary robustness and regression hardening.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Callback/idempotency ordering remains deterministic under duplicate call/message provider events. | Integration | R-D-005, R-D-011 | 4 | QA | Replay-safe behavior checks. |
| Outbound endpoints meet baseline latency under expected operator load. | API Perf | R-D-011 | 3 | QA | Nightly budget checks. |
| Cross-browser policy UI consistency for refusal/override flows. | E2E | R-D-009 | 3 | QA | Chromium/WebKit/Firefox parity. |
| Capability-based denial paths remain deterministic for non-privileged roles. | API | R-D-010 | 3 | QA | Negative authorization matrix. |
| Envelope and lifecycle event schema snapshots remain backward-compatible. | API Contract | R-D-006 | 3 | QA | Snapshot contract guard. |

**Total P2:** ~16 tests

### P3 (Low)

**Criteria:** Exploratory confidence checks and long-running diagnostics.

| Requirement | Test Level | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- |
| Burn-in loop for repeated close->outbound->claim cycles under concurrent operators. | Integration Burn-in | 3 | QA | Weekly run. |
| Exploratory stress on refusal copy and override UX under rapid retries. | Exploratory E2E | 2 | QA + UX | Human-in-loop validation. |
| Long-running audit/outbox growth and retention drift checks for D-lane events. | Ops Diagnostics | 3 | QA + Ops | Weekly monitoring companion. |

**Total P3:** ~8 tests

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when runtime remains within ~15 minutes; defer only expensive or long-running suites.

- **PR:** P0 + P1 + fast P2 functional/API/E2E suites.
- **Nightly:** full P2 + performance and idempotency replay scenarios.
- **Weekly:** P3 burn-in, long-running diagnostics, and manual operability spot checks.

---

## Resource Estimates

### Test Development Effort (Ranges)

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~22 | ~28-44 hours | Lifecycle + policy + atomicity core contracts |
| P1 | ~26 | ~22-36 hours | UI accessibility + dependency and regression contracts |
| P2 | ~16 | ~10-22 hours | Robustness/perf/regression hardening |
| P3 | ~8 | ~4-10 hours | Burn-in and exploratory diagnostics |
| **Total** | **~72** | **~64-112 hours** | **~2-4 weeks (single QA engineer)** |

### Prerequisites

- Stable story fixtures for thread state and `prefers_texting` combinations.
- Deterministic test data cleanup for outbound/audit/outbox side effects.
- CI tagging strategy for Epic D suites (`@d1`..`@d4`, `@P0`..`@P3`).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigations:** 100% complete or waived with explicit owner and expiry
- **Refusal no-side-effect contract:** zero violations across P0/P1 suites

### Coverage Targets

- **Lifecycle reopen and escalation semantics:** 100%
- **Preference policy enforcement (`prefers_texting`):** 100%
- **Audit/outbox atomicity coverage:** >=90%
- **UI policy accessibility and action-matrix coverage:** >=80%

### Non-Negotiable Requirements

- [ ] No regression on same-thread reopen contract.
- [ ] No partial writes on refusal paths.
- [ ] No unauthorized bypass on outbound call/message actions.
- [ ] No hidden or state-inconsistent UI action controls.

---

## Mitigation Plans

### R-D-001: Closed-thread semantics drift (Score: 9)

**Mitigation Strategy:**
1. Freeze outbound-from-closed contract to same-thread reopen behavior.
2. Add API contract assertions for `thread_reopened_by_user` and thread-id continuity.
3. Add E2E assertion that UI surfaces explicit reopen state transition.

**Owner:** Backend Lead  
**Timeline:** Sprint D.1  
**Status:** Planned  
**Verification:** API/E2E suites confirm same-thread id continuity and explicit lifecycle event metadata.

### R-D-004: Override bypass when `prefers_texting=NO` (Score: 9)

**Mitigation Strategy:**
1. Enforce server-authoritative override reason validation.
2. Validate refusal envelopes for missing/invalid override payloads.
3. Add accessibility-safe operator messaging checks for override/refusal flow.

**Owner:** Backend + Security  
**Timeline:** Sprint D.2  
**Status:** Planned  
**Verification:** Negative-path suites prove send blocked and refusal returned without side effects.

### R-D-005: Refusal path partial writes (Score: 9)

**Mitigation Strategy:**
1. Wrap outbound mutation paths with atomic transaction boundaries.
2. Assert no domain/audit/outbox writes on refusal outcomes.
3. Add replay/idempotency checks for duplicate refusal-triggering requests.

**Owner:** Backend Lead  
**Timeline:** Sprint D.2-D.3  
**Status:** Planned  
**Verification:** Integration assertions show write-count remains zero for refused actions.

### R-D-008: No dedicated Epic D suite baseline (Score: 6)

**Mitigation Strategy:**
1. Add story-specific API and E2E files for `d-1..d-4`.
2. Tag suites for selective CI execution and quality gate reporting.
3. Require these suites in PR lane before Epic D release.

**Owner:** QA Lead  
**Timeline:** Sprint D.1-D.4  
**Status:** Planned  
**Verification:** CI report includes explicit Epic D suite status with zero skipped critical tests.

---

## Assumptions and Dependencies

### Assumptions

1. Epic D hardening language in sprint-change proposal remains authoritative over older conflicting wording.
2. Shared envelope taxonomy (`success/refusal/error`) remains unchanged across platform routes.
3. Existing `c-4` lifecycle suites remain a stable regression anchor for reopen semantics.

### Dependencies

1. `c-3-inbox-and-thread-detail-read-contracts` remains complete and compatible with Epic D API fields.
2. Story sequencing in sprint status remains accurate for `d-1`, `d-2`, `d-3`, `d-4`.
3. Test environment exposes audit/outbox read paths for provenance verification.

### Risks to Plan

- **Risk:** Contract wording drift between architecture and sprint-change artifacts.
  - **Impact:** Test failures or behavior mismatches during implementation.
  - **Contingency:** Treat sprint-change proposal + story ACs as source of truth; raise ADR errata if needed.

- **Risk:** High skipped-test debt obscures true readiness signals.
  - **Impact:** False confidence in merge gates.
  - **Contingency:** Require critical Epic D suites unskipped before release gate.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for stories `d-1..d-4`.
- Run `*automate` after implementation to expand P1/P2 coverage.
- Run `*trace` to map Epic D requirements to implemented tests and gate decision.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| `src/src/routes/api/v1/connectshyft.ts` outbound/lifecycle handlers | Primary Epic D contract surface | API contract and refusal/atomicity regression suites |
| `src/src/modules/connectshyft/threads.ts` thread state persistence | Lifecycle + metadata integrity | Integration tests for state transitions and side effects |
| Existing `c-4` API/E2E suites | Upstream lifecycle baseline | Must remain green with D-lane changes |
| `frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue` | Operator policy visibility/accessibility | E2E accessibility and action-matrix checks |
| Platform envelope/mutation wrappers | Shared refusal and event outbox behavior | Regression checks for envelope shape and atomic writes |

---

## Appendix

### Knowledge Base References

- `_bmad/tea/testarch/knowledge/risk-governance.md`
- `_bmad/tea/testarch/knowledge/probability-impact.md`
- `_bmad/tea/testarch/knowledge/test-levels-framework.md`
- `_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
- `_bmad/tea/testarch/knowledge/playwright-cli.md`

### Related Documents

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`
- `_bmad-output/implementation-artifacts/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.md`
- `_bmad-output/implementation-artifacts/d-2-preference-override-enforcement-for-outbound-sms.md`
- `_bmad-output/implementation-artifacts/d-3-outbound-audit-outbox-and-refusal-envelope-integration.md`
- `_bmad-output/implementation-artifacts/d-4-operator-interaction-contracts-for-outbound-safety.md`

### External Documentation Cross-Check

- Playwright best practices and parallelization docs
- Cypress test isolation docs
- Pact provider verification docs
- GitHub Actions workflow concepts docs

---

**Generated by**: BMad TEA Agent - Test Architect Module  
**Workflow**: `_bmad/tea/workflows/testarch/test-design`  
**Version**: 5.0 (step-file architecture)
