---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-03-03'
---

# Test Design: Epic E - Inbound Webhook Reliability and Voicemail Continuity

**Date:** 2026-03-03
**Author:** Jeremiah (TEA workflow execution)
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for stories `e-1` through `e-6`, covering verified webhook ingress, deterministic tenant/orgUnit routing, active-thread-safe inbound SMS behavior, inbound voice/voicemail continuity, transcription correlation, replay-safe receipt-ledger behavior, and CI release safety gates for parallel ConnectShyft delivery.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score >=6): 8
- Critical categories: SEC, DATA, OPS, TECH

**Coverage Summary:**

- P0 scenarios: ~23 tests (~30-46 hours)
- P1 scenarios: ~27 tests (~24-38 hours)
- P2/P3 scenarios: ~24 tests (~16-32 hours)
- **Total effort**: ~70-116 hours (~2.5-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Provider carrier SLA/network guarantees | Epic E validates our application contracts, not external carrier uptime or transport internals. | Keep deterministic refusal and retry-safe handling in-app; monitor provider incidents through ops runbooks. |
| New provider onboarding beyond Telnyx V1 | Epic E relies on provider-abstraction foundation already delivered in Epic F. | Validate provider-neutral contracts via existing Epic F suites and future adapter contract tests. |
| Full UX redesign for voicemail surfaces | UX remediation for voicemail/thread indicators is scoped under `ux-r3`. | Require `ux-r3` regression lane and read-contract parity checks in Epic E merge gates. |
| Non-ConnectShyft modules | This plan targets inbound reliability and release safety in ConnectShyft only. | Keep RouteShyft regression lane mandatory on ConnectShyft PRs. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-E-001 | SEC | Invalid or stale webhook signatures are accepted and create unauthorized artifacts. | 3 | 3 | 9 | Enforce fail-closed signature verification before any dedupe/domain write path; add negative signature matrix tests. | Security + Backend | Sprint E.1 |
| R-E-002 | DATA | Number-mapping context resolution misroutes events to wrong tenant/orgUnit, causing cross-scope writes. | 3 | 3 | 9 | Assert deterministic `(tenant_id, org_unit_id)` routing and refuse unresolved mappings with no side effects. | Backend Lead | Sprint E.1 |
| R-E-003 | DATA | Replay-safe dedupe is inconsistent across SMS/voice/transcription identifiers, creating duplicate timeline writes. | 3 | 3 | 9 | Standardize receipt-key extraction and enforce first-seen-only writes across all inbound event families. | Backend Lead | Sprint E.2-E.5 |
| R-E-004 | TECH | Inbound SMS ensure path under concurrency creates duplicate active threads or ordering drift. | 2 | 3 | 6 | Reuse conflict-safe ensure semantics from `c-2`; add concurrent inbound append/ensure tests. | Backend Lead | Sprint E.2 |
| R-E-005 | BUS | Inbound voice routing matrix drifts (`no-thread`, `UNCLAIMED`, `CLAIMED`, `CLOSED`) and violates locked lifecycle behavior. | 2 | 3 | 6 | Lock route matrix contract tests for intake fallback, voicemail-only behavior, and no auto-reopen on closed inbound. | Backend + QA | Sprint E.3 |
| R-E-006 | DATA | Transcription callbacks attach to wrong voicemail or create orphan transcript records when correlation is incomplete. | 3 | 3 | 9 | Enforce deterministic correlation resolution and refuse unresolved callbacks without mutation. | Backend Lead | Sprint E.4 |
| R-E-007 | OPS | Receipt-ledger retention cleanup removes in-window keys or degrades dedupe guarantees under load. | 2 | 3 | 6 | Add retention-window tests and duplicate-burst checks against webhook latency and dedupe correctness budgets. | Backend + SRE | Sprint E.5 |
| R-E-008 | OPS | Epic E release-safety gates (policy-first, boundary checks, RouteShyft regression requirement) drift and allow unsafe merges. | 2 | 3 | 6 | Enforce CI policy ordering and required status checks with contract tests and workflow assertions. | Release Eng + QA | Sprint E.6 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-E-009 | PERF | Webhook ingestion exceeds NFR budgets under duplicate delivery bursts. | 2 | 2 | 4 | Track p95/p99 ingest latency and fail nightly budget checks when thresholds are exceeded. | QA + SRE |
| R-E-010 | OPS | Rollout controls (`connectshyft_webhooks_enabled`, allow-list, tenant->orgUnit module hierarchy) drift between environments. | 2 | 2 | 4 | Add flag/entitlement matrix checks, including tenant-disabled node override refusal and rollout/rollback checklist validation. | Release Eng |
| R-E-011 | BUS | Voicemail/transcript read-contract visibility or route-contract assumptions are inconsistent across inbox/mine/thread detail. | 2 | 2 | 4 | Add read-contract parity assertions on canonical routes and explicit invalid-route coverage for list/detail boundaries. | QA + Frontend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-E-012 | BUS | Minor refusal-copy inconsistency across webhook failure modes. | 1 | 2 | 2 | Monitor |

### Risk Category Legend

- **TECH**: Architecture and implementation consistency risk
- **SEC**: Security validation and spoofing/replay resistance risk
- **PERF**: Performance and latency budget risk
- **DATA**: Correlation, idempotency, and integrity risk
- **BUS**: Operator-visible behavior and workflow trust risk
- **OPS**: CI/release and runtime operability risk

---

## Entry Criteria

- [ ] Stories `e-1` through `e-6` remain `ready-for-dev` in sprint status and dependency graph.
- [ ] Epic F foundations (`f-1`..`f-4`) are complete and available in target branches/environments.
- [ ] Webhook signature secrets and provider test fixtures are configured for test environments.
- [ ] Number-mapping and thread-ensure test data factories exist for deterministic `(tenant, orgUnit, neighbor)` scenarios.
- [ ] Receipt-ledger persistence and cleanup job paths are enabled for test verification.
- [ ] CI workflows expose policy-first ordering and required regression lane checks.
- [ ] Tenant-level ConnectShyft module entitlement fixtures exist for both `enabled` and `disabled` states.
- [ ] Canonical ConnectShyft route manifest is validated before E2E authoring (`/app/connectshyft/inbox`, `/app/connectshyft/mine`, `/app/connectshyft/more`, `/app/connectshyft/threads/:threadId`).

## Exit Criteria

- [ ] All P0 tests pass (100%).
- [ ] P1 pass rate >=95% (or formal waiver with owner and expiry).
- [ ] No unresolved high-severity defects on signature verification, dedupe integrity, or callback correlation.
- [ ] High-priority mitigations (R-E-001..R-E-008) are complete or explicitly waived.
- [ ] Automated coverage reaches >=80% of planned Epic E matrix.

---

## Test Coverage Plan

**Note:** P0/P1/P2/P3 represent risk/criticality priority, not execution timing.

### P0 (Critical)

**Criteria:** Core ingress integrity + high-risk safety + no acceptable workaround.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Invalid/missing/stale webhook signatures fail closed with no domain side effects. | API | R-E-001 | 4 | QA + Security | Covers all inbound webhook surfaces. |
| Mapping resolution yields deterministic tenant/orgUnit context or clean refusal with no writes. | API + Integration | R-E-002 | 3 | QA | Includes mapping-miss refusal path. |
| Duplicate webhook events are suppressed across SMS/voice/transcription identities. | API + Integration | R-E-003 | 4 | QA | Verifies first-seen acceptance + duplicate suppression. |
| Inbound SMS ensure path keeps one active thread and deterministic append ordering. | API + Integration | R-E-004 | 3 | QA | Includes concurrent delivery race tests. |
| Voice routing matrix enforces locked behavior for no-thread/UNCLAIMED/CLAIMED/CLOSED. | API + Integration | R-E-005 | 3 | QA | Includes closed-thread no-auto-reopen assertion. |
| Transcription callback attaches only with valid correlation; unresolved callbacks refuse with no orphan writes. | API + Integration | R-E-006 | 3 | QA | Correlation-negative path included. |
| Policy gate remains first blocking CI stage for ConnectShyft PRs. | CI Contract | R-E-008 | 3 | QA + Release Eng | Merge-blocking workflow assertions. |

**Total P0:** ~23 tests

### P1 (High)

**Criteria:** High-impact workflows and release/governance reliability.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical event identity extraction remains stable across provider payload variants. | API | R-E-002, R-E-003 | 4 | QA | Includes provider-id fallback fields. |
| Inbound voice creates voicemail artifacts and queues transcription metadata deterministically. | API + Integration | R-E-005, R-E-006 | 4 | QA | Verifies correlation metadata persistence. |
| Transcript availability is reflected consistently in thread detail/read contracts. | API + E2E | R-E-006, R-E-011 | 3 | QA + Frontend | Read parity checks on `/inbox`, `/mine`, and `/threads/:threadId`; `/app/connectshyft/threads` remains invalid as a list route. |
| Receipt-ledger retention preserves in-window dedupe guarantees while removing expired rows. | Integration + Ops | R-E-007 | 3 | QA + SRE | Includes cleanup + replay checks. |
| RouteShyft regression and ConnectShyft quality gates are both required for merge. | CI Contract | R-E-008 | 3 | QA + Release Eng | Required status check assertions. |
| Rollout controls (feature flags/allow-list/module hierarchy/rollback docs) are current and testable. | CI + Manual Ops | R-E-010 | 3 | Release Eng + QA | Includes `409 MODULE_ASSIGNMENT_OUT_OF_BOUNDS` when enabling org-unit module while tenant scope is disabled. |
| Existing Epic F webhook/correlation suites remain green with Epic E changes. | API Regression | R-E-003, R-E-008 | 4 | QA | Prevents abstraction regressions. |
| Existing lifecycle/voicemail behavioral invariants from D/C/UX lanes remain green. | API + E2E Regression | R-E-005, R-E-011 | 3 | QA | Guards closed-thread + voicemail indicators. |

**Total P1:** ~27 tests

### P2 (Medium)

**Criteria:** Secondary robustness and performance/governance hardening.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Webhook ingestion p95/p99 stays within NFR budgets under duplicate bursts. | API Perf | R-E-009 | 4 | QA + SRE | Nightly budget monitor. |
| Correlation-lookup ambiguity and conflict refusal contracts remain deterministic. | API | R-E-006, R-E-012 | 3 | QA | Explicit error code/message checks. |
| Receipt-ledger observability emits actionable dedupe/retention diagnostics. | Integration + Observability | R-E-007 | 3 | QA + SRE | Ops triage signal checks. |
| Feature-flag and module-entitlement matrix across envs prevents accidental webhook disablement or module-gate drift in rollout. | API + Config | R-E-010 | 3 | QA + Release Eng | Staging parity includes tenant-level gate fallback behavior for ConnectShyft routes. |
| CI policy script failure messages remain remediation-actionable. | CI Contract | R-E-008 | 3 | QA | Prevents silent governance failures. |

**Total P2:** ~16 tests

### P3 (Low)

**Criteria:** Exploratory and long-running confidence checks.

| Requirement | Test Level | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- |
| Extended duplicate-delivery burn-in for webhook dedupe across event families. | Integration Burn-in | 3 | QA + SRE | Weekly stress companion. |
| Exploratory callback payload fuzzing for non-critical envelope-copy consistency. | API Exploratory | 2 | QA | Non-blocking quality signal. |
| Manual rollout drill for allow-list + rollback verification evidence. | Ops Drill | 3 | Release Eng + QA | Weekly/biweekly governance rehearsal. |

**Total P3:** ~8 tests

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when runtime stays under ~15 minutes; defer only expensive or long-running suites.

- **PR:** P0 + P1 + fast P2 functional/API/integration suites, including CI contract checks.
- **Nightly:** full P2 plus webhook performance and retention robustness checks.
- **Weekly:** P3 burn-in, rollout drill checks, and long-running duplicate-delivery diagnostics.

---

## Resource Estimates

### Test Development Effort (Ranges)

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~23 | ~30-46 hours | Security, context routing, dedupe, and critical CI gating |
| P1 | ~27 | ~24-38 hours | Voice/transcript continuity and regression/governance lanes |
| P2 | ~16 | ~12-22 hours | Perf budgets and operability hardening |
| P3 | ~8 | ~4-10 hours | Burn-in and rollout rehearsal checks |
| **Total** | **~74** | **~70-116 hours** | **~2.5-4 weeks (single QA engineer)** |

### Prerequisites

- Stable Epic E fixture/factory package for inbound events and correlation contexts.
- Provider webhook signature test fixtures and deterministic replay payload sets.
- CI tags/lane filters for `e-1`..`e-6` plus dependency regression anchors.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigations:** 100% complete or waived with owner + expiry
- **Policy-first CI enforcement:** zero violations on ConnectShyft PR workflows

### Coverage Targets

- **Webhook signature and fail-closed behavior:** 100%
- **Replay-safe dedupe behavior (all inbound event families):** 100%
- **Voicemail/transcript correlation integrity:** >=95%
- **Overall Epic E automated coverage:** >=80%

### Non-Negotiable Requirements

- [ ] No webhook processing side effects on invalid signatures.
- [ ] No duplicate timeline/domain writes from replayed provider events.
- [ ] No orphan or misattached transcription records.
- [ ] No merge without policy-first + RouteShyft regression + ConnectShyft quality gates.
- [ ] No org-unit module enablement succeeds when module is disabled at tenant scope (`MODULE_ASSIGNMENT_OUT_OF_BOUNDS`, HTTP 409).
- [ ] No ConnectShyft module-gated route remains accessible when tenant entitlement is disabled; fallback is deterministic.

---

## Mitigation Plans

### R-E-001: Signature bypass on inbound webhooks (Score: 9)

**Mitigation Strategy:**
1. Enforce adapter signature validation at ingress before correlation/dedupe/domain mutation.
2. Add negative-path tests for missing/invalid/timestamp-expired signatures.
3. Require refusal envelope consistency and write-count zero assertions.

**Owner:** Security + Backend  
**Timeline:** Sprint E.1  
**Status:** Planned  
**Verification:** Security suite shows invalid signatures always refused with zero domain writes.

### R-E-003: Inconsistent replay dedupe across inbound families (Score: 9)

**Mitigation Strategy:**
1. Normalize dedupe-key derivation for SMS/voice/transcription event identities.
2. Validate first-seen insert vs duplicate suppression behavior through integration suites.
3. Add duplicate-burst stress tests to ensure deterministic response and no extra writes.

**Owner:** Backend Lead  
**Timeline:** Sprint E.2-E.5  
**Status:** Planned  
**Verification:** Replay tests demonstrate exactly-once domain mutation semantics.

### R-E-006: Transcription correlation mismatch/orphan writes (Score: 9)

**Mitigation Strategy:**
1. Require deterministic correlation lookup before transcript mutation.
2. Refuse unresolved or ambiguous callback correlation inputs.
3. Assert no voicemail/transcript side effects on unresolved callbacks.

**Owner:** Backend Lead  
**Timeline:** Sprint E.4  
**Status:** Planned  
**Verification:** Callback suites show valid attachments only and zero orphan transcript records.

### R-E-008: Release safety gate drift (Score: 6)

**Mitigation Strategy:**
1. Assert `npm run policy:check` remains first blocking CI stage.
2. Enforce required status checks for ConnectShyft quality gates and RouteShyft regression lanes.
3. Validate rollback/control documentation references in release workflows.

**Owner:** Release Engineering + QA  
**Timeline:** Sprint E.6  
**Status:** Planned  
**Verification:** CI contract checks fail intentionally when gate ordering or required lanes are altered.

---

## Assumptions and Dependencies

### Assumptions

1. Epic E story package validated on 2026-03-03 remains authoritative for implementation sequencing.
2. Epic F provider-abstraction contracts remain stable and continue to back inbound webhook processing.
3. Current lifecycle decisions (including closed-thread inbound voice behavior) remain locked during Epic E execution.
4. ConnectShyft route contract remains anchored to `/inbox`, `/mine`, `/more`, and `/threads/:threadId` for list/detail separation.

### Dependencies

1. `e-1` completion before `e-2`, `e-3`, and `e-5` implementation.
2. `e-3` completion before `e-4` callback attachment logic.
3. `e-5` and `a-5` readiness before `e-6` release-gate hardening sign-off.
4. Provider secrets and CI permissions available in staging/CI for signature and gate validation.
5. Tenant admin fixtures include one tenant with ConnectShyft disabled at tenant scope and one enabled for gate-matrix coverage.

### Risks to Plan

- **Risk:** Story implementation starts before CI gate hardening (`e-6`) is enforced.
  - **Impact:** Unsafe merges can pass despite webhook-quality regressions.
  - **Contingency:** Treat policy-first and required-lane checks as release blockers.

- **Risk:** Existing Epic F/D suites create false confidence for Epic E-specific AC coverage.
  - **Impact:** Story-level gaps for voicemail/transcript and retention controls remain undetected.
  - **Contingency:** Require dedicated Epic E suite files/tags before release readiness.

---

## Follow-on Workflows (Manual)

- Run `*atdd` for Epic E stories (`e-1`..`e-6`) to generate failing P0 test scaffolds.
- Run `*automate` after implementation for expanded P1/P2 suite generation.
- Run `*trace` to map Epic E requirements to test assets and produce gate decision.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| `src/src/routes/api/v1/connectshyft.ts` inbound webhook handlers | Primary Epic E execution path for signature, correlation, dedupe, and routing | API/integration suites for ingress safety, routing matrix, and callback handling |
| `src/src/modules/connectshyft/providerRegistry.ts` | Signature verification and provider resolution behavior | Security refusal matrix + timestamp replay-window checks |
| `src/src/modules/connectshyft/providerCorrelationMappings.ts` | Dedupe keying, receipt ledger writes, correlation fallback | Replay suppression and retention integrity suites |
| `src/src/modules/connectshyft/threads.ts` | Active-thread ensure semantics for inbound SMS flow | Concurrency ensure tests and duplicate-thread prevention checks |
| `src/src/modules/connectshyft/readContracts.ts` | Voicemail/transcript visibility in inbox/mine/thread detail | Read-contract parity tests for voicemail indicator and transcript availability |
| `frontend/src/router/index.ts` | Canonical ConnectShyft route manifest and module-gated navigation behavior | E2E route-contract checks for valid list/detail routes and module-gate redirects |
| `frontend/src/stores/access.ts` | Default authorized fallback path resolution under module gates | E2E assertions for deterministic fallback when ConnectShyft is not entitled |
| `src/src/routes/api/v1/platform-admin-console.ts` | Tenant-to-orgUnit module hierarchy enforcement for node overrides | API contract checks for `MODULE_ASSIGNMENT_OUT_OF_BOUNDS` (`409`) refusal path |
| `.github/workflows/*` + `scripts/*` policy/quality gate tooling | Epic E release safety and parallel delivery enforcement | CI contract checks for policy-first ordering and required regression lanes |

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
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/implementation-artifacts/story-validation-epic-e-2026-03-03.md`
- `_bmad-output/implementation-artifacts/e-1-verified-webhook-ingress-and-deterministic-context-routing.md`
- `_bmad-output/implementation-artifacts/e-2-inbound-sms-processing-with-active-thread-ensure.md`
- `_bmad-output/implementation-artifacts/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.md`
- `_bmad-output/implementation-artifacts/e-4-transcription-webhook-attachment-to-voicemail-records.md`
- `_bmad-output/implementation-artifacts/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.md`
- `_bmad-output/implementation-artifacts/e-6-parallel-delivery-safety-gates-for-connectshyft-rollout.md`

### Live Exploration Evidence (2026-03-03)

- `_bmad-output/test-artifacts/exploration/explore-connectshyft-threads.png` (invalid `/app/connectshyft/threads` route capture)
- `_bmad-output/test-artifacts/exploration/explore-connectshyft-inbox-default.png` (module-gated redirect behavior)
- `_bmad-output/test-artifacts/exploration/explore-connectshyft-inbox-flags.png` (tenant-admin fallback while ConnectShyft module is disabled)
- `_bmad-output/test-artifacts/exploration/explore-admin-tenant-settings.png` (tenant admin structure/module controls)
- `_bmad-output/test-artifacts/exploration/explore-connectshyft-module-toggle-conflict.png` (`Cannot enable a module that is disabled at tenant scope`)

### External Documentation Cross-Check

- Playwright docs (best practices, parallelization)
- Cypress docs (test isolation)
- Pact docs (provider verification)
- GitHub Actions docs (workflow/job concepts)

---

**Generated by**: BMad TEA Agent - Test Architect Module  
**Workflow**: `_bmad/tea/workflows/testarch/test-design`  
**Version**: 5.0 (step-file architecture)
