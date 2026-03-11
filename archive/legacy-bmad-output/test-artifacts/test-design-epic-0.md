---
stepsCompleted: ['step-01-detect-mode','step-02-load-context','step-03-risk-and-testability','step-04-coverage-plan','step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-17'
---

# Test Design: Epic 0 - Platform Kernel Hardening

**Date:** 2026-02-17
**Author:** Master Test Architect
**Status:** Draft
**Scope:** Epic-level test design for strict Phase-0 kernel hardening only.

## Executive Summary

- Total risks identified: 9
- High-priority risks (>=6): 6
- Coverage focus: tenancy isolation, auth/session rotation, CSRF + cookie policy, refusal envelope consistency, event/outbox atomicity, timezone correctness, and policy-gated CI behavior.

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| Route intake/dispatch/driver workflows | Explicitly excluded from Epic 0 | Keep all Route stories backlog until Epic 0 gate pass |
| Operations/Resource/POS business behavior | Out of strict Phase 0 scope | Validate only platform interfaces they depend on |
| Cross-org consent/handoff flows | Deferred phase | Verify feature flags remain off |

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0-001 | DATA | Missing tenant enforcement causes cross-tenant data leakage | 3 | 3 | 9 | Mandatory tenant filter tests + negative-path suite | Platform Backend | Story 0.2 |
| R0-002 | SEC | Refresh token replay/reuse accepted | 2 | 3 | 6 | Rotation + revoked/replayed token rejection tests | Platform Security | Story 0.3 |
| R0-003 | SEC | CSRF/cookie policy mismatch across app/api domains | 2 | 3 | 6 | CSRF matrix + cookie attribute contract tests | Platform Security | Story 0.4 |
| R0-004 | TECH | Mutations commit without event/outbox writes | 2 | 3 | 6 | Transaction contract tests fail on missing outbox/event | Platform Core | Story 0.7 |
| R0-005 | BUS | Raw UTC leaked in API/UI operational responses | 3 | 2 | 6 | UTC-at-rest/local-display contract tests | Platform Core | Story 0.8 |
| R0-006 | OPS | Policy stage does not block downstream CI jobs | 2 | 3 | 6 | Pipeline dependency assertion in CI checks | DevOps | Story 0.9 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0-007 | TECH | Middleware order drift breaks context propagation | 2 | 2 | 4 | Boot sequence integration tests | Platform Backend |
| R0-008 | DATA | Schema/index gaps degrade outbox replay or lookup | 2 | 2 | 4 | Migration and index verification tests | Platform Backend |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R0-009 | BUS | Minor refusal envelope copy variance | 1 | 2 | 2 | Monitor with contract snapshots |

## Entry Criteria

- [ ] Epic 0 story files exist and are `ready-for-dev`
- [ ] Test env provisions Postgres + backend + CI workflow visibility
- [ ] Tenant-scoped test data factory available
- [ ] Branch and git policy checks active

## Exit Criteria

- [ ] All Epic 0 P0 tests pass at 100%
- [ ] No open high-risk defects (score >=6)
- [ ] Phase-0 exit gates validated and recorded
- [ ] `sprint-status.yaml` remains authoritative for Epic 0 progress

## Test Coverage Plan

**Priority denotes risk/business criticality, not scheduling cadence.**

### P0 (Critical)

| Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- |
| Story 0.1 middleware chain ordering | API/Integration | R0-007 | Correlation + tenancy + auth + envelope sequence asserts |
| Story 0.2 tenant isolation and negative-path denial | API | R0-001 | Cross-tenant read/write attempts must fail |
| Story 0.3 session rotation + revocation enforcement | API | R0-002 | Replay/revoked refresh tokens rejected |
| Story 0.4 CSRF rejection + cookie policy matrix | API/E2E | R0-003 | State-changing routes blocked without valid CSRF |
| Story 0.5 envelope/refusal contract | API | R0-009 | HTTP 200 + `ok=false` for business refusal |
| Story 0.6 schema + index existence for events/outbox | DB/API | R0-008 | Migration-level validation |
| Story 0.7 atomic write + event + outbox | API/DB | R0-004 | Transaction rollback if companion writes missing |
| Story 0.8 UTC persist + local display fallback | API/E2E | R0-005 | `user -> tenant -> system` precedence |
| Story 0.9 policy stage blocks downstream jobs | CI | R0-006 | Lint/test/burn-in/quality-gates blocked on policy fail |
| Story 0.10 readiness suite aggregates all gates | CI/API | R0-001..R0-006 | Must fail if any phase-0 gate fails |

Estimated P0: ~30-45 tests (~2-3.5 weeks)

### P1 (High)

| Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- |
| Auth/session edge paths (expiry boundary, rotation race) | API | R0-002 | Time-window and retry behavior |
| Cookie domain/samesite env matrix regression | API | R0-003 | Dev/stage/prod policy profiles |
| Outbox replay query performance sanity | API/DB | R0-008 | Index usage checks |
| Refusal envelope schema consistency across routes | API | R0-009 | Contract-level snapshots |

Estimated P1: ~16-24 tests (~1-2 weeks)

### P2/P3 (Medium/Low)

| Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- |
| Middleware observability/correlation metadata integrity | API/Logs | R0-007 | Diagnostic confidence |
| Extended timezone edge coverage (DST boundary windows) | API/E2E | R0-005 | Exploratory and regression |
| CI failure message quality and troubleshooting hints | CI | R0-006 | Human-operability checks |

Estimated P2/P3: ~10-18 tests (~0.5-1.5 weeks)

## Execution Strategy

- PR lane: run all P0 and practical P1 functional tests in parallelized suites.
- Nightly lane: extended P1/P2 timezone and outbox replay checks.
- Weekly lane: burn-in and CI policy resilience checks.

## Quality Gates

- P0 pass rate: 100%
- P1 pass rate: >=95%
- No unmitigated risks with score >=6
- Mandatory gate set for Story 0.10:
  - Tenant isolation
  - Session rotation/revocation
  - CSRF/cookie policy
  - Envelope/refusal contract
  - Event/outbox atomicity
  - UTC/local timezone contract
  - Policy gate blocking behavior

## References

- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-1-canonical-app-entrypoint-and-platform-middleware-chain.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-10-kernel-readiness-verification-suite.md`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md`
- `/Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md`
