---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-02-17'
---

# Test Design for QA: Shyft Platform Kernel + RouteShyft Commitment Spine

**Purpose:** Test execution recipe for QA team. Defines what to test, how to test it, and what QA needs from other teams.

**Date:** 2026-02-17
**Author:** Master Test Architect
**Status:** Draft
**Project:** Shyft

**Related:** See Architecture doc (`/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/test-design-architecture.md`) for architectural concerns and ownership.

---

## Executive Summary

**Scope:** QA execution coverage for Phase 0 platform hardening and RouteShyft MVP commitment lifecycle (public donor intake, cashier-assisted intake, dispatcher planning, driver execution, refusal handling, and reporting integrity).

**Risk Summary:**

- Total Risks: 10 (5 high-priority score >=6, 3 medium, 2 low)
- Critical Categories: DATA, SEC, TECH, BUS/OPS integration

**Coverage Summary:**

- P0 tests: ~22 (core commitment lifecycle, tenant/security, timezone correctness)
- P1 tests: ~34 (workflow variants, bridge contracts, idempotency)
- P2 tests: ~28 (edge cases, validations, regressions)
- P3 tests: ~10 (exploratory + long-running diagnostics)
- **Total**: ~94 tests (~6-10 weeks with 1 QA)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **OperationsShyft full workflows** | MVP prioritizes RouteShyft + kernel hardening | Validate only Route-facing commitment contract compatibility |
| **Cross-org consent sharing flows** | Explicitly deferred by phased roadmap | Keep flags OFF and verify blocked behavior only |
| **Neighbor portal account lifecycle** | Not in MVP; cashier + public donor form prioritized | Validate donor self-service form and cashier-assisted intake only |

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed with stable integration automation until these are delivered.

### Backend/Architecture Dependencies (Sprint 0)

1. **B-001: Tenant isolation enforcement hooks** - Platform Backend - Sprint 0
- QA needs repository-level tenant guards and a deterministic cross-tenant denial path.
- Blocks negative-path validation for all protected APIs.

2. **B-002: Centralized timezone service contract** - Platform Core - Sprint 0
- QA needs canonical parse/format behavior (`user -> tenant -> system` fallback).
- Blocks deterministic verification that UTC is never shown to users/admin.

3. **B-003: Mutation + event + outbox transaction contract** - Platform Core - Sprint 0
- QA needs assertion points that every mutation writes both event and outbox rows.
- Blocks confidence in commitment lifecycle integrity across modules.

### QA Infrastructure Setup (Sprint 0)

1. **Test Data Factories** - QA
- Multi-tenant factories (`tenant`, `user`, `request`, `commitment`, `run`, `stop`, `completion_record`) with faker randomization.
- Auto-cleanup fixtures for parallel-safe execution.

2. **Test Environments** - QA
- Local: Docker Postgres + backend + frontend with seeded fixtures.
- CI/CD: shard-based Playwright suite with policy gate before tests.
- Staging: bridge-enabled environment with WP thin UI integration paths.

**Example factory pattern:**

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test('creates commitment in tenant scope @P0 @api', async ({ apiRequest }) => {
  const tenantId = faker.string.uuid();

  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/v1/commitments',
    headers: { 'x-tenant-id': tenantId },
    body: {
      sourceType: 'request',
      sourceId: faker.string.uuid(),
      scheduledAtLocal: '2026-02-18T09:00:00',
      timezone: 'America/Chicago',
    },
  });

  expect(status).toBe(201);
  expect(body.ok).toBe(true);
  expect(body.data.tenantId).toBe(tenantId);
});
```

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| **R-001** | DATA | Cross-tenant data exposure | **9** | Negative API/E2E tests for tenant boundary breach attempts |
| **R-002** | BUS | UTC shown to users/admin | **6** | Locale/timezone rendering matrix, DST boundary tests |
| **R-003** | TECH | Mutation without event/outbox | **6** | Mutation contract tests asserting event + outbox side effects |
| **R-004** | SEC | CSRF/cookie misconfiguration across subdomains | **6** | CSRF state-changing suite with cookie policy matrix |
| **R-005** | OPS | WP bridge state divergence | **6** | Backend contract lane against live API with state authority assertions |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| R-006 | TECH | Idempotency gaps on driver retries | 4 | Replay/duplicate submission tests using idempotency keys |
| R-007 | PERF | Capacity check degradation under concurrency | 4 | API load probes and scheduling contention checks |
| R-008 | OPS | Missing correlation links in logs | 3 | Observability assertions for correlation-id continuity |
| R-009 | BUS | Refusal copy inconsistency | 2 | API/UI envelope checks for refusal code/message/data |
| R-010 | PERF | Dashboard query noise | 1 | Lightweight regression smoke for dashboard endpoints |

---

## Entry Criteria

- [ ] Requirements and assumptions confirmed by QA, Dev, PM
- [ ] Test environments provisioned and reachable
- [ ] Test data factories or seeded fixtures available
- [ ] Sprint 0 blockers B-001, B-002, B-003 resolved
- [ ] Feature branch deployed in test environment
- [ ] Donor self-service form and cashier-assisted flow accessible for E2E paths

## Exit Criteria

- [ ] All P0 tests passing
- [ ] P1 pass rate >=95% or failures formally accepted
- [ ] No unresolved high-severity defects in commitment/security paths
- [ ] Tenant, timezone, and event/outbox integrity suites green
- [ ] Coverage assessed as sufficient by QA Lead + Dev Lead

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = priority and risk level, NOT execution timing.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround + broad impact.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P0-001** | Tenant-scoped read/write isolation on protected APIs | API | R-001 | Include cross-tenant negative attempts |
| **P0-002** | Commitment lifecycle valid transitions only | API | R-003 | Reject invalid transition graph edges |
| **P0-003** | Every mutation writes event + outbox atomically | API | R-003 | Validate rollback semantics |
| **P0-004** | CSRF required on all state-changing routes | E2E/API | R-004 | Authenticated browser and API checks |
| **P0-005** | Date/time shown in user preferred timezone | E2E | R-002 | Never display raw UTC strings |
| **P0-006** | Dispatcher scheduling blocks over-capacity slots | E2E/API | R-007 | Includes refusal with alternatives |
| **P0-007** | Driver completion proof immutable append-only | API | R-003 | No update/delete after completion append |
| **P0-008** | 100% terminal state enforcement for commitments | API | R-003 | No unresolved active commitments past policy window |

**Total P0:** ~22 tests

---

### P1 (High)

**Criteria:** Important workflows + medium risk + common usage.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P1-001** | Donor self-service public pickup form flow | E2E | R-005 | ZIP eligibility, day-part, refusal alternatives |
| **P1-002** | Cashier-assisted phone intake on donor behalf | E2E/API | R-005 | Same validation rules as public flow |
| **P1-003** | Voucher recipient delivery commitment scheduling | E2E/API | R-002 | Counter checkout scheduling path |
| **P1-004** | Dispatcher run create/edit/reorder/publish | E2E | R-005 | Publish constraints enforced |
| **P1-005** | Driver status progression and idempotent retries | E2E/API | R-006 | en_route -> arrived -> completed |
| **P1-006** | Bridge fulfillment/pending/completion contracts | API | R-005 | Live contract lane compatible |
| **P1-007** | Refusal envelope consistency across modules | API | R-009 | HTTP 200 + ok=false structure |

**Total P1:** ~34 tests

---

### P2 (Medium)

**Criteria:** Secondary behavior, low-risk edge cases, regression guards.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P2-001** | Correlation-id propagation through request chain | API | R-008 | Log assertion hooks |
| **P2-002** | Timezone fallback precedence validation | API/Component | R-002 | user -> tenant -> system |
| **P2-003** | Refusal alternatives minimum coverage and copy fields | API/E2E | R-009 | structured alternatives required |
| **P2-004** | Capacity view consistency for dispatcher planning | API/E2E | R-007 | compare against slot source data |
| **P2-005** | Dashboard operational metrics integrity | API | R-010 | completion/utilization/terminal coverage |

**Total P2:** ~28 tests

---

### P3 (Low)

**Criteria:** Exploratory, long-running, diagnostic scenarios.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P3-001** | Extended burn-in for flaky scheduling flows | E2E | R-007 | 10-iteration burn-in |
| **P3-002** | Long-window DST transition exploratory checks | Exploratory/API | R-002 | manual assist accepted |
| **P3-003** | Non-critical reporting UX regression sweep | E2E | R-010 | smoke-level only |

**Total P3:** ~10 tests

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless expensive or long-running infrastructure makes that impractical.

### Every PR: Playwright Tests (~10-15 min)

- All functional E2E/API/integration tests across P0-P3 that fit PR runtime.
- Parallel execution in 4 shards.
- Includes policy gate, lint, core functional tests.

### Nightly: k6 Performance Tests (~30-60 min)

- Capacity and contention performance checks.
- Route scheduling concurrency and key API latency probes.

### Weekly: Chaos & Long-Running (~hours)

- Burn-in extensions, resilience drills, backup/restore validation where applicable.
- Manual operational reviews for observability and reporting drift.

---

## QA Effort Estimate

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~22 | ~2-3 weeks | Highest rigor, environment + contract dependencies |
| P1 | ~34 | ~2-3 weeks | Core workflows and bridge verification |
| P2 | ~28 | ~1-2 weeks | Regression and edge-case depth |
| P3 | ~10 | ~0.5-1 week | Exploratory and long-running lanes |
| **Total** | ~94 | **~6-10 weeks** | Single QA, excludes platform/dev work |

---

## Sprint Planning Handoff

| Work Item | Owner | Target Sprint | Notes |
| --- | --- | --- | --- |
| B-001 tenant hooks complete | Platform Backend | Sprint 0 | prerequisite for isolation tests |
| B-002 timezone service complete | Platform Core | Sprint 0 | prerequisite for all date/time assertions |
| B-003 mutation contract complete | Platform Core | Sprint 0 | prerequisite for integrity coverage |
| P0 suite implementation | QA | Sprint 1 | start after Sprint 0 blockers clear |
| P1 bridge and workflow suite | QA + Route | Sprint 1-2 | requires stable bridge endpoints |

---

## Appendix A: Code Examples & Tagging

**Tagging convention:**

- `@P0`, `@P1`, `@P2`, `@P3` for priority
- `@api`, `@e2e`, `@perf`, `@security` for lane filtering
- `@tenant`, `@timezone`, `@outbox`, `@bridge` for risk domain slicing

**Example run filters:**

```bash
npm run test -- --grep "@P0"
npm run test -- --grep "@timezone"
```

---

## Appendix B: Knowledge Base References

- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/risk-governance.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/probability-impact.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-levels-framework.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
- `/Users/jeremiahotis/moneyshyft/_bmad/tea/testarch/knowledge/test-quality.md`

