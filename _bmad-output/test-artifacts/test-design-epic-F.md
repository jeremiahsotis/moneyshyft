---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-27'
---

# Test Design: Epic F - Comms Core Provider Abstraction and Telnyx Cutover

**Date:** 2026-02-27
**Author:** Jeremiah (TEA workflow execution)
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for stories `f-1` through `f-4`, covering provider adapter abstraction, canonical event model, fallback correlation mapping, and Telnyx cutover guardrails without regression in ConnectShyft lifecycle behavior.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score >=6): 8
- Critical categories: TECH, DATA, OPS, SEC

**Coverage Summary:**

- P0 scenarios: ~24 tests (~32-50 hours)
- P1 scenarios: ~28 tests (~26-42 hours)
- P2/P3 scenarios: ~26 tests (~16-34 hours)
- **Total effort**: ~74-126 hours (~2.5-4 weeks)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Full Epic E inbound webhook implementation | Epic F establishes abstraction/cutover foundation, not full inbound business flow completion. | Keep Epic E suites as downstream regression dependency after F baseline lands. |
| Non-Telnyx production adapters (Plivo/Bandwidth/etc.) | Epic F locks adapter contract and Telnyx V1 only. | Add mock second-provider contract tests in P3; defer real adapter rollout to post-MVP. |
| Operator-facing UX redesign | Epic F focuses on backend/provider plumbing with behavior parity. | Reuse existing UX remediation and outbound policy suites for parity checks. |
| Vendor SLA/performance guarantees external to platform | Test plan validates our contract handling, not carrier infrastructure reliability. | Add deterministic refusal/retry/observability checks and explicit runbooks. |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-F-001 | TECH | Provider abstraction remains coupled to Twilio-specific route/module contracts (`x-twilio-signature`, `twilioNumberE164`) and blocks clean adapter boundary. | 3 | 3 | 9 | Introduce provider-neutral DTOs/headers/field names and enforce adapter-only provider branching in contract tests. | Backend Lead | Sprint F.1 |
| R-F-002 | DATA | Disabled/missing provider dispatch path allows partial writes before refusal, causing hidden state mutations. | 3 | 3 | 9 | Enforce fail-closed provider resolution and no-side-effect refusal transaction checks for outbound/inbound entry points. | Backend Lead | Sprint F.1 |
| R-F-003 | TECH | Canonical event schema drifts between story contracts, `event_schema.md`, and API/status consumers. | 2 | 3 | 6 | Freeze canonical schema contract and validate event persistence + read APIs with strict contract tests. | Backend + QA | Sprint F.2 |
| R-F-004 | DATA | Missing metadata callbacks cannot map provider identifiers to internal IDs, causing phantom lifecycle/timeline updates. | 3 | 3 | 9 | Implement metadata-first then provider-id fallback correlation with deterministic refusal on unresolved events. | Backend Lead | Sprint F.3 |
| R-F-005 | OPS | Replay/duplicate provider events bypass dedupe due inconsistent provider/event-type normalization and keying. | 3 | 3 | 9 | Enforce provider-scoped unique receipt/mapping constraints and replay-safety integration suites. | Backend + SRE | Sprint F.3 |
| R-F-006 | SEC | Signature validation behavior diverges between webhook entry points/adapters, creating spoofing exposure. | 2 | 3 | 6 | Standardize adapter signature verification contract and negative tests across all webhook routes. | Security + Backend | Sprint F.4 |
| R-F-007 | BUS | Telnyx cutover changes lifecycle semantics visible to operators (reopen/claim/escalation invariants). | 2 | 3 | 6 | Run parity regression matrix against locked lifecycle/outbound contracts pre- and post-cutover. | QA Lead | Sprint F.4 |
| R-F-008 | OPS | CI/policy guardrails fail to block new non-adapter Twilio-coupled code after Epic F starts. | 2 | 3 | 6 | Add static/policy checks that fail PRs with provider-specific branching outside adapter layer. | Platform Architecture | Sprint F.4 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-F-009 | PERF | Event store and status endpoints degrade under higher provider event volume. | 2 | 2 | 4 | Add nightly load profiles and index/query-plan checks. | Backend + QA |
| R-F-010 | OPS | Adapter failure observability is insufficient for fast incident triage. | 2 | 2 | 4 | Emit structured logs/metrics with correlation IDs for dispatch/webhook paths. | SRE |
| R-F-011 | TECH | Migration ordering for provider mapping/receipt schema causes rollout instability. | 1 | 3 | 3 | Add migration contract tests and staged deploy rehearsal checks. | Backend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-F-012 | BUS | Minor provider-label copy inconsistency in non-critical operator messages. | 1 | 2 | 2 | Monitor |

### Risk Category Legend

- **TECH**: Architecture/contract consistency risks
- **SEC**: Security and spoofing/validation risks
- **PERF**: Performance and throughput risks
- **DATA**: Data integrity/correlation/idempotency risks
- **BUS**: Operator-visible behavior risks
- **OPS**: Delivery, CI, observability, and rollout risks

---

## Entry Criteria

- [ ] Stories `f-1` through `f-4` are approved and remain in `ready-for-dev` with dependencies intact.
- [ ] Sprint status dependency chain is in place (`f-1 -> f-2 -> f-3 -> f-4`).
- [ ] Provider-neutral contract artifacts (`provider_adapter.md`, `event_schema.md`, `openapi.yaml`) are baseline references for implementation.
- [ ] Test fixtures exist for provider enabled/disabled scenarios and replay callback simulation.
- [ ] Audit/outbox/event-store verification access is available in test environments.
- [ ] CI policy hooks can fail PRs on non-adapter provider branching.

## Exit Criteria

- [ ] All P0 tests pass (100%).
- [ ] P1 pass rate >=95% (or formally approved waiver).
- [ ] No open high-severity defects on fail-closed dispatch, correlation fallback, replay safety, or cutover parity.
- [ ] High-priority mitigations (R-F-001..R-F-008) are complete or explicitly waived with owner and expiry.
- [ ] Automated coverage reaches >=80% of planned Epic F matrix.

---

## Test Coverage Plan

**Note:** P0/P1/P2/P3 define priority/risk, not execution timing.

### P0 (Critical)

**Criteria:** Core provider-abstraction and data-safety behavior with no acceptable workaround.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Registry resolves enabled provider deterministically and routes through adapter interface only. | API + Unit | R-F-001, R-F-002 | 4 | QA | Includes deterministic default selection and explicit provider choice. |
| Disabled/missing provider returns refusal with zero lifecycle/audit/outbox writes. | API + Integration | R-F-002 | 4 | QA | No-partial-write assertions. |
| Domain handlers are provider-agnostic (no Twilio/Telnyx branching outside adapter layer). | Contract + Static Analysis | R-F-001, R-F-008 | 3 | QA + Arch | Policy/static guard enforcement. |
| Canonical event persistence uses required fields (`aggregateId/type`, `eventType`, `payload`, UTC timestamp). | API + Integration | R-F-003 | 3 | QA | Schema conformance checks. |
| Metadata-missing callbacks resolve via provider-id fallback or deterministic refusal only. | Integration | R-F-004 | 4 | QA | Includes unresolved callback refusal behavior. |
| Duplicate provider callbacks do not create duplicate domain writes/timeline artifacts. | API + Integration | R-F-005 | 3 | QA | Replay-safe dedupe coverage. |
| Telnyx signature verification fails closed on invalid/unsigned webhook payloads. | API | R-F-006 | 3 | QA + Security | Negative-path signature tests. |

**Total P0:** ~24 tests

### P1 (High)

**Criteria:** High-impact contract behavior and cutover parity requirements.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Event-driven status/timeline outputs remain provider-neutral and deterministically ordered. | API + Integration | R-F-003, R-F-007 | 4 | QA | Read-model consistency checks. |
| Outbound/inbound lifecycle parity under Telnyx cutover preserves locked thread semantics. | API + E2E | R-F-007 | 5 | QA | Reopen/claim/escalation invariants. |
| CI/policy checks block new provider-specific coupling outside adapters. | CI Contract | R-F-008 | 4 | QA + Arch | Merge-blocking validation. |
| Rollback/allow-list controls fail closed when provider enablement changes. | API + Integration | R-F-002, R-F-007 | 4 | QA + SRE | Cutover guardrail scenarios. |
| Correlation mapping persists provider leg/message IDs with provider-scoped uniqueness. | Integration | R-F-004, R-F-005 | 3 | QA | Mapping durability checks. |
| Audit/outbox metadata retains provider operation lineage consistently. | API + Integration | R-F-003, R-F-010 | 4 | QA | Provenance parity checks. |
| Existing D/E dependency suites remain green after F-lane changes. | API + E2E Regression | R-F-007, R-F-008 | 4 | QA | Upstream/downstream parity gate. |

**Total P1:** ~28 tests

### P2 (Medium)

**Criteria:** Secondary robustness, performance, and rollout hardening.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Event/status endpoints meet baseline latency under replay/load profiles. | API Perf | R-F-009 | 4 | QA | Nightly performance checks. |
| Adapter failure telemetry includes correlation IDs and actionable error classes. | Integration + Observability | R-F-010 | 3 | QA + SRE | Log/metric assertion coverage. |
| Migration order and rollback scripts preserve mapping/receipt integrity. | Migration Contract | R-F-011 | 3 | QA + Backend | Staged deploy checks. |
| Signature and payload translation parity across webhook entrypoints. | API + Contract | R-F-006 | 4 | QA | Endpoint parity checks. |
| OpenAPI and event schema stay aligned with implementation outputs. | Contract Test | R-F-003 | 4 | QA | Drift detection guard. |

**Total P2:** ~18 tests

### P3 (Low)

**Criteria:** Exploratory confidence and future-proofing checks.

| Requirement | Test Level | Test Count | Owner | Notes |
| --- | --- | --- | --- | --- |
| Mock second-provider plug-in contract smoke tests against shared adapter interface. | Contract Exploratory | 3 | QA | Future adapter readiness. |
| Long-running replay/burn-in of callback storms for mapping/dedupe resilience. | Integration Burn-in | 3 | QA + SRE | Weekly confidence run. |
| Exploratory operator copy parity checks for provider-labeled messages. | Exploratory E2E | 2 | QA + UX | Non-blocking clarity checks. |

**Total P3:** ~8 tests

---

## Execution Strategy

**Philosophy:** Run all functional tests in PRs when runtime remains within ~15 minutes; defer only expensive or long-running suites.

- **PR:** P0 + P1 + fast P2 functional/API/integration suites.
- **Nightly:** full P2 including load/replay and migration robustness checks.
- **Weekly:** P3 exploratory/burn-in diagnostics and observability drills.

---

## Resource Estimates

### Test Development Effort (Ranges)

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~24 | ~32-50 hours | Adapter boundary, fail-closed semantics, replay safety core |
| P1 | ~28 | ~26-42 hours | Cutover parity, CI policy guards, dependency regressions |
| P2 | ~18 | ~12-24 hours | Perf, observability, migration contract hardening |
| P3 | ~8 | ~4-10 hours | Exploratory future-provider and burn-in checks |
| **Total** | **~78** | **~74-126 hours** | **~2.5-4 weeks (single QA engineer)** |

### Prerequisites

- Provider simulation fixtures for Telnyx webhook/callback events.
- Deterministic cleanup for provider mapping/receipt/event-store data.
- CI tags and lane filters for `f-1`..`f-4` plus dependency regressions.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100%
- **P1 pass rate:** >=95%
- **High-risk mitigations:** 100% complete or waived with explicit owner and expiry
- **Twilio-coupling drift:** zero violations in adapter-boundary static/policy checks

### Coverage Targets

- **Provider fail-closed/refusal no-write behavior:** 100%
- **Correlation fallback and replay safety:** >=95%
- **Cutover lifecycle parity:** >=90%
- **Overall Epic F automated coverage:** >=80%

### Non-Negotiable Requirements

- [ ] No provider-specific branching outside adapter layer.
- [ ] No partial writes on disabled/missing provider refusal paths.
- [ ] No duplicate domain writes from replayed provider callbacks.
- [ ] No lifecycle behavior regression during Telnyx cutover.

---

## Mitigation Plans

### R-F-001: Provider abstraction remains Twilio-coupled (Score: 9)

**Mitigation Strategy:**
1. Replace provider-specific route/module contracts with provider-neutral adapter contracts.
2. Add static/contract checks to block provider branching outside adapter implementation.
3. Validate API and event payload neutrality in regression tests.

**Owner:** Backend Lead  
**Timeline:** Sprint F.1  
**Status:** Planned  
**Verification:** CI/static checks and contract suites show zero non-adapter provider coupling.

### R-F-002: Fail-closed provider resolution not enforced (Score: 9)

**Mitigation Strategy:**
1. Centralize provider resolution and enforce refusal-first behavior for disabled/missing providers.
2. Wrap dispatch and refusal paths in transaction-safe side-effect guards.
3. Add API/integration assertions for zero writes on refusal paths.

**Owner:** Backend Lead  
**Timeline:** Sprint F.1  
**Status:** Planned  
**Verification:** Integration write-count assertions remain zero on all refusal scenarios.

### R-F-004: Metadata-missing callback mis-correlation (Score: 9)

**Mitigation Strategy:**
1. Persist provider leg/message mappings with provider-scoped uniqueness.
2. Implement metadata-first then fallback-id resolution flow.
3. Refuse unresolved callbacks deterministically with no lifecycle mutation.

**Owner:** Backend Lead  
**Timeline:** Sprint F.3  
**Status:** Planned  
**Verification:** Correlation suites prove single deterministic resolve/refuse outcomes.

### R-F-005: Replay duplicates create duplicate domain writes (Score: 9)

**Mitigation Strategy:**
1. Enforce unique dedupe keys on provider/event identity paths.
2. Normalize provider/event type values before dedupe lookup.
3. Add replay storm tests to verify exactly-once domain behavior.

**Owner:** Backend + SRE  
**Timeline:** Sprint F.3  
**Status:** Planned  
**Verification:** Replay tests show zero duplicate timeline/domain artifacts.

---

## Assumptions and Dependencies

### Assumptions

1. Epic F story package validated on 2026-02-27 remains authoritative for implementation sequencing.
2. Provider-agnostic rebaseline decisions from sprint change proposal remain frozen during Epic F execution.
3. Existing lifecycle contract behavior in ConnectShyft remains unchanged by provider cutover.

### Dependencies

1. `f-1` must be complete before `f-2`, `f-3`, and `f-4` implementation starts.
2. `f-2` must be complete before `f-3` and `f-4` consume canonical event model.
3. `f-3` correlation fallback must be complete before `f-4` cutover can be released safely.
4. Frozen downstream stories (`a-3`, `d-1`, `d-3`, `e-1`..`e-5`) remain blocked until Epic F foundation is in place.

### Risks to Plan

- **Risk:** Existing code still exposes Twilio-specific field names and signature headers.
  - **Impact:** Adapter neutrality can be partial and regressions can leak into domain logic.
  - **Contingency:** Treat adapter-boundary checks as release-blocking.

- **Risk:** Contract artifacts (`provider_adapter.md`, `event_schema.md`, `openapi.yaml`) drift from implementation.
  - **Impact:** Status/events clients and tests become inconsistent.
  - **Contingency:** Add strict contract tests and CI drift detection.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for `f-1`..`f-4`.
- Run `*automate` after implementation to expand P1/P2 coverage.
- Run `*trace` to map Epic F requirements to implemented test assets and gate status.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| `src/src/routes/api/v1/connectshyft.ts` | Current provider-coupled surface requiring adapter boundary extraction | API + contract regression for provider-neutral behavior |
| `src/src/modules/connectshyft/numberMappings.ts` | Twilio-specific naming and uniqueness semantics must be provider-neutralized | Unit/integration mapping and migration regression suites |
| Comms artifacts (`provider_adapter.md`, `event_schema.md`, `openapi.yaml`) | Source-of-truth contract for adapter/events/status | Contract drift tests and schema assertions |
| Downstream stories `a-3`, `d-1`, `d-3`, `e-1`..`e-5` | Frozen until Epic F abstractions land | Dependency and parity regression gates |
| CI policy/workflow guards | Must prevent non-adapter provider coupling reintroduction | Merge-blocking static/policy checks |

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
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`
- `_bmad-output/implementation-artifacts/f-1-provider-adapter-interface-and-provider-registry.md`
- `_bmad-output/implementation-artifacts/f-2-canonical-comms-event-model-and-event-store.md`
- `_bmad-output/implementation-artifacts/f-3-provider-leg-message-correlation-fallback-mapping.md`
- `_bmad-output/implementation-artifacts/f-4-telnyx-adapter-implementation-and-cutover-guardrails.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `provider_adapter.md`
- `event_schema.md`
- `openapi.yaml`

### External Documentation Cross-Check

- Playwright docs (best practices, parallelization)
- Cypress docs (test isolation)
- Pact docs (provider verification)
- GitHub Actions docs (workflow/job concepts)

---

**Generated by**: BMad TEA Agent - Test Architect Module  
**Workflow**: `_bmad/tea/workflows/testarch/test-design`  
**Version**: 5.0 (step-file architecture)
