# User Testing Approach - Epic A Full Coverage (Tasks 1-29 + Migration/Auth Fixes)

Date: 2026-02-23
Owner: QA/UAT

## Objective

Provide one repeatable UAT approach that validates:

- Task 1 through Task 29 in `_bmad-output/implementation-artifacts/tech-spec-epic-a-blocker-exit-criteria-remediation.md`
- Migration/auth hardening fixes (local Postgres auth, knex `.env` loading, Playwright preflight migration fallback)

## Execution Model

Run in five phases, in order:

1. Phase A: Environment + migration/auth resiliency
2. Phase B: Policy/status trust and guardrails (Tasks 1-5, 23-24)
3. Phase C: Backend/service/route entitlement and admin foundations (Tasks 6-13, 25-27)
4. Phase D: Frontend/operator UX and entitlement behavior (Tasks 14-22, 28)
5. Phase E: CI/report release-readiness behavior (Task 29)

## Entry Criteria

1. Docker/Postgres available locally.
2. Dependencies installed:
- `npm ci`
- `npm ci --prefix frontend`
- `npm install --prefix src --no-audit --fund=false`
3. Run from repo root `/Users/jeremiahotis/projects/connectshyft`.

## Phase A - Migration/Auth Fixes

### Commands

```bash
cd src && NODE_ENV=test npm run migrate:latest
npm run test:e2e -- tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts --workers=1
```

### Pass Criteria

1. `migrate:latest` exits `0` and reports successful migration state (`Already up to date` is acceptable).
2. No `password authentication failed for user "jeremiahotis"` error.
3. Playwright preflight completes backend migration/start sequence successfully.

### Evidence

1. Terminal output for migration command.
2. `tests/artifacts/runtime/backend.log`.

## Phase B - Policy/Status/Operability Guards (Tasks 1-5, 23-24)

### Commands

```bash
npm run story:status:set -- --help
npm run story:status:check
npm run policy:check
bash scripts/enforce-operability-closeout-guard.sh
npm run test:e2e -- tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts --workers=1
```

### Pass Criteria

1. Status transition command is present and usable.
2. Status sync checker runs without unexpected mismatches.
3. Policy gate blocks invalid conditions and passes valid conditions.
4. Operability closeout guard enforces required evidence fields for done critical/access-control stories.
5. Story `1-5` API suite passes (includes concurrency/single-winner transition behavior and operability gate checks).

### Evidence

1. Policy command output.
2. Playwright artifacts from `1-5` API suite.

## Phase C - Backend/Service/Route Foundations (Tasks 6-13, 25-27)

### Commands

```bash
cd src && npm test -- featureFlags.test.ts
cd src && npm test -- PlatformAdminService.test.ts
cd src && npm test -- platform-admin.test.ts
npm run test:e2e -- tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts --workers=1
```

Optional extended entitlement suites:

```bash
npm run test:e2e -- tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.api.spec.ts --workers=1
npm run test:e2e -- tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.api.spec.ts --workers=1
npm run test:e2e -- tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.api.spec.ts --workers=1
```

### Pass Criteria

1. Service/route Jest suites pass.
2. Story `1-2` API suite passes with coverage for:
- scoped lookup anti-enumeration
- inline admin provisioning
- delegation boundaries
- ConnectShyft and MoneyShyft denial contracts
3. Optional `a-1/a-2/a-5` API suites produce either full pass or documented defects.

### Evidence

1. Jest outputs for `featureFlags`, `PlatformAdminService`, `platform-admin`.
2. Playwright API artifacts and backend logs.

## Phase D - Frontend/Operator Journeys (Tasks 14-22, 28)

### Automated Commands

```bash
npm run test:e2e -- tests/e2e/platform/1-2-admin-provisioning-rbac-ui.spec.ts --workers=1
npm run test:e2e -- tests/e2e/platform/1-2-tenant-and-module-entitlement-administration.spec.ts --workers=1
```

### Manual Walkthrough (Required for Usability Evidence)

1. System admin guided bootstrap
- Open `/admin/system` as system admin.
- Create tenant with inline initial admin (email as identity input).
- Verify success and persisted tenant/admin assignment outcome.

2. Tenant admin scoped delegation
- Open `/admin/tenant` as tenant admin.
- Create orgUnit/subtenant structures.
- Assign in-scope identity via email-based flow.

3. Denial and boundary UX
- Attempt out-of-scope assignment and verify refusal messaging.
- Verify MoneyShyft hidden nav and direct URL denial/redirect for governed routes.
- Verify ConnectShyft visibility/access follows entitlement state.

### Pass Criteria

1. Automated E2E suites pass, or failures are captured as defects with trace/log evidence.
2. Manual walkthrough confirms operator can complete intended flows without UUID-only dependencies.

### Evidence

1. `tests/artifacts/playwright-report/`
2. `tests/artifacts/test-results/`
3. Screenshots/video/trace for any failed path
4. Manual checklist notes attached to closeout artifact

## Phase E - CI/Report Finalization (Task 29)

### Commands

```bash
bash scripts/quality-gates.sh
bash scripts/ci-local.sh
```

Static workflow checks:

```bash
rg -n "^  policy:|needs: policy|needs: lint|needs: \[test, burn-in\]|name: report|release-readiness|blocked_jobs" .github/workflows/test.yml
```

### Pass Criteria

1. Policy remains first blocking lane.
2. Downstream jobs depend on upstream pass conditions as designed.
3. Report job runs `always()` and summarizes blocked jobs/release-readiness.
4. Failures in policy/operability/test stages block release-readiness.

### Evidence

1. `ci-local` output.
2. Workflow file snippet verification.
3. CI report summary output (when run in CI).

## Task-to-Validation Matrix (1-29)

| Task | Validation Path |
| --- | --- |
| 1 | `story:status:set` command present; `1-5` API suite validates atomic/single-winner transition behavior |
| 2 | `package.json` scripts include status-transition automation; command help renders |
| 3 | `story:status:check` and `policy:check` enforce status sync |
| 4 | `policy:check` blocks mismatch/bypass paths locally and in CI semantics |
| 5 | Policy workflow behavior validated via `1-5` API suite and policy script execution |
| 6 | Service tests + `1-2` API suite verify entitlement authority behavior |
| 7 | `featureFlags.test.ts` validates flag merge/evaluation behavior |
| 8 | ConnectShyft route-layer denial behavior verified via API suites (`1-2`, optional `a-1`) |
| 9 | MoneyShyft invisibility/inaccessibility verified via `1-2` API + E2E suite |
| 10 | `platform-admin.test.ts` route coverage for lookup/inline identity contracts |
| 11 | `PlatformAdminService.test.ts` scoped lookup + inline create service coverage |
| 12 | `PlatformAdminService.test.ts` hierarchy cycle/contention coverage |
| 13 | `PlatformAdminService.test.ts` bounded module assignment coverage |
| 14 | `1-2-admin-provisioning-rbac-ui.spec.ts` + manual system-admin bootstrap walkthrough |
| 15 | `1-2-tenant-and-module-entitlement-administration.spec.ts` + manual tenant-admin delegation walkthrough |
| 16 | Frontend admin service contract behavior exercised by `1-2` E2E flows |
| 17 | Frontend navigation entitlement gating validated in `1-2` E2E and manual checks |
| 18 | Route accessibility gating verified via direct URL denial/redirect checks |
| 19 | Desktop nav hiding validated in `1-2` E2E/manual checks |
| 20 | Mobile nav hiding validated via manual responsive walkthrough |
| 21 | ConnectShyft inbox availability semantics validated via `a-1` API (optional) + manual checks |
| 22 | ConnectShyft availability page semantics validated via E2E/manual checks |
| 23 | `enforce-operability-closeout-guard.sh` direct run + `1-5` API guard test |
| 24 | `1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts` |
| 25 | `PlatformAdminService.test.ts` + `featureFlags.test.ts` |
| 26 | `platform-admin.test.ts` |
| 27 | `1-2-tenant-and-module-entitlement-administration.api.spec.ts` |
| 28 | `1-2-admin-provisioning-rbac-ui.spec.ts` + `1-2-tenant-and-module-entitlement-administration.spec.ts` |
| 29 | `.github/workflows/test.yml` dependency/report checks + `ci-local`/quality gates |

## Current Baseline Notes (Observed 2026-02-23)

1. Green in current local baseline:
- Migration path (`src` migrate latest)
- `PlatformAdminService.test.ts`
- `featureFlags.test.ts`
- `platform-admin.test.ts`
- `1-2` API Playwright suite
- `1-5` policy/workflow Playwright API suite

2. Known red areas to track as defects during UAT:
- `1-2` E2E suites have failing cases around session/bootstrap assumptions and role-bounded entitlement mutation expectations.
- Optional `a-1/a-2/a-5` API suites can fail when fixtures send non-UUID tenant identifiers into UUID-backed entitlement queries; capture as regression/contract defect if reproduced.

## Exit Criteria

UAT is complete when:

1. Phases A-E are executed.
2. Every task in 1-29 has either a passing validation artifact or a documented defect with evidence.
3. Migration/auth fixes are explicitly marked pass or fail with reproduction details.
4. Manual operator walkthrough evidence is attached for closeout-relevant stories.
