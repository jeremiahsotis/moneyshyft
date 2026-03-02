# Traceability Matrix - Epic F (f-1..f-4)

**Date:** 2026-03-02  
**Evaluator:** Jeremiah (TEA Agent)

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
| --- | ---: | ---: | ---: | --- |
| P0 | 8 | 8 | 100% | PASS |
| P1 | 8 | 8 | 100% | PASS |
| P2 | 0 | 0 | 100% | PASS |
| P3 | 0 | 0 | 100% | PASS |
| **Total** | **16** | **16** | **100%** | **PASS** |

## Traceability Matrix

| Criterion | Story | Priority | Coverage | Mapped Tests |
| --- | --- | --- | --- | --- |
| F1-AC1 | f-1 | P0 | FULL | `F1-API-ATDD-01`, `F1-API-AUTO-01`, `F1-E2E-AUTO-01` |
| F1-AC2 | f-1 | P0 | FULL | `F1-API-ATDD-03`, `F1-API-AUTO-02`, `F1-E2E-ATDD-02` |
| F1-AC3 | f-1 | P1 | FULL | `F1-API-ATDD-05`, `F4-API-AUTO-06`, `CI-API-02` |
| F1-AC4 | f-1 | P1 | FULL | `F1-API-ATDD-04`, `F1-E2E-AUTO-03`, `F1-E2E-ATDD-02` |
| F2-AC1 | f-2 | P0 | FULL | `F2-API-ATDD-01`, `F2-API-AUTO-01`, `F2-E2E-AUTO-01` |
| F2-AC2 | f-2 | P0 | FULL | `F2-API-ATDD-02`, `F2-API-AUTO-02`, `F2-E2E-AUTO-02` |
| F2-AC3 | f-2 | P1 | FULL | `F2-API-ATDD-03`, `F2-API-AUTO-03`, `F2-E2E-ATDD-02` |
| F2-AC4 | f-2 | P1 | FULL | `F2-API-ATDD-04`, `F2-API-AUTO-04`, `F2-E2E-ATDD-03` |
| F3-AC1 | f-3 | P0 | FULL | `F3-API-ATDD-01`, `F3-API-ATDD-04`, `F3-E2E-ATDD-01` |
| F3-AC2 | f-3 | P0 | FULL | `F3-API-ATDD-01`, `F3-API-ATDD-03`, `F3-E2E-ATDD-02` |
| F3-AC3 | f-3 | P1 | FULL | `F3-API-ATDD-04`, `F3-E2E-ATDD-03`, `F4-API-AUTO-02` |
| F3-AC4 | f-3 | P1 | FULL | `F3-API-ATDD-02`, `F3-E2E-ATDD-02`, `F3-E2E-ATDD-03` |
| F4-AC1 | f-4 | P0 | FULL | `F4-API-AUTO-01`, `F4-E2E-AUTO-01`, `F4-E2E-AUTO-02` |
| F4-AC2 | f-4 | P0 | FULL | `F4-API-AUTO-02`, `F4-E2E-AUTO-02` |
| F4-AC3 | f-4 | P1 | FULL | `F4-API-AUTO-06`, `F4-E2E-AUTO-03`, `CI-API-02` |
| F4-AC4 | f-4 | P1 | FULL | `F4-API-AUTO-03`, `F4-API-AUTO-04`, `F4-API-AUTO-05`, `F4-E2E-AUTO-01` |

## Detailed Mapping

### F1-AC1 (P0)
Provider resolution dispatches outbound/inbound operations through deterministic adapter selection for enabled providers.

Coverage: **FULL**
Tests:
  - `F1-API-ATDD-01` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts:7 (API)
  - `F1-API-AUTO-01` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.automate.api.spec.ts:16 (API)
  - `F1-E2E-AUTO-01` - tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.automate.spec.ts:18 (E2E)

### F1-AC2 (P0)
Disabled or missing providers return deterministic refusal with no partial writes.

Coverage: **FULL**
Tests:
  - `F1-API-ATDD-03` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts:80 (API)
  - `F1-API-AUTO-02` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.automate.api.spec.ts:62 (API)
  - `F1-E2E-ATDD-02` - tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts:65 (E2E)

### F1-AC3 (P1)
Domain handlers avoid Twilio-specific branching and use adapter contracts.

Coverage: **FULL**
Tests:
  - `F1-API-ATDD-05` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts:161 (API)
  - `F4-API-AUTO-06` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:346 (API)
  - `CI-API-02` - tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts:128 (API)

### F1-AC4 (P1)
Operator-visible refusal metadata is explicit and confirms no hidden lifecycle mutation.

Coverage: **FULL**
Tests:
  - `F1-API-ATDD-04` - tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.api.spec.ts:118 (API)
  - `F1-E2E-AUTO-03` - tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.automate.spec.ts:174 (E2E)
  - `F1-E2E-ATDD-02` - tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.atdd.spec.ts:65 (E2E)

### F2-AC1 (P0)
Canonical event store persists aggregate id/type, event type, payload, and UTC timestamp with consistent schema.

Coverage: **FULL**
Tests:
  - `F2-API-ATDD-01` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts:53 (API)
  - `F2-API-AUTO-01` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts:58 (API)
  - `F2-E2E-AUTO-01` - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts:46 (E2E)

### F2-AC2 (P0)
Canonical translation shields downstream handlers from provider-specific fields.

Coverage: **FULL**
Tests:
  - `F2-API-ATDD-02` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts:123 (API)
  - `F2-API-AUTO-02` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts:151 (API)
  - `F2-E2E-AUTO-02` - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts:160 (E2E)

### F2-AC3 (P1)
Canonical events queries by aggregate id/event type remain deterministic and provider-neutral.

Coverage: **FULL**
Tests:
  - `F2-API-ATDD-03` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts:175 (API)
  - `F2-API-AUTO-03` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts:210 (API)
  - `F2-E2E-ATDD-02` - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts:184 (E2E)

### F2-AC4 (P1)
Operator timeline/status output remains provider-neutral, stable, and deterministically ordered.

Coverage: **FULL**
Tests:
  - `F2-API-ATDD-04` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts:226 (API)
  - `F2-API-AUTO-04` - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts:291 (API)
  - `F2-E2E-ATDD-03` - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts:282 (E2E)

### F3-AC1 (P0)
Provider leg/message identifiers are persisted with provider-scoped uniqueness constraints.

Coverage: **FULL**
Tests:
  - `F3-API-ATDD-01` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:17 (API)
  - `F3-API-ATDD-04` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:187 (API)
  - `F3-E2E-ATDD-01` - tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts:21 (E2E)

### F3-AC2 (P0)
Metadata-missing callbacks resolve via provider identifier fallback or deterministic refusal.

Coverage: **FULL**
Tests:
  - `F3-API-ATDD-01` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:17 (API)
  - `F3-API-ATDD-03` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:148 (API)
  - `F3-E2E-ATDD-02` - tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts:135 (E2E)

### F3-AC3 (P1)
Duplicate provider identifiers/callbacks are replay-safe and prevent duplicate domain writes.

Coverage: **FULL**
Tests:
  - `F3-API-ATDD-04` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:187 (API)
  - `F3-E2E-ATDD-03` - tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts:203 (E2E)
  - `F4-API-AUTO-02` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:80 (API)

### F3-AC4 (P1)
Resolved/refused fallback outcomes remain deterministic and avoid phantom lifecycle updates in operator contracts.

Coverage: **FULL**
Tests:
  - `F3-API-ATDD-02` - tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts:86 (API)
  - `F3-E2E-ATDD-02` - tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts:135 (E2E)
  - `F3-E2E-ATDD-03` - tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts:203 (E2E)

### F4-AC1 (P0)
Telnyx-enabled outbound/inbound flows preserve lifecycle and envelope contract parity.

Coverage: **FULL**
Tests:
  - `F4-API-AUTO-01` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:25 (API)
  - `F4-E2E-AUTO-01` - tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts:25 (E2E)
  - `F4-E2E-AUTO-02` - tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts:120 (E2E)

### F4-AC2 (P0)
Telnyx webhook signature/canonical translation feeds deterministic correlation and replay-safe paths.

Coverage: **FULL**
Tests:
  - `F4-API-AUTO-02` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:80 (API)
  - `F4-E2E-AUTO-02` - tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts:120 (E2E)

### F4-AC3 (P1)
CI/policy checks block direct Twilio-coupled implementation outside approved adapter contracts.

Coverage: **FULL**
Tests:
  - `F4-API-AUTO-06` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:346 (API)
  - `F4-E2E-AUTO-03` - tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts:216 (E2E)
  - `CI-API-02` - tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts:128 (API)

### F4-AC4 (P1)
Staged rollout allow-list and rollback behavior is explicit, auditable, and fail-closed.

Coverage: **FULL**
Tests:
  - `F4-API-AUTO-03` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:173 (API)
  - `F4-API-AUTO-04` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:223 (API)
  - `F4-API-AUTO-05` - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts:269 (API)
  - `F4-E2E-AUTO-01` - tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts:25 (E2E)

## Gap Analysis

- Critical gaps (P0): 0
- High gaps (P1): 0
- Medium gaps (P2): 0
- Low gaps (P3): 0
- Partial/limited coverage items: 0

## Coverage by Test Level

| Test Level | Criteria Covered | Coverage % |
| --- | ---: | ---: |
| E2E | 15 | 94% |
| API | 16 | 100% |
| COMPONENT | 0 | 0% |
| UNIT | 0 | 0% |

## Quality Observations

- No skipped tests were detected in Epic F API/E2E story suites.
- No hard waits (`waitForTimeout` / `sleep`) were detected.
- Date-derived dynamic identifiers were detected in several suites; deterministic helper IDs are recommended.
- Oversized suites (>300 LOC):
  - tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts
  - tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts
  - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts
  - tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts

## Phase 2 Gate Decision

**Decision:** PASS ✅

**Rationale:** P0 coverage is 100% and overall coverage is 100% (target: 90%).

### Recommended Actions
- [MEDIUM] Replace Date.now-based dynamic IDs in Epic F specs with deterministic test ID helpers to improve rerun determinism.
- [MEDIUM] Split oversized Epic F spec files (>300 LOC) into capability-focused suites for maintainability and faster triage.
- [LOW] Re-run NFR evidence collection (performance/reliability artifacts) before release promotion, even though traceability coverage is complete.

## Generated Artifacts

- Coverage matrix JSON: /tmp/tea-trace-coverage-matrix-2026-03-02T03-32-06Z.json
- Traceability report: _bmad-output/test-artifacts/traceability-report.md
- Matrix document: _bmad-output/test-artifacts/traceability-matrix.md
