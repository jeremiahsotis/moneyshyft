---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-25'
---

# Test Design: Epic UX - UX Remediation and Accessibility Hardening

**Date:** 2026-02-25  
**Author:** Jeremiah  
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for ConnectShyft Epic UX (`ux-r1` through `ux-r4`), focused on mobile-first interaction recovery, accessibility and plain-language hardening, voicemail indicator/state invariants, and outbound policy guardrail UX semantics.

**Risk Summary:**

- Total risks identified: 15
- High-priority risks (score >=6): 10
- Critical categories: BUS, SEC, OPS, TECH

**Coverage Summary:**

- P0 scenarios: 10 (~32-50 hours)
- P1 scenarios: 9 (~24-40 hours)
- P2/P3 scenarios: 7 (~16-32 hours)
- Total estimated effort: ~72-122 hours (~2.5-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Implementing Epic D (`d-1`, `d-2`, `d-4`) backend contracts | Epic UX validates operator-facing UX behavior, not the full outbound policy backend implementation itself. | Keep Epic D dependency stories as blocking prerequisites for `ux-r4`; run dependency gate checks in sprint status before enabling all UX tests. |
| Implementing Epic E (`e-3`, `e-4`) webhook/transcription pipeline | Epic UX validates voicemail behavior against contracts, but does not own Twilio ingestion/transcription implementation. | Treat `ux-r3` full pass as dependency-gated until `e-3`/`e-4` move beyond backlog and story files are present. |
| Cross-module RouteShyft UX or workflow behavior | Epic UX remediation is ConnectShyft-scoped and must avoid RouteShyft regressions. | Keep module-boundary and policy checks (`policy:check`) as first blocking gate in PR runs. |
| Tenant provisioning/admin governance redesign | Epic UX focuses on Inbox/Mine/Thread and outbound guardrails, not role administration IA redesign. | Reuse existing Epic A/B admin and capability suites as regression prerequisites. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-UX-001 | BUS | Mobile-first shell regresses to hidden/ambiguous primary navigation, recreating usability failure. | 2 | 3 | 6 | Enforce bottom-nav contract (`Inbox`, `Mine`, `More`) with breakpoint E2E assertions and visual contract checks. | Frontend + QA | Sprint UX-R1 |
| R-UX-002 | SEC | State-action matrix drifts from canonical contract, exposing unsafe or invalid actions by thread state. | 3 | 3 | 9 | Keep server-authored action matrix authoritative; add API + E2E parity tests for `UNCLAIMED`, `CLAIMED`, `CLOSED`. | ConnectShyft Backend + Frontend | Sprint UX-R1 / UX-R4 |
| R-UX-003 | DATA | Outbound from `CLOSED` creates/targets wrong thread instead of same-thread reopen semantics. | 2 | 3 | 6 | Validate same-thread `CLOSED -> UNCLAIMED` behavior for Call/Send Message with lifecycle-event assertions. | ConnectShyft Backend + QA | Sprint UX-R4 |
| R-UX-004 | SEC | `prefers_texting=NO` override reason guardrail is bypassed or inconsistently enforced. | 3 | 3 | 9 | Add refusal-path tests to ensure outbound SMS is blocked until valid override reason is provided and audited. | ConnectShyft Backend + Frontend | Sprint UX-R4 |
| R-UX-005 | BUS | Envelope outcomes (`success/refusal/error`) map to ambiguous or inaccessible UX feedback. | 2 | 3 | 6 | Centralize envelope-to-feedback mapping and assert deterministic copy/accessibility behavior across outcomes. | Frontend + QA | Sprint UX-R2 / UX-R4 |
| R-UX-006 | OPS | Voicemail indicators reclassify claimed threads into Inbox, breaking owner context. | 2 | 3 | 6 | Assert claimed voicemail remains in Mine and unclaimed voicemail remains in Inbox across API/E2E coverage. | ConnectShyft Backend + Frontend | Sprint UX-R3 |
| R-UX-007 | OPS | Voicemail-only events reset escalation/inactivity fields, violating locked lifecycle invariants. | 3 | 2 | 6 | Add API/integration checks that voicemail/missed inbound events do not reset escalation or inactivity timers. | ConnectShyft Backend | Sprint UX-R3 |
| R-UX-008 | TECH | Dependency story gaps (`d-1/d-2/d-4/e-3/e-4`) cause false-green UX acceptance or blocked execution. | 3 | 2 | 6 | Gate `ux-r3` and `ux-r4` completion on dependency readiness in sprint status and enforce blocked-story registry discipline. | PM + Tech Lead + QA | Sprint sequencing |
| R-UX-009 | OPS | Existing skipped lifecycle tests (`c-3`/`c-4`) hide regressions in UX-remediation-critical paths. | 3 | 2 | 6 | Convert skipped critical coverage to active suites or replacement coverage before Epic UX release gate pass. | QA + Release Engineering | Sprint UX-R1 through UX-R4 |
| R-UX-010 | PERF | Inbox/detail interaction latency breaches NFR (`p95 <= 750ms`, `p99 <= 1500ms`) after UI and contract hardening. | 2 | 3 | 6 | Include read-path performance checks in nightly lane with threshold assertions and query profiling feedback loop. | Backend + QA | Nightly hardening |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-UX-011 | BUS | Operator-facing copy leaks internal RBAC/UUID jargon, reducing trust and comprehension. | 2 | 2 | 4 | Add plain-language copy lint checks and E2E assertions for critical action labels and refusal text. | Frontend + Product + QA |
| R-UX-012 | PERF | Responsive typography/tap-target constraints regress on one or more breakpoints. | 2 | 2 | 4 | Add viewport matrix checks for min `16px` body text and `44px` interactive control targets. | Frontend + QA |
| R-UX-013 | DATA | Voicemail/transcription timing lag yields inconsistent indicator presentation between list and detail views. | 1 | 3 | 3 | Add eventual-consistency polling checks and deterministic label fallback behavior. | Backend + Frontend |
| R-UX-014 | OPS | Accessibility regressions (focus order, naming, announcements) are not caught early in PRs. | 2 | 2 | 4 | Add PR-blocking keyboard/screen-reader-oriented smoke checks for Inbox/Mine/Thread and Close flow. | QA + Frontend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-UX-015 | OPS | Visual styling drift in secondary surfaces (`More`, non-critical cards) accumulates over time. | 1 | 2 | 2 | Monitor in weekly visual regression review; non-blocking unless coupled to behavior drift. |

### Risk Category Legend

- **TECH**: Architecture/dependency and contract integration risk
- **SEC**: Policy bypass, authorization, or safety-rule enforcement risk
- **PERF**: Latency/throughput and interaction responsiveness risk
- **DATA**: Lifecycle and state/invariant integrity risk
- **BUS**: Operator usability and workflow outcome risk
- **OPS**: Delivery, gating, and operational reliability risk

---

## Entry Criteria

- [ ] UX remediation stories (`ux-r1`..`ux-r4`) approved with stable acceptance criteria.
- [ ] `c-3-inbox-and-thread-detail-read-contracts` remains `done` and contract-stable in sprint status.
- [ ] Dependency story files exist and are ready-for-dev or better for:
  - `d-1-outbound-sms-call-actions-that-preserve-escalation-semantics`
  - `d-2-preference-override-enforcement-for-outbound-sms`
  - `d-4-operator-interaction-contracts-for-outbound-safety`
  - `e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`
  - `e-4-transcription-webhook-attachment-to-voicemail-records`
- [ ] Locked UX artifacts and sprint-change proposal are the active source of truth for behavior conflicts.
- [ ] Test fixtures/factories for ConnectShyft C/D/E contracts are available and deterministic in CI.

## Exit Criteria

- [ ] All P0 scenarios pass (100%).
- [ ] P1 pass rate is >=95% with any failures explicitly triaged/waived.
- [ ] No unresolved high-priority defects for state-action matrix, override enforcement, voicemail placement, or reopen semantics.
- [ ] Accessibility and plain-language criteria pass across required breakpoints and input modes.
- [ ] Dependency-gated scenarios are either passing with ready dependencies or formally waived with owner and expiry.

---

## Test Coverage Plan

**Priority note:** P0/P1/P2/P3 represent risk and criticality, not execution timing.

### P0 (Critical)

**Criteria:** Blocks core operator workflows + high risk (>=6) + no viable workaround  
**Purpose:** Protect UX safety contracts, lifecycle invariants, and policy enforcement.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| UX-P0-001 | Primary navigation remains persistent bottom-nav (`Inbox`, `Mine`, `More`) with no hidden fourth tab. | E2E | R-UX-001 | `ux-r1` AC1 |
| UX-P0-002 | Inbox/Mine cards enforce minimum readability/tap-target constraints. | Component/E2E | R-UX-001, R-UX-012 | `ux-r1` AC2 |
| UX-P0-003 | Thread detail action sets match canonical state matrix across breakpoints. | API/E2E | R-UX-002 | `ux-r1` AC3 |
| UX-P0-004 | Outbound call from `CLOSED` reopens same thread to `UNCLAIMED` with lifecycle event marker. | API/E2E | R-UX-003 | `ux-r4` AC3 |
| UX-P0-005 | Outbound SMS from `CLOSED` reopens same thread and preserves canonical transition side effects. | API/E2E | R-UX-003 | `ux-r4` AC3 |
| UX-P0-006 | `prefers_texting=NO` blocks outbound SMS until valid override reason is supplied. | API/E2E | R-UX-004 | `ux-r4` AC2 |
| UX-P0-007 | Envelope outcomes (`success/refusal/error`) map to deterministic, accessible user feedback. | API/Component/E2E | R-UX-005 | `ux-r4` AC4 |
| UX-P0-008 | Claimed-thread voicemail remains in Mine with indicator and no forced Inbox relocation. | API/E2E | R-UX-006 | `ux-r3` AC1 |
| UX-P0-009 | Unclaimed-thread voicemail remains in Inbox with voicemail-received labeling contract. | API/E2E | R-UX-006 | `ux-r3` AC2 |
| UX-P0-010 | Voicemail-only events do not reset escalation/inactivity timers. | API/Integration | R-UX-007 | `ux-r3` AC3 |

### P1 (High)

**Criteria:** Critical operator flows + medium/high risk + frequent workflows  
**Purpose:** Validate usability clarity, accessibility semantics, and dependency-safe behavior.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| UX-P1-001 | Inbound voice/fallback events on `CLOSED` do not auto-reopen and keep closed action contract. | API/E2E | R-UX-003, R-UX-007 | `ux-r3` AC4 |
| UX-P1-002 | Focus order and keyboard traversal remain deterministic across Inbox/Mine/Thread primary controls. | E2E Accessibility | R-UX-014 | `ux-r2` AC3 |
| UX-P1-003 | Action labels and messages remain plain-language, verb-first, and avoid RBAC/UUID internals. | E2E/Component | R-UX-011 | `ux-r2` AC2/AC4 |
| UX-P1-004 | Header context prioritizes neighbor + conference info with no hidden policy paths on responsive layouts. | E2E | R-UX-001, R-UX-002 | `ux-r1` AC3/AC4 |
| UX-P1-005 | Refusal-state messages stay policy-specific and actionable without ambiguous fallback copy. | API/E2E | R-UX-005, R-UX-011 | `ux-r4` AC4 |
| UX-P1-006 | Accessibility constraints validated for `Add Neighbor` and `Close` flows in addition to Inbox/Mine/Thread. | E2E Accessibility | R-UX-012, R-UX-014 | `ux-r2` AC1/AC3 |
| UX-P1-007 | Dependency gating prevents declaring `ux-r3` done while `e-3/e-4` remain backlog/unavailable. | CI Contract | R-UX-008 | sprint-status rule validation |
| UX-P1-008 | Dependency gating prevents declaring `ux-r4` done while `d-1/d-2/d-4` remain backlog/unavailable. | CI Contract | R-UX-008 | sprint-status rule validation |
| UX-P1-009 | Previously skipped critical c-3/c-4 assertions are activated/replaced in merge-blocking lanes. | CI Contract | R-UX-009 | release readiness hard gate |

### P2 (Medium)

**Criteria:** Secondary resilience paths + low/medium risk  
**Purpose:** Catch drift in performance, consistency, and accessibility polish.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| UX-P2-001 | Inbox/detail p95/p99 latency budgets hold under representative UX-remediation data load. | API Perf | R-UX-010 | NFR-CS-011 |
| UX-P2-002 | Typography/tap-target contract validated across mobile/tablet/desktop viewport matrix. | Visual/Component | R-UX-012 | responsive regression guard |
| UX-P2-003 | Voicemail indicator and transcript-related labels remain consistent during delayed transcription arrival. | API/E2E | R-UX-013 | eventual consistency checks |
| UX-P2-004 | Envelope mapping helper remains centralized and consistent across thread/detail/inbox surfaces. | Unit/Component | R-UX-005, R-UX-011 | drift prevention |
| UX-P2-005 | Context and action discoverability remain stable when policy refusals are rendered repeatedly. | E2E | R-UX-002, R-UX-005 | no hidden/duplicated controls |

### P3 (Low)

**Criteria:** Exploratory and longer-run confidence checks  
**Purpose:** Raise confidence in edge interaction conditions beyond blocking gates.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| UX-P3-001 | Weekly exploratory senior-operator walkthroughs validate no-coaching usability baseline. | Manual/Usability | R-UX-001, R-UX-011 | evidence artifact required |
| UX-P3-002 | Long-run burn-in of voicemail + outbound guardrail interactions detects low-frequency drift. | Burn-in | R-UX-006, R-UX-009 | nightly-to-weekly extension |

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when total runtime remains under ~15 minutes; defer only expensive/long-running suites.

### PR

- Run all P0 tests and high-value P1 tests.
- Keep merge-blocking for UX contract invariants (state/action matrix, override guardrails, voicemail placement).
- Enforce dependency gate checks for `ux-r3` and `ux-r4` before claiming readiness.

### Nightly

- Run full P1 and P2 suites, including performance and accessibility matrix checks.
- Run dependency-integrated scenarios for any upstream stories that moved to ready state during the day.

### Weekly

- Run P3 burn-in and manual-assisted usability verification.
- Re-run cross-epic regression around C/D/E interaction boundaries and publish drift report.

---

## Resource Estimates

| Priority | Scenario Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | 10 | ~32-50 hours | Core state/action safety, override enforcement, voicemail invariants |
| P1 | 9 | ~24-40 hours | Accessibility, deterministic copy/feedback, dependency gate enforcement |
| P2 | 5 | ~12-24 hours | Performance + responsive drift hardening |
| P3 | 2 | ~4-8 hours | Burn-in and usability evidence collection |
| Total | 26 | ~72-122 hours | ~2.5-4 weeks for one QA engineer |

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- P0 pass rate: **100%**
- P1 pass rate: **>=95%**
- High-priority mitigations (`R-UX-001` through `R-UX-010`) complete or explicitly waived with owner/expiry
- Planned automated coverage on unblocked Epic UX scope: **>=80%**

### Non-Negotiable Conditions

- [ ] Canonical action matrix remains state-explicit and consistent across breakpoints.
- [ ] `prefers_texting=NO` override guardrail cannot be bypassed.
- [ ] Voicemail placement and timer invariants hold for claimed/unclaimed/closed scenarios.
- [ ] Envelope outcomes are deterministic and accessible (`success/refusal/error`).
- [ ] Dependency-gated stories (`ux-r3`, `ux-r4`) are not marked complete ahead of required upstream readiness.

---

## Mitigation Plans (Highest Priority)

### R-UX-002: State-action matrix drift creates unsafe action exposure (Score: 9)

- Mitigation strategy: lock API action contracts as source of truth, add API/E2E parity suite for all three thread states, and fail PR on matrix mismatch.
- Owner: ConnectShyft Backend + Frontend
- Timeline: Sprint UX-R1 and UX-R4
- Status: Planned
- Verification: all matrix assertions pass in API and E2E against same fixture contexts.

### R-UX-004: Outbound override enforcement bypass for `prefers_texting=NO` (Score: 9)

- Mitigation strategy: enforce backend refusal when override reason missing, validate no side effects, and surface deterministic refusal UX.
- Owner: ConnectShyft Backend + Frontend
- Timeline: Sprint UX-R4
- Status: Planned
- Verification: send attempts without override reason fail deterministically; valid override path succeeds and is audited.

### R-UX-008: Upstream dependency gaps create false readiness (Score: 6)

- Mitigation strategy: hard-block workflow progression and release sign-off when dependency stories remain backlog/missing context files.
- Owner: PM + Tech Lead + QA
- Timeline: Sprint sequencing
- Status: Planned
- Verification: sprint-status dependency checks and workflow guards enforce blocked status transitions.

---

## Assumptions and Dependencies

### Assumptions

1. Sprint-change proposal (2026-02-24) remains the authoritative remediation lock for UX behavior.
2. `c-3` read contracts remain stable and server-authored for ordering, action sets, and voicemail indicator semantics.
3. Canonical envelope semantics (`success/refusal/error`) remain unchanged platform-wide.

### Dependencies

1. `ux-r1` depends on `c-3-inbox-and-thread-detail-read-contracts`.
2. `ux-r2` depends on `ux-r1-mobile-first-inbox-mine-thread-redesign`.
3. `ux-r3` depends on `c-3`, `e-3`, and `e-4` readiness.
4. `ux-r4` depends on `d-1`, `d-2`, and `d-4` readiness.
5. `c-4` lifecycle behavior and reopen semantics should remain consistent for outbound UX parity.

### Risks to Plan

- Risk: dependency stories remain backlog while UX remediation continues.
  - Impact: incomplete UX validation, false-green status, and late regressions at integration time.
  - Contingency: enforce dependency gate and split validation into unblocked vs blocked scope with explicit waiver controls.

- Risk: high skip volume in existing C-lane suites masks regressions.
  - Impact: release confidence appears higher than actual behavior confidence.
  - Contingency: convert skipped assertions to active or equivalent replacement coverage before Epic UX release gate closure.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for Epic UX stories.
- Run `*automate` to scaffold expanded API/E2E suites once dependency stories are implementation-ready.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| ConnectShyft read contracts (`c-3`) | Epic UX consumes ordering/action/voicemail semantics directly. | Keep `c-3` API/E2E suites green and add UX-specific parity assertions. |
| ConnectShyft lifecycle actions (`c-4` + `d` lane) | Outbound reopen and guardrail behavior must stay deterministic and policy-safe. | Re-run close/reopen/claim lifecycle suites and add override enforcement checks. |
| Inbound voice/transcription (`e-3`, `e-4`) | Voicemail indicator behavior depends on reliable artifact/transcript lifecycle. | Validate UX-r3 only when inbound dependencies are present and green. |
| Shared response envelopes | UX feedback mapping depends on canonical envelope keys and outcome taxonomy. | Keep envelope contract suites in PR lane and verify UX mapping consistency. |
| Frontend ConnectShyft views/router | Mobile-first nav and accessibility hardening alter main operator surfaces. | Add responsive/a11y regression set for Inbox/Mine/Thread + Add Neighbor/Close flows. |

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
- Sprint change proposal: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`
- UX specification: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- Sprint status: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- Story inputs: `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/ux-r1-mobile-first-inbox-mine-thread-redesign.md` through `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/ux-r4-outbound-policy-guardrail-ui.md`

### Official Documentation Cross-Check

- Playwright best practices and parallelism: `https://playwright.dev/docs/best-practices`, `https://playwright.dev/docs/test-parallel`
- Cypress test isolation guidance: `https://docs.cypress.io/app/core-concepts/test-isolation`
- Pact provider verification guidance: `https://docs.pact.io/getting_started/provider_verification`
- GitHub Actions workflow concepts: `https://docs.github.com/en/actions/concepts/workflows-and-actions`

---

**Generated by:** BMad TEA Agent - Test Architect Module  
**Workflow:** `_bmad/tea/testarch/test-design`
