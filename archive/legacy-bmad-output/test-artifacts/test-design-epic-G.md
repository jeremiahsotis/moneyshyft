---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-03-06'
---

# Test Design: Epic G - ConnectShyft UX Rebuild (CS-E7)

**Date:** 2026-03-06
**Author:** Jeremiah (TEA workflow execution)
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for stories `g-1` through `g-6`, focused on volunteer-first UX rebuild, display-safe contract boundaries, IA role separation, responsive behavior lock, and anti-regression quality gates.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score >=6): 7
- Critical categories: TECH, BUS, SEC, DATA, OPS

**Coverage Summary:**

- P0 scenarios: ~26 tests (~34-52 hours)
- P1 scenarios: ~30 tests (~28-44 hours)
- P2/P3 scenarios: ~28 tests (~18-36 hours)
- **Total effort**: ~80-132 hours (~2.5-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Backend domain/lifecycle redesign | Epic G is presentation-first; canonical thread/routing semantics are already locked by prior epics. | Reuse C/D/E/F regression suites to verify no semantic drift. |
| Provider adapter or webhook protocol changes | Provider abstraction/cutover belongs to Epic F/E lanes. | Keep provider behavior checks as dependency regression gates only. |
| Full admin-console IA redesign outside ConnectShyft volunteer surfaces | Epic G targets volunteer IA separation and safe routing, not full admin product redesign. | Cover admin-path gate/visibility parity and refusal contracts only. |
| Non-ConnectShyft module UX remediation | Scope is restricted to ConnectShyft volunteer surfaces and contracts. | Ensure route/module boundaries remain enforced via policy and lane checks. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-G-001 | TECH | Volunteer surfaces leak internal fields (`threadId`, `priorityRank`, cs number IDs, routing metadata) as primary UI content. | 3 | 3 | 9 | Enforce display-safe adapters and block forbidden fields in UI contracts + regression tests. | Frontend Lead + QA | Sprint G.1-G.3 |
| R-G-002 | BUS | State-action matrix drifts from locked lifecycle rules (`UNCLAIMED/CLAIMED/CLOSED`) and closed-thread reopen semantics. | 2 | 3 | 6 | Add deterministic API/E2E assertions for action visibility, reopen behavior, and feedback taxonomy. | QA Lead + Backend | Sprint G.3-G.6 |
| R-G-003 | SEC | Volunteer IA/admin route separation breaks, exposing privileged settings paths to unauthorized users. | 2 | 3 | 6 | Harden router/access-store role gates and deep-link refusal tests across breakpoints. | Frontend + Platform Security | Sprint G.5 |
| R-G-004 | DATA | Add Neighbor + Directory start/open conversation flow causes partial writes or non-deterministic thread ensure outcomes. | 2 | 3 | 6 | Add API integration tests for required-field validation, refusal no-write, and deterministic thread ensure reuse. | Backend + QA | Sprint G.4 |
| R-G-005 | BUS | Voicemail ownership behavior regresses (claimed thread churns back to Inbox; timeline not first-class). | 3 | 2 | 6 | Re-run and extend voicemail placement/lifecycle cases with Epic G UI contract assertions. | QA | Sprint G.2-G.6 |
| R-G-006 | OPS | Existing UX-R test suites are not enough to guard new CS-S7 contracts, allowing silent UX drift. | 3 | 2 | 6 | Add `g-1`..`g-6` story-aligned suites and make CS-E7 lane checks merge-blocking. | QA + Release Engineering | Sprint G.1-G.6 |
| R-G-007 | TECH | Responsive interaction model (mobile full-screen, tablet split, desktop 3-column) drifts by view/state. | 2 | 3 | 6 | Add breakpoint-matrix E2E cases with deterministic navigation/search/context persistence checks. | Frontend + QA | Sprint G.2-G.4 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-G-008 | BUS | Accessibility and plain-language constraints regress after primitive refactors. | 2 | 2 | 4 | Add keyboard/screen-reader/touch-target checks in component + E2E suites. | QA + UX |
| R-G-009 | PERF | Inbox/thread read performance degrades under richer volunteer surfaces, breaching NFR-CS-011 budgets. | 2 | 2 | 4 | Add API perf smoke checks and payload/render budget monitoring. | Backend + QA |
| R-G-010 | OPS | `success/refusal/error` feedback copy/behavior diverges across actions and breakpoints. | 2 | 2 | 4 | Add shared feedback-contract assertions across API + E2E action paths. | QA + Frontend |
| R-G-011 | TECH | Token layer adoption is inconsistent, causing style drift and duplicate primitives. | 2 | 2 | 4 | Add lint/snapshot guards for token usage and primitive reuse in target surfaces. | Frontend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-G-012 | OPS | Minor visual/copy inconsistency in low-priority More/Settings secondary text. | 1 | 2 | 2 | Monitor |

### Risk Category Legend

- **TECH**: Architecture, contract, and implementation drift
- **SEC**: Authorization/role exposure risks
- **PERF**: Latency/render scalability risks
- **DATA**: Validation, identity, and deterministic-write risks
- **BUS**: Volunteer usability/workflow risks
- **OPS**: Delivery, CI gating, and operational consistency risks

---

## Entry Criteria

- [ ] Stories `g-1`..`g-6` remain `ready-for-dev` and dependency graph is intact in sprint status.
- [ ] Epic G validation report remains clean (0 blocking findings).
- [ ] Volunteer adapter boundary scope from `CS-E7` sprint-change proposal is accepted and frozen.
- [ ] Test fixtures exist for role matrix, voicemail lifecycle, and thread state/action permutations.
- [ ] Breakpoint test matrix is available (mobile/tablet/desktop) with deterministic viewport definitions.
- [ ] CI lane includes merge-blocking policy/test/quality-gate checks for CS-E7 regressions.

## Exit Criteria

- [ ] All P0 tests pass (100%).
- [ ] P1 pass rate >=95% (or formally approved waiver).
- [ ] No open high-priority defects on display-safe suppression, lifecycle action matrix, role-gated IA, or voicemail behavior lock.
- [ ] High-priority mitigations (R-G-001..R-G-007) are complete or explicitly waived with owner and expiry.
- [ ] Automated Epic G coverage reaches >=80% of planned matrix.

---

## Test Coverage Plan

**Note:** P0/P1/P2/P3 define priority/risk, not execution timing.

### P0 (Critical)

**Criteria:** Core volunteer-safety and deterministic behavior with no acceptable workaround.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Inbox/Mine cards suppress raw internal fields (`threadId`, `priorityRank`, cs number IDs) from primary copy. | E2E + Component | R-G-001 | 4 | QA | Includes positive friendly-summary assertions and forbidden-field checks. |
| Thread detail enforces locked state-action set (`UNCLAIMED/CLAIMED/CLOSED`) and closed-thread outbound reopen semantics. | API + E2E | R-G-002 | 5 | QA | Includes same-thread reopen + inbound no-auto-reopen checks. |
| Volunteer IA vs admin route separation enforced for `/app/connectshyft/settings/*` deep links and nav states. | E2E + API | R-G-003 | 4 | QA | Authorized-only path and refusal contract validation. |
| Add Neighbor required contact validation and refusal no-partial-write behavior. | API + Integration | R-G-004 | 3 | QA | Required phone constraints + clean refusal side-effects. |
| Directory search + deterministic open/start conversation uses active-thread ensure semantics. | API + E2E | R-G-004 | 3 | QA | Existing-thread reuse vs new-thread create determinism. |
| Claimed voicemail remains in Mine with timeline-first voicemail rendering parity. | API + E2E | R-G-005 | 4 | QA | Placement + lifecycle + timeline contract. |
| CS-E7 regression lane (policy + test + burn-in + quality gate) blocks merge on contract drift. | CI Contract | R-G-006 | 3 | QA + Release Eng | Merge-blocking assertions and report validation. |

**Total P0:** ~26 tests

### P1 (High)

**Criteria:** High-impact interaction and contract hardening scenarios.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Responsive interaction lock: mobile thread full-screen, tablet split view, desktop three-column workflow. | E2E | R-G-007 | 5 | QA | Includes transition between queue/thread contexts. |
| Persistent queue search state across Inbox/Mine navigation and refresh flows. | E2E + Component | R-G-007 | 3 | QA | Query persistence + deterministic ordering checks. |
| Contextual action-bound policy/refusal feedback without persistent operations-heavy chrome. | E2E + Component | R-G-002, R-G-010 | 4 | QA + UX | Feedback visibility only on relevant action events. |
| More/Settings volunteer-first IA options and admin-only route segregation consistency. | E2E | R-G-003 | 4 | QA | Includes bottom-nav and route highlighting behavior. |
| Tokenized primitive reuse for queue cards, pills, thread actions, composer, voicemail card. | Component + Unit | R-G-001, R-G-011 | 4 | Frontend + QA | Guards against one-off markup regressions. |
| Accessibility locks (48px touch targets, keyboard flow, plain-language action labels). | E2E + Component | R-G-008 | 5 | QA | WCAG-focused assertions in core flows. |
| Feedback taxonomy consistency (`success/refusal/error`) for call/text/claim/close/send-message actions. | API + E2E | R-G-010 | 5 | QA | Cross-breakpoint and role-context parity. |

**Total P1:** ~30 tests

### P2 (Medium)

**Criteria:** Secondary hardening, performance, and maintainability checks.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| API/read-model payload contract checks for display-safe adapter boundary. | API Contract | R-G-001, R-G-011 | 5 | QA | Explicit whitelist/blacklist field checks. |
| Performance smoke for inbox/thread endpoints and UI render budget sanity. | API Perf + E2E Perf Smoke | R-G-009 | 4 | QA + Backend | Track p95/p99 budget compliance trends. |
| Regression compatibility with prior UX-R and C/D lane suites after CS-E7 changes. | API + E2E Regression | R-G-005, R-G-006 | 5 | QA | Prevents historical behavior regressions. |
| Router/access-store guard resilience for role/context changes and stale state refresh. | Integration + E2E | R-G-003 | 3 | QA + Frontend | Guard refresh and refusal clarity checks. |
| Token and primitive consistency snapshots across target surfaces. | Component Snapshot | R-G-011 | 3 | Frontend + QA | Drift detection for style/system cohesion. |

**Total P2:** ~20 tests

### P3 (Low)

**Criteria:** Exploratory confidence and long-run drift detection.

| Requirement | Test Level | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- |
| Exploratory UX walkthrough scripts for volunteer triage speed and comprehension. | Exploratory E2E | 3 | QA + UX | Non-blocking, evidence-oriented sessions. |
| Weekly burn-in of CS-E7 high-value scenarios under replayed queue/timeline data. | Burn-in Regression | 3 | QA | Long-run stability and flake detection. |
| Visual/a11y exploratory checks for edge breakpoints and rare IA branches. | Exploratory Component/E2E | 2 | QA | Confidence checks outside core matrix. |

**Total P3:** ~8 tests

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when total runtime remains within ~15 minutes; defer only expensive/long-running suites.

- **PR:** P0 + P1 + fast P2 suites (API, integration, component, E2E-critical).
- **Nightly:** full P2 including performance smoke, compatibility regressions, and extended role matrix.
- **Weekly:** P3 exploratory + burn-in loops for drift detection and flakiness control.

---

## Resource Estimates

### Test Development Effort (Ranges)

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~26 | ~34-52 hours | Volunteer-safe contract boundary and deterministic lifecycle behavior |
| P1 | ~30 | ~28-44 hours | Responsive model, IA separation, accessibility, feedback consistency |
| P2 | ~20 | ~14-26 hours | Contract hardening, performance smoke, compatibility regression |
| P3 | ~8 | ~4-10 hours | Exploratory confidence and burn-in |
| **Total** | **~84** | **~80-132 hours** | **~2.5-4 weeks (single QA engineer)** |

### Prerequisites

- Deterministic ConnectShyft fixtures for thread states, voicemail events, role contexts, and route deep links.
- Shared forbidden-field assertion helpers for volunteer display contracts.
- Breakpoint test harness for mobile/tablet/desktop interaction profiles.
- CI gating integration for CS-E7 story-tagged test lanes.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigations:** 100% complete or formally waived (owner + expiry)
- **Volunteer display-safe boundary:** zero forbidden-field leaks in merge-blocking suites

### Coverage Targets

- **Display-safe volunteer contract checks:** 100% on Inbox/Mine/Thread primary surfaces
- **Lifecycle action matrix + reopen/no-auto-reopen behavior:** >=95%
- **Responsive interaction model lock:** >=90%
- **Overall Epic G automated coverage:** >=80%

### Non-Negotiable Requirements

- [ ] No raw internal metadata in volunteer-primary UI content.
- [ ] Locked state-action matrix remains deterministic by canonical thread state.
- [ ] Unauthorized admin settings paths remain denied with refusal-style guidance.
- [ ] Voicemail ownership/timeline behavior remains stable across queue and thread surfaces.

---

## Mitigation Plans

### R-G-001: Volunteer surface leaks internal metadata (Score: 9)

**Mitigation Strategy:**
1. Enforce display-safe adapter outputs in `readContracts`/`uiContracts` with explicit whitelist rules.
2. Add forbidden-field regression assertions across Inbox/Mine/Thread primary surfaces.
3. Block merge on any reintroduction of raw internal metadata in volunteer paths.

**Owner:** Frontend Lead + QA  
**Timeline:** Sprint G.1-G.3  
**Status:** Planned  
**Verification:** Merge-blocking API/E2E suites confirm zero forbidden-field leaks.

### R-G-002: State-action matrix/reopen behavior drift (Score: 6)

**Mitigation Strategy:**
1. Generate deterministic test matrix for `UNCLAIMED/CLAIMED/CLOSED` action visibility and outcomes.
2. Validate closed-thread outbound reopen and inbound no-auto-reopen behavior in API + E2E.
3. Assert feedback taxonomy (`success/refusal/error`) for each action path.

**Owner:** QA Lead + Backend  
**Timeline:** Sprint G.3-G.6  
**Status:** Planned  
**Verification:** Matrix suite passes with no mismatched action/outcome states.

### R-G-003: Volunteer/admin IA separation bypass (Score: 6)

**Mitigation Strategy:**
1. Harden router/access-store role checks for settings routes and deep-link entries.
2. Add role-context refresh tests to prevent stale authorization visibility.
3. Validate refusal-style UX messaging for unauthorized attempts.

**Owner:** Frontend + Platform Security  
**Timeline:** Sprint G.5  
**Status:** Planned  
**Verification:** Role matrix suites show no unauthorized access or leaked controls.

### R-G-004: Add Neighbor/Directory deterministic behavior drift (Score: 6)

**Mitigation Strategy:**
1. Add API validation tests for required contact constraints and no-partial-write refusal behavior.
2. Add deterministic thread ensure tests for directory open/start conversation actions.
3. Cover mobile/tablet flow parity for create/search/start sequences.

**Owner:** Backend + QA  
**Timeline:** Sprint G.4  
**Status:** Planned  
**Verification:** Deterministic API/E2E suites pass with write-side integrity checks.

### R-G-006: Coverage gap for new CS-S7 contracts (Score: 6)

**Mitigation Strategy:**
1. Create story-aligned suites for `g-1`..`g-6` across API/E2E/component layers.
2. Wire CS-E7 checks into merge-blocking CI gates and quality-gate reporting.
3. Maintain burn-in loop coverage for high-risk CS-E7 scenarios.

**Owner:** QA + Release Engineering  
**Timeline:** Sprint G.1-G.6  
**Status:** Planned  
**Verification:** CI report shows CS-E7 lane required and green before merge.

---

## Assumptions and Dependencies

### Assumptions

1. Epic G story package validated on 2026-03-06 remains authoritative for implementation sequencing.
2. Locked routing/thread lifecycle semantics from prior epics remain unchanged during UX rebuild.
3. Existing UX-R and C/D lane tests remain available as baseline regression safety nets.

### Dependencies

1. `g-2`, `g-3`, and `g-4` depend on `g-1` primitives/tokens completion.
2. `g-5` depends on `g-2` IA and queue surface updates.
3. `g-6` depends on `g-2`, `g-3`, `g-4`, and `g-5` for boundary and regression hardening.
4. Existing policy/test/burn-in/quality-gates CI flow remains merge-blocking for CS-E7 work.

### Risks to Plan

- **Risk:** Existing views still render raw technical chips and IDs.
  - **Impact:** Volunteer comprehension and trust degrade; UX drift reoccurs.
  - **Contingency:** Fail build on forbidden-field regression assertions.

- **Risk:** Current test inventory has UX-R coverage but not dedicated `g-*` suite ownership.
  - **Impact:** New CS-S7 contracts can regress without direct detection.
  - **Contingency:** Add explicit `g-*` story-tagged suites and lane-level CI reporting.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for `g-1`..`g-6`.
- Run `*automate` after implementation to generate broader API/E2E suites and fixture updates.
- Run `*trace` to map CS-E7 requirements to implemented tests and gate status.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue` | Queue-card contract and volunteer-safe surface behavior | E2E/component checks for suppression, ordering language, voicemail indicators |
| `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue` | Conversation-first hierarchy and state-action UX contract | API/E2E matrix for actions, feedback taxonomy, reopen/no-auto-reopen behavior |
| `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue` + `router/index.ts` | Volunteer/admin IA separation and route-gate behavior | Role/deep-link refusal tests across contexts and breakpoints |
| `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts` + `uiContracts.ts` | Display-safe adapter boundary and action contract shaping | API/component contract tests for field suppression and consistent action metadata |
| `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts` + `routes/api/v1/connectshyft.ts` | Read-model payload and lifecycle invariants consumed by rebuilt UI | API contract and lifecycle regression suites |
| `tests/api/platform/*` + `tests/e2e/platform/*` | Existing baseline mainly covers `ux-r*`, `c-*`, `d-*`; Epic G-specific ownership missing | Add/maintain `g-*` suites and preserve upstream regression compatibility |

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
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `_bmad-output/implementation-artifacts/story-validation-epic-g-2026-03-06.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md`
- `_bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md`
- `_bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md`
- `_bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md`
- `_bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md`
- `_bmad-output/implementation-artifacts/g-6-volunteer-contract-boundary-and-regression-hardening.md`

### External Documentation Cross-Check

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Parallelism](https://playwright.dev/docs/test-parallel)
- [Cypress Test Isolation](https://docs.cypress.io/app/core-concepts/test-isolation)
- [Pact Provider Verification](https://docs.pact.io/getting_started/provider_verification)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/about-workflows)

---

**Generated by**: BMad TEA Agent - Test Architect Module  
**Workflow**: `_bmad/tea/workflows/testarch/test-design`  
**Version**: 5.0 (step-file architecture)
