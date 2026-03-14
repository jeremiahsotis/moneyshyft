---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-19'
---

# Test Design for QA: ConnectShyft System-Level

**Purpose:** Test execution recipe for QA team. Defines what to test, how to test it, and what QA needs from other teams.

**Date:** 2026-02-19
**Author:** Master Test Architect
**Status:** Draft
**Project:** Shyft / ConnectShyft

**Related:** See Architecture doc (`/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-architecture.md`) for architectural blockers, ASRs, and backend-owned mitigations.

---

## Executive Summary

**Scope:** QA execution coverage for ConnectShyft module behavior under strict tenant/orgUnit scoping, deterministic escalation, webhook security/idempotency, and RouteShyft-safe parallel delivery constraints.

**Risk Summary:**

- Total Risks: 12 (6 high-priority score >=6, 4 medium, 2 low)
- Critical Categories: DATA, SEC, OPS, TECH

**Coverage Summary:**

- P0 tests: ~24 (core invariants, security, escalation integrity)
- P1 tests: ~30 (key workflows, integration paths, governance controls)
- P2 tests: ~22 (edge behavior, regression stability)
- P3 tests: ~10 (exploratory, long-running diagnostics)
- **Total**: ~86 tests (~6-10 weeks for one QA engineer)

---

## Not in Scope

**Components or systems explicitly excluded from this test plan:**

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **RouteShyft feature expansion stories** | This plan targets ConnectShyft system-level readiness, not RouteShyft feature development | RouteShyft regression lane is still mandatory as release guard |
| **CRM-style lifecycle management** | Explicit PRD non-goal; not part of ConnectShyft MVP | Validate refusal behavior and hidden navigation for out-of-scope actions |
| **Cross-tenant communication federation** | Explicitly forbidden by architecture and tenancy model | Include negative authorization and scoping tests |
| **Non-Twilio provider integrations** | Out of MVP scope | Keep provider abstraction tests focused on Twilio contracts only |

**Note:** Out-of-scope items are intentional constraints and should not be backfilled in QA scope without PRD update.

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed with stable integration automation until these items are delivered.

### Backend/Architecture Dependencies (Sprint 0)

1. **B-001: ConnectShyft schema/search_path + indexes complete** - Platform Backend - Sprint 0
- QA needs `connectshyft` schema, partial unique constraints, scheduler indexes, and webhook receipts table in all test environments.
- Blocks thread uniqueness and due-evaluation reliability tests.

2. **B-002: Escalation worker contract implemented** - Platform Backend - Sprint 0
- QA needs deterministic evaluation loop using persisted `next_evaluation_at_utc` and `SELECT ... FOR UPDATE SKIP LOCKED`.
- Blocks restart-safe escalation and claim-cancellation verification.

3. **B-003: Import boundary lint + CI gate active** - Platform Architecture - Sprint 0
- QA needs enforceable proof that ConnectShyft does not directly import RouteShyft internals.
- Blocks parallel safety sign-off.

4. **B-004: Webhook signature + SID dedupe ledger complete** - Security + Platform Backend - Sprint 0
- QA needs production-equivalent refusal/success behavior for invalid signatures and replay events.
- Blocks webhook integrity and duplicate suppression tests.

5. **B-005: Feature flags wired with kill-switch behavior** - Release Engineering - Sprint 0
- QA needs deterministic OFF-state and fail-closed behavior validation.
- Blocks controlled rollout tests.

### QA Infrastructure Setup (Sprint 0)

1. **Test Data Factories** - QA
- Tenant/orgUnit/user factories aligned to capability model.
- ConnectShyft entity factories for number mappings, neighbors, phones, threads, messages, voicemails.
- Cleanup-safe fixtures for parallel test execution.

2. **Test Environments** - QA
- Local: backend + Postgres with ConnectShyft migrations and seed helpers.
- CI/CD: Playwright shard execution (4 shards) with policy gate as first blocker.
- Staging: Twilio test webhooks and feature-flag controls for allow-list rollout simulation.

**Example factory pattern:**

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test('ensures one active thread per neighbor+orgUnit @P0 @api @tenant', async ({ apiRequest }) => {
  const tenantId = faker.string.uuid();
  const orgUnitId = faker.string.uuid();
  const neighborId = faker.string.uuid();

  const body = { tenantId, orgUnitId, neighborId };

  const first = await apiRequest({
    method: 'POST',
    path: '/api/v1/connectshyft/threads',
    body,
  });

  const second = await apiRequest({
    method: 'POST',
    path: '/api/v1/connectshyft/threads',
    body,
  });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(first.body.data.id).toBe(second.body.data.id);
});
```

---

## Risk Assessment

**Note:** Full architecture-level risk ownership and mitigation plans are in the companion architecture document. This section focuses on QA validation responsibilities.

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| **R-001** | DATA | Duplicate active threads under concurrent ensure requests | **9** | Concurrent API ensure tests validating single active thread invariant |
| **R-002** | OPS | Escalation progression misfires across retries/restarts | **6** | Scheduler integration tests + restart simulation with persisted due times |
| **R-003** | SEC | Webhook spoof/replay introduces invalid or duplicate artifacts | **9** | Signature-negative tests and replay SID dedupe tests |
| **R-004** | TECH | Hidden RouteShyft/ConnectShyft coupling via imports | **6** | CI policy/boundary checks as required quality gates |
| **R-005** | BUS | Claim-only escalation semantics drift | **6** | Transition tests proving outbound-no-claim does not reset escalation |
| **R-006** | DATA | Tenant-scoped identity edits produce unintended global side effects | **6** | Authorization + provenance tests on neighbor edit/merge endpoints |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| R-007 | PERF | Due-thread query slows under load | 4 | API latency and scheduler throughput probes |
| R-008 | OPS | Receipt ledger retention drift | 4 | Retention job validation and duplicate key regression tests |
| R-009 | SEC | Capability mapping drift causes role leakage | 3 | Role-to-capability matrix API tests across endpoints |
| R-010 | OPS | Feature flag rollout misconfiguration | 3 | OFF-state/allow-list kill-switch test matrix |
| R-011 | BUS | Escalation label copy mismatch | 2 | UI copy/surface regression checks |
| R-012 | PERF | Non-critical inbox sorting jitter | 1 | Realtime update smoke checks |

---

## Entry Criteria

**QA testing cannot begin until ALL of the following are met:**

- [ ] Architecture blockers B-001 through B-005 completed
- [ ] ConnectShyft feature flags available in target environment
- [ ] Twilio signature verification secrets configured in test environments
- [ ] Test data factories and cleanup fixtures are stable in CI
- [ ] RouteShyft regression lane is runnable from ConnectShyft PR workflow
- [ ] OrgUnit context switching and role scaffolding available for E2E test setup

## Exit Criteria

**Testing phase is complete when ALL of the following are met:**

- [ ] All P0 tests passing (100%)
- [ ] P1 pass rate >=95% (or formally accepted exceptions)
- [ ] No unresolved high-severity defects in tenant isolation, escalation, or webhook integrity paths
- [ ] High-risk mitigations (R-001 through R-006) verified in staging
- [ ] Coverage sufficiency agreed by QA Lead and Dev Lead (target >=80% of planned automated scope)

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level** (what to focus on when constrained), NOT execution timing.

### P0 (Critical)

**Criteria:** Blocks core functionality + high risk (>=6) + no workaround + broad operator impact.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P0-001** | Single active thread invariant on `(tenant, orgUnit, neighbor)` | API | R-001 | Concurrent ensure request race tests |
| **P0-002** | Ensure endpoint returns existing active thread if present | API | R-001 | Insert/conflict-fetch behavior |
| **P0-003** | Canonical enum enforcement (`UNCLAIMED`, `CLAIMED`, `CLOSED`) | API | R-005 | Reject unsupported state values |
| **P0-004** | Claim-only escalation reset behavior | API/E2E | R-005 | Outbound without claim must not reset |
| **P0-005** | Claim cancels pending escalation notifications | API | R-002 | `next_evaluation_at_utc` null + no enqueue |
| **P0-006** | X->2X->3X deterministic progression | API/Integration | R-002 | Restart/retry safe evaluation |
| **P0-007** | Twilio webhook signature validation | API | R-003 | Invalid signatures refused |
| **P0-008** | Webhook dedupe by SID/event type | API | R-003 | Replay does not duplicate timeline |
| **P0-009** | Tenant/orgUnit scoping enforcement on all ConnectShyft endpoints | API | R-006 | Negative authorization matrix |
| **P0-010** | Neighbor edit provenance metadata includes originating orgUnit | API | R-006 | Audit metadata required |
| **P0-011** | Preference override required for `prefers_texting=NO` | API/E2E | R-005 | Reason code required and audited |
| **P0-012** | Feature flag OFF-state fails closed for inbox/webhooks | E2E/API | R-010 | Explicit unavailable behavior |

**Total P0:** ~24 tests

---

### P1 (High)

**Criteria:** Important user workflows + medium/high risk + common operations.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P1-001** | Inbound SMS creates/appends to correct thread by mapped number | API/E2E | R-003 | Deterministic tenant/orgUnit routing |
| **P1-002** | Voice webhook and transcription attachment workflow | API | R-003 | No duplicate voicemail artifacts |
| **P1-003** | Inbox deterministic sorting by escalation stage and ownership rules | E2E | R-012 | Stage order and within-stage ordering |
| **P1-004** | New thread action routes to existing active thread when present | E2E | R-001 | Non-disruptive “existing thread opened” notice |
| **P1-005** | Takeover requires reason and notifies previous owner | E2E/API | R-005 | Policy + audit checks |
| **P1-006** | Tenant-scoped identity update reflected across orgUnits | API/E2E | R-006 | Shared identity propagation |
| **P1-007** | Merge operation capability restrictions and audit trail | API | R-006 | Restricted roles only |
| **P1-008** | Preferred outbound number policy behavior | API | R-005 | Uses configured/derived outbound number |
| **P1-009** | Module boundary CI gate runs on ConnectShyft pull requests | CI/Contract | R-004 | Boundary rule enforcement |
| **P1-010** | RouteShyft regression lane executes on ConnectShyft PRs | CI/Contract | R-004 | Parallel-safety guard |

**Total P1:** ~30 tests

---

### P2 (Medium)

**Criteria:** Secondary flows + low/medium risk + regression prevention.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P2-001** | Escalation countdown UI uses server-derived timestamps | E2E/Component | R-002 | Informational only, no client authority |
| **P2-002** | Neighbor phone shared-flag and verification display behavior | E2E | R-006 | Governance visibility |
| **P2-003** | Duplicate webhook suppression in timeline rendering | E2E | R-003 | No visible duplicate events |
| **P2-004** | Capability matrix denies operational inbox for `SYSTEM_ADMIN` by default | API/E2E | R-009 | Provisioning-only default behavior |
| **P2-005** | Feature sub-flags for inbox/escalation/webhooks show expected state | E2E | R-010 | Clear maintenance messaging |
| **P2-006** | Cross-orgUnit blended inbox is inaccessible by default | E2E/API | R-006 | Scope isolation |

**Total P2:** ~22 tests

---

### P3 (Low)

**Criteria:** Nice-to-have exploratory checks, long-running diagnostics, and resilience probes.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P3-001** | Extended replay storm simulation for webhook idempotency | Perf/API | R-003 | High-volume duplicate SID replay |
| **P3-002** | Long-running escalation drift burn-in | Integration | R-002 | Multi-hour deterministic scheduler checks |
| **P3-003** | Exploratory UX checks on rapid orgUnit context switching | Exploratory/E2E | R-012 | Context safety and header clarity |

**Total P3:** ~10 tests

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless infrastructure overhead or runtime makes it expensive/long-running.

### Every PR: Playwright Tests (~10-15 min)

- All functional API/E2E/integration tests that validate product behavior and invariants.
- Parallelized in 4 shards.
- Includes policy gate and contract checks required for merge.

### Nightly: k6 Performance Tests (~30-60 min)

- Throughput/latency tests for webhook ingestion and due-thread scheduler scans.
- Stress profiles for ensure endpoint and inbox fetch under contention.

### Weekly: Chaos & Long-Running (~hours)

- Restart/retry chaos scenarios for escalation worker.
- Extended replay and retention-job endurance checks.
- Manual governance spot checks where automation coverage is intentionally light.

---

## QA Effort Estimate

**QA test development effort only** (excludes platform/backend/security implementation work):

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~24 | ~2-3 weeks | Concurrency, security, and scheduler integrity require deeper setup |
| P1 | ~30 | ~2-3 weeks | Core workflows, module-boundary, and regression contracts |
| P2 | ~22 | ~1-2 weeks | Regression and governance edge behavior |
| P3 | ~10 | ~0.5-1 week | Burn-in and exploratory diagnostics |
| **Total** | ~86 | **~6-10 weeks** | Single QA engineer, full-time |

**Assumptions:**

- Includes test design, implementation, debugging, and CI integration.
- Assumes Sprint 0 blockers and environment prerequisites are completed.
- Excludes ongoing maintenance and triage after initial buildout.

---

## Sprint Planning Handoff

| Work Item | Owner | Target Sprint (Optional) | Dependencies/Notes |
| --- | --- | --- | --- |
| Deliver B-001 schema/search_path/index package | Platform Backend | Sprint 0 | Required for all P0 thread/scheduler tests |
| Deliver B-002 escalation worker contract | Platform Backend | Sprint 0 | Required for escalation and claim cancellation tests |
| Deliver B-003 boundary lint/CI enforcement | Platform Architecture | Sprint 0 | Required for parallel safety sign-off |
| Deliver B-004 webhook signature/dedupe ledger | Security + Platform Backend | Sprint 0 | Required for webhook integrity tests |
| Implement P0 suites | QA | Sprint 1 | Starts after all blockers clear |
| Implement P1 and RouteShyft-safe regression suites | QA + Dev | Sprint 1-2 | Requires stable endpoint contracts |

---

## Tooling & Access

| Tool or Service | Purpose | Access Required | Status |
| --- | --- | --- | --- |
| Playwright + playwright-utils | API/E2E automation and fixtures | Repository test runner access | Ready |
| Postgres test database | Deterministic data setup and constraint validation | Local/CI DB credentials | Ready |
| Twilio test credentials and webhook secrets | Signature validation and webhook replay tests | Staging/non-prod secrets | Pending |
| CI pipeline lanes (`policy`, `test`, `quality-gates`, RouteShyft regression) | Merge gate validation | CI workflow permissions | Ready |

**Access requests needed (if any):**

- [ ] Twilio staging credentials for webhook signature and replay scenarios

---

## Interworking & Regression

**Services and components impacted by this feature:**

| Service/Component | Impact | Regression Scope | Validation Steps |
| --- | --- | --- | --- |
| **Platform Context APIs** | ConnectShyft depends on active tenant/orgUnit context | Context resolution and refusal behavior | API/E2E tests for context switch and scope enforcement |
| **Platform RBAC Capability Mapping** | Role/capability checks gate operational actions | Capability matrix regression | Endpoint authorization test suite |
| **RouteShyft module boundary** | Must remain isolated despite parallel development | Import boundary and regression lane | CI boundary checks + RouteShyft smoke/regression lane |
| **Event/Outbox infrastructure** | Audit and domain events required for critical actions | Mutation side-effect integrity | API integration tests on governance/lifecycle actions |

**Regression test strategy:**

- ConnectShyft PRs must pass module-specific suites plus RouteShyft regression lanes.
- Cross-team coordination required between QA, Platform Backend, and RouteShyft owners when shared CI or data fixtures change.

---

## Appendix A: Code Examples & Tagging

**Tagging convention:**

- `@P0`, `@P1`, `@P2`, `@P3` for priority
- `@api`, `@e2e`, `@integration`, `@perf`, `@security` for lane slicing
- `@tenant`, `@orgunit`, `@escalation`, `@webhook`, `@dedupe`, `@route-regression` for domain grouping

**Example run filters:**

```bash
npm test -- --grep "@P0"
npm test -- --grep "@webhook"
npm test -- --grep "@route-regression"
```

---

## Appendix B: Knowledge Base References

- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/adr-quality-readiness-checklist.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/risk-governance.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/probability-impact.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-levels-framework.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-quality.md`
