---
title: 'Epic A Blocker Exit Criteria Remediation'
slug: 'epic-a-blocker-exit-criteria-remediation'
created: '2026-02-23T07:51:54-0500'
status: 'in-progress'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'TypeScript (strict mode) across backend and frontend'
  - 'Backend: Node.js >=20, Express 4.18, Knex 3, PostgreSQL, Joi, JWT'
  - 'Frontend: Vue 3, Vue Router 4, Pinia, Axios, Vite'
  - 'CI and policy tooling: GitHub Actions + Bash/Node guard scripts'
  - 'Test stack: Jest (backend/service) + Playwright (API and E2E)'
files_to_modify:
  - 'scripts/story-status-transition.sh'
  - 'package.json'
  - 'scripts/enforce-git-policy.sh'
  - 'scripts/enforce-story-status-sync.sh'
  - 'docs/policies/git_policy.md'
  - 'scripts/enforce-operability-closeout-guard.sh'
  - '.github/workflows/test.yml'
  - 'src/src/services/PlatformAdminService.ts'
  - 'src/src/routes/api/v1/platform-admin.ts'
  - 'src/src/modules/connectshyft/featureFlags.ts'
  - 'src/src/routes/api/v1/connectshyft.ts'
  - 'src/src/api/registerRoutes.ts'
  - 'src/src/platform/rbac/capabilities.ts'
  - 'src/src/migrations/20260223110000_platform_admin_identity_scope_and_hierarchy_guards.ts'
  - 'frontend/src/services/platformAdmin.ts'
  - 'frontend/src/stores/access.ts'
  - 'frontend/src/router/index.ts'
  - 'frontend/src/views/Admin/SystemAdminView.vue'
  - 'frontend/src/views/Admin/TenantAdminView.vue'
  - 'frontend/src/components/layout/AppHeader.vue'
  - 'frontend/src/components/layout/AppMobileNav.vue'
  - 'frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue'
  - 'frontend/src/views/ConnectShyft/ConnectShyftAvailabilityView.vue'
  - 'tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts'
  - 'src/src/services/__tests__/PlatformAdminService.test.ts'
  - 'src/src/routes/api/v1/__tests__/platform-admin.test.ts'
  - 'tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts'
  - 'tests/e2e/platform/1-2-admin-provisioning-rbac-ui.spec.ts'
  - 'src/src/modules/connectshyft/__tests__/featureFlags.test.ts'
  - 'tests/e2e/platform/1-2-tenant-and-module-entitlement-administration.spec.ts'
code_patterns:
  - 'Policy enforcement is shell-first and lane-aware (project-lane-context -> enforce-git-policy orchestration)'
  - 'Business refusals use platform response envelopes and may intentionally return HTTP 200 with ok=false'
  - 'Route handlers are thin; PlatformAdminService holds scope/capability/data mutation logic'
  - 'Tenant/orgUnit authorization relies on JWT active tenant context plus scoped membership resolution'
  - 'Admin UI currently uses UUID input contracts; flow must pivot to canonical identity lookup (email==username)'
  - 'Org unit hierarchy uses adjacency list (parent_org_unit_id) and needs explicit ancestry/cycle safety checks'
  - 'ConnectShyft runtime gating currently resolves env/test flags and must be switched to entitlement authority'
  - 'Frontend navigation and route guards use auth/access stores and must incorporate module entitlement visibility'
test_patterns:
  - 'Backend tests are Jest files under src/src/**/__tests__/*.test.ts with mocked/service-level assertions'
  - 'Platform API contracts are Playwright API specs under tests/api/platform/*.api.spec.ts'
  - 'Admin/operator UX regressions are Playwright E2E specs under tests/e2e/platform/*.spec.ts'
  - 'Policy and workflow guard behavior is validated by dedicated platform gate specs and CI job ordering'
  - 'CI sharding/burn-in/quality gates are blocking release-readiness and summary/report must surface upstream failures'
---

# Tech-Spec: Epic A Blocker Exit Criteria Remediation

**Created:** 2026-02-23T07:51:54-0500

## Overview

### Problem Statement

Epic A blocker exit criteria are not currently satisfied because status tracking can drift, module access is still controlled by environment-only flags instead of tenant entitlements, admin foundations remain UUID-first and not operator-friendly, scoped delegation and scoped identity lookup are incomplete, and usability validation is not enforced as a blocking release gate.

### Solution

Deliver the full remediation plan (WS1-WS6) as a coordinated backend, frontend, policy, and test implementation. The result must hard-enforce status integrity, entitlement-backed runtime/UI access, human-friendly admin setup/delegation flows with scoped lookup and inline admin creation, and mandatory operability/usability gates before release.

### Scope

**In Scope:**
- WS1 status trust lockdown including atomic transitions and lane-correct policy enforcement.
- WS2 real entitlement runtime wiring for ConnectShyft and MoneyShyft visibility/access behavior.
- WS3 admin API foundation for scoped lookup, inline admin creation, structure config, and delegated module controls.
- WS4 system admin UX redesign for guided tenant bootstrap with inline initial tenant admin creation.
- WS5 tenant admin UX redesign for orgUnit/subtenant delegation and scoped assignment.
- WS6 blocking validation and release gates including API/E2E coverage and real-user operability enforcement.
- Deny behavior for gated module access uses refusal-envelope semantics (`ok=false` with HTTP 200) plus hidden/inaccessible UI.
- `username` and `email` are treated as the same identity field (single canonical user identifier input).
- Subtenant model includes deep hierarchical nesting with tenant-safe ancestry validation and cycle prevention.
- After spec finalization, proceed directly into quick-dev implementation flow.

**Out of Scope:**
- Unrelated feature work outside Epic A blocker exit criteria.
- Non-admin UX polish not required to satisfy blocker criteria.
- Architecture changes unrelated to status integrity, entitlement enforcement, admin flows, scoped identity, and operability gates.

## Context for Development

### Codebase Patterns

- Monorepo split is stable (`src/` backend, `frontend/` Vue app), with strict TypeScript in both apps and 2-space formatting conventions.
- Policy enforcement flows through `scripts/enforce-git-policy.sh`, which already invokes lane resolution, status-sync, and operability guards as blocking checks.
- Status mismatch detection already exists in `scripts/enforce-story-status-sync.sh`; missing piece is an atomic transition path that updates story markdown + sprint-status together.
- Tenant module entitlements persist in `platform.tenant_module_entitlements` and are writable via platform admin APIs.
- ConnectShyft runtime gating currently resolves from environment/test override flags in `src/src/modules/connectshyft/featureFlags.ts`, not tenant entitlement authority.
- Admin backend/frontend assignment flows are UUID-first (`userId`, `tenantId`, `orgUnitId`) and need a human lookup/inline-create path.
- Identity model currently exposes `email` as the canonical unique user identifier (no dedicated `username` column), matching the username=email assumption.
- Frontend admin routing uses role/capability checks via access store, but module-level nav/route visibility is not yet entitlement-backed.
- Existing platform contracts use envelope refusals (`ok=false`) for business denials and mixed 4xx for security/client errors; blocker behavior must standardize these boundaries.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/implementation-artifacts/blocker-remediation-plan-2026-02-23.md` | Canonical approved remediation plan and workstream breakdown |
| `_bmad-output/project-context.md` | Project-level technical and policy constraints required during implementation |
| `scripts/enforce-git-policy.sh` | Main blocking policy gate orchestration in local/CI |
| `scripts/enforce-story-status-sync.sh` | Existing story vs sprint-status synchronization guard |
| `scripts/project-lane-context.js` | Lane resolution and sprint-status targeting logic |
| `scripts/enforce-operability-closeout-guard.sh` | Current operability/usability closeout guard |
| `.github/workflows/test.yml` | Canonical CI graph (policy -> lint -> test shards -> burn-in -> quality gates -> report) |
| `src/src/routes/api/v1/platform-admin.ts` | Admin endpoints to extend for lookup, creation, delegation, and scope enforcement |
| `src/src/services/PlatformAdminService.ts` | Core admin mutation/capability logic, entitlement writes, and tenancy scope controls |
| `src/src/modules/connectshyft/featureFlags.ts` | Current env-flag-based ConnectShyft capability evaluation to refactor behind entitlement authority |
| `src/src/routes/api/v1/connectshyft.ts` | ConnectShyft route-level capability gating and refusal behavior |
| `src/src/migrations/001_initial_schema.ts` | User identity baseline (`email` unique, no separate `username` column) |
| `src/src/migrations/20260218180000_create_platform_tenant_hierarchy.ts` | Tenant/orgUnit hierarchy schema baseline (parent pointer model) |
| `frontend/src/views/Admin/SystemAdminView.vue` | Current UUID-first system admin provisioning flow |
| `frontend/src/views/Admin/TenantAdminView.vue` | Current UUID-first tenant admin delegation flow |
| `frontend/src/services/platformAdmin.ts` | Frontend admin API client contracts |
| `frontend/src/stores/access.ts` | Frontend capability-derived admin access state and refresh contract |
| `frontend/src/router/index.ts` | Route guard layer for auth/admin access integration |
| `frontend/src/components/layout/AppHeader.vue` | Desktop navigation visibility control points |
| `frontend/src/components/layout/AppMobileNav.vue` | Mobile navigation visibility control points |
| `src/src/migrations/20260220110000_add_tenant_module_entitlements.ts` | Existing entitlement schema baseline |
| `tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts` | API contract baseline for entitlement and admin controls |
| `tests/e2e/platform/1-2-tenant-and-module-entitlement-administration.spec.ts` | E2E baseline for system/tenant admin workflows |
| `tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.api.spec.ts` | API baseline for ConnectShyft availability/refusal behavior |
| `tests/e2e/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.spec.ts` | E2E baseline for ConnectShyft UI guardrails |

### Technical Decisions

- Execute all six workstreams end-to-end in this effort (no partial-scope delivery).
- Introduce an atomic status transition command that is the required path for closeout-state changes and keeps story markdown + sprint-status synchronized.
- Atomic transition concurrency contract is explicit: acquire an exclusive transition lock, re-read under lock, apply both writes as one unit, and on lock timeout/conflict return a deterministic non-zero error without partial writes.
- Treat tenant entitlements as runtime authority for module availability; environment flags remain kill-switch/test controls only.
- Entitlement semantics for governed modules (`connectshyft`, `moneyshyft`) are explicit-default-deny: missing entitlement row is treated as disabled unless allowlisted migration backfill has created an enabled row.
- Add migration backfill for existing tenant/module combinations that must remain enabled to avoid accidental lockout during the default-deny rollout.
- Entitlement rollout is two-phase and ordered: deploy additive migration + governed-module backfill first, verify coverage, then enable runtime default-deny reads in routes/services.
- Keep ConnectShyft/MoneyShyft gating behavior consistent with platform refusal-envelope contracts where module access is denied.
- MoneyShyft governed backend surface is explicit: `/api/v1/accounts`, `/api/v1/transactions` (including split endpoints mounted under the same prefix), `/api/v1/categories`, `/api/v1/goals`, `/api/v1/budgets`, `/api/v1/income`, `/api/v1/debts`, `/api/v1/assignments`, `/api/v1/households`, `/api/v1/recurring-transactions`, `/api/v1/extra-money`, `/api/v1/settings`, `/api/v1/scenarios`, `/api/v1/tags`.
- MoneyShyft entitlement gating exclusions are explicit: `/api/v1/auth`, `/api/v1/platform/*`, `/api/v1/platform/admin/*`, and `/api/v1/connectshyft/*`.
- MoneyShyft governed frontend surface is explicit: `/`, `/accounts`, `/transactions`, `/recurring-transactions`, `/budget`, `/goals`, `/debts`, `/extra-money`, `/settings`, `/scenarios`.
- ConnectShyft governed frontend surface is explicit: `/app/connectshyft/inbox`, `/app/connectshyft/settings/availability`, `/app/connectshyft/settings/numbers`, `/app/connectshyft/settings/escalation`.
- Denial precedence is deterministic to prevent leakage: evaluate and return security refusals first (auth/session and tenant/orgUnit scope), then client validation refusals, then business entitlement/capability refusals.
- Tenant-create contract is backward compatible: `tenancyModel` and `moduleGrants` are optional for legacy callers; when omitted, defaults are applied server-side (`tenancyModel='single-tenant'`, baseline `moduleGrants` with `moneyshyft=true` and `connectshyft=false`).
- Keep `featureFlags.ts` focused on sync env/test-override evaluation; perform tenant-entitlement resolution in async service/route layers and merge into final capability decision there.
- Implement inline admin creation with a single canonical identity field (`email`, also serving as username) and immediate role assignment path.
- Implement strict scoped lookup visibility so admins cannot discover out-of-scope users.
- Scoped lookup contract includes anti-enumeration controls: minimum query length `3`, default page size `20`, maximum page size `25`, deterministic ordering by `lower(email)` ASC then `user.id` ASC, and audit/outbox emission for search + assignment mutations.
- Implement deep subtenant hierarchy support now, with server-side tenant-bound ancestry validation and cycle prevention guarantees.
- Hierarchy cycle prevention for create/re-parent uses recursive ancestry validation inside the write transaction with row locking on affected orgUnit records to prevent concurrent race bypass.
- Keep migrations additive only (new migration for lookup/indexing/hierarchy constraints) without rewriting prior migration history.
- Preserve thin-route/service-heavy backend architecture and existing `/api/v1` envelope response contract while extending behavior.
- Enforce mandatory real-user operability evidence as a release-blocking guard for critical capability and access-control done-state stories.

### Denial Response Contract Matrix

| Scenario | refusalType | HTTP | Notes |
| -------- | ----------- | ---- | ----- |
| Module entitlement missing/disabled for governed module route | business | 200 | `ok=false`, deterministic module-disabled code, no tenant-scope leakage |
| Capability-level module restriction after module access is granted | business | 200 | `ok=false`, capability-specific code |
| Cross-tenant or out-of-scope access attempt | security | 403 | No existence leakage in message payload |
| Missing auth/session context | security | 401/403 | Follow current auth contract for route family |
| Invalid input/payload contract | client | 400 | Validation errors only, no internal details |

Refusal evaluation order (mandatory): `security` -> `client` -> `business`.
If multiple failure conditions apply, return the highest-precedence refusal only.

### Execution Slices and Rollback Checkpoints

1. Slice A (policy/status integrity): Tasks 1-5
   - Checkpoint: `npm run policy:check` fails on manual mismatch and passes on command-driven transition.
2. Slice B (entitlement authority backend): Tasks 6-9
   - Checkpoint: API contract tests prove governed-module default-deny + allowlisted backfill behavior.
3. Slice C (admin foundations + hierarchy safety): Tasks 10-13
   - Checkpoint: service/route tests pass for scoped lookup, inline create, and cycle prevention.
4. Slice D (frontend entitlement and admin UX): Tasks 14-22
   - Checkpoint: E2E journeys pass for inline admin flows and hidden/redirected denied modules.
5. Slice E (operability and CI hard gates): Tasks 23-29
   - Checkpoint: policy + operability guard failures keep workflow non-green while report still publishes failure summary.

## Implementation Plan

### Tasks

- [x] Task 1: Add an atomic status transition command for story + sprint-status synchronization
  - File: `scripts/story-status-transition.sh` (new)
  - Action: Implement a single command that takes `--story-key`/`--story-file`, target status, and lane context; updates story `Status:` and the correct lane sprint-status entry together.
  - Notes: Reuse `scripts/project-lane-context.js` to resolve the lane sprint-status file, validate allowed transitions, acquire an exclusive transition lock, and fail with deterministic conflict/lock-timeout errors if concurrent updates occur; no partial writes are allowed.

- [x] Task 2: Wire status transition automation into repository commands and policy documentation
  - File: `package.json`
  - Action: Add script aliases for status transition automation (for example `story:status:set`) and sync verification.
  - Notes: Keep command names short and unambiguous for SM/PM closeout usage.

- [x] Task 3: Enforce automation-backed status integrity in policy gates
  - File: `scripts/enforce-story-status-sync.sh`
  - Action: Extend checks to verify lane-correct sprint-status file targeting and explicit transition validity for closeout states.
  - Notes: Continue hard-failing on any mismatch; include clear failure messages with exact story key and file path.

- [x] Task 4: Prevent mismatch bypass in local and CI enforcement paths
  - File: `scripts/enforce-git-policy.sh`
  - Action: Ensure status-sync guard always runs as blocking in both local and CI contexts for story branches and closeout transitions.
  - Notes: Preserve existing lane resolution behavior and avoid regressions to existing policy jobs.

- [x] Task 5: Update workflow guardrails so status mismatch cannot pass closeout
  - File: `docs/policies/git_policy.md`
  - Action: Document required status-transition command usage and explicit closeout rule that manual mismatch edits are invalid.
  - Notes: Keep wording consistent with existing mandatory guardrail sections.

- [x] Task 6: Introduce canonical module entitlement authority for runtime gating
  - File: `src/src/services/PlatformAdminService.ts`
  - Action: Add reusable entitlement read helpers for `connectshyft` and `moneyshyft` and expose tenant-scoped entitlement evaluation for routes/services with explicit default-deny behavior for missing rows.
  - Notes: System admin remains global override; tenant-scoped actors cannot bypass disabled module state; helper returns deterministic denial reason for missing vs disabled entitlement rows.

- [x] Task 7: Replace ConnectShyft env-only runtime availability with entitlement-backed evaluation
  - File: `src/src/modules/connectshyft/featureFlags.ts`
  - Action: Keep env/test-override parsing in this module, but refactor capability evaluation interfaces so async tenant-entitlement inputs can be merged by route/service callers before final deny/allow decision.
  - Notes: Do not introduce direct DB calls into this file; preserve refusal envelope codes currently relied on by API/E2E tests; this module remains pure/synchronous and is not responsible for entitlement fetch/precedence decisions.

- [x] Task 8: Enforce entitlement-backed ConnectShyft access and refusal behavior at route layer
  - File: `src/src/routes/api/v1/connectshyft.ts`
  - Action: Require entitlement-aware capability checks for module endpoints and standardize denied responses as business refusals (`ok=false`, HTTP 200) where contract requires.
  - Notes: Keep tenant/orgUnit scope checks intact and non-leaky; apply the denial response contract matrix to separate business refusals from security/client errors.

- [x] Task 9: Enforce MoneyShyft module invisibility/inaccessibility when not entitled
  - File: `src/src/api/registerRoutes.ts`
  - Action: Introduce module guard middleware for the explicit MoneyShyft route groups (`/api/v1/accounts`, `/api/v1/transactions`, `/api/v1/categories`, `/api/v1/goals`, `/api/v1/budgets`, `/api/v1/income`, `/api/v1/debts`, `/api/v1/assignments`, `/api/v1/households`, `/api/v1/recurring-transactions`, `/api/v1/extra-money`, `/api/v1/settings`, `/api/v1/scenarios`, `/api/v1/tags`) and block non-entitled tenant access.
  - Notes: Missing entitlement row is treated as disabled for governed modules; use envelope refusal pattern for business denials; do not apply this guard to `/api/v1/auth`, `/api/v1/platform/*`, `/api/v1/platform/admin/*`, or `/api/v1/connectshyft/*`.

- [ ] Task 10: Extend admin API for human-friendly identity lookup and inline user creation
  - File: `src/src/routes/api/v1/platform-admin.ts`
  - Action: Add endpoints for scoped user lookup (`email/name`) and inline admin creation during tenant/orgUnit/subtenant assignment flows, and extend tenant creation input contract to include `tenancyModel` + initial `moduleGrants`.
  - Notes: `username` is represented by canonical `email`; no separate username field is introduced; enforce `q.length >= 3`, default `pageSize=20`, max `pageSize=25`, and deterministic ordering by `lower(email)` then `user.id` in request validation/contract; keep tenant-create backward compatible by defaulting omitted `tenancyModel`/`moduleGrants` server-side to the baseline contract.

- [ ] Task 11: Implement scoped identity search + inline assignment logic in service layer
  - File: `src/src/services/PlatformAdminService.ts`
  - Action: Add tenant/orgUnit-scoped search queries, inline user creation transaction paths, assignment helpers for tenant/orgUnit admin roles, and transactional persistence for tenant `tenancyModel` plus initial module entitlements.
  - Notes: Enforce strict scope visibility (no cross-tenant leakage), anti-enumeration controls (`q.length >= 3`, default `pageSize=20`, max `pageSize=25`, deterministic order by `lower(email)` then `user.id`), and emit platform event/outbox records for both search audit and mutation flows; when tenant-create payload omits `tenancyModel`/`moduleGrants`, apply defaults transactionally (`single-tenant`, `moneyshyft=true`, `connectshyft=false`).

- [ ] Task 12: Add deep hierarchy safeguards for orgUnit/subtenant delegation
  - File: `src/src/migrations/20260223110000_platform_admin_identity_scope_and_hierarchy_guards.ts`
  - Action: Add schema/index support for scoped lookup performance, add tenant tenancy-model persistence support, add entitlement backfill for governed modules, and add hierarchy guard helpers required for ancestry/cycle protection.
  - Notes: Keep migration additive only; do not rewrite prior migrations; include deterministic cycle detection support for re-parent operations under concurrent writes and expose deterministic conflict semantics for competing re-parent updates; this migration/backfill must ship before enabling default-deny entitlement reads.

- [ ] Task 13: Expand RBAC semantics for delegated module assignment boundaries
  - File: `src/src/platform/rbac/capabilities.ts`
  - Action: Add/refine capabilities for tenant-admin module assignment constrained to system-admin-granted module set.
  - Notes: Preserve existing role names and capability naming conventions.

- [ ] Task 14: Redesign system admin UI for guided tenant bootstrap with inline admin creation
  - File: `frontend/src/views/Admin/SystemAdminView.vue`
  - Action: Replace UUID-only initial admin input with identity lookup + inline create controls and add allowed tenancy model option controls.
  - Notes: Keep success/error messaging explicit and test-friendly via stable `data-testid` attributes.

- [ ] Task 15: Redesign tenant admin UI for scoped delegation and inline scoped admin creation
  - File: `frontend/src/views/Admin/TenantAdminView.vue`
  - Action: Add orgUnit/subtenant creation workflows with parent selection, inline admin assignment, and module assignment constraints derived from granted set.
  - Notes: Prevent selection of modules outside grant boundary in both UI controls and submitted payload.

- [ ] Task 16: Extend frontend admin service contracts for lookup and inline creation flows
  - File: `frontend/src/services/platformAdmin.ts`
  - Action: Add typed API clients for scoped user search, inline admin creation payloads, hierarchy creation, and bounded module assignment.
  - Notes: Keep envelope unwrapping behavior consistent with existing service utilities.

- [ ] Task 17: Gate frontend navigation and routes by module entitlements
  - File: `frontend/src/stores/access.ts`
  - Action: Include module entitlement state in access store refresh output and expose computed guards used by router and nav components.
  - Notes: Maintain existing admin capability computations.

- [ ] Task 18: Enforce entitlement-aware route accessibility for ConnectShyft and MoneyShyft
  - File: `frontend/src/router/index.ts`
  - Action: Add route meta and beforeEach checks that redirect non-entitled users away from all governed ConnectShyft routes (`/app/connectshyft/inbox`, `/app/connectshyft/settings/availability`, `/app/connectshyft/settings/numbers`, `/app/connectshyft/settings/escalation`) and all governed MoneyShyft routes (`/`, `/accounts`, `/transactions`, `/recurring-transactions`, `/budget`, `/goals`, `/debts`, `/extra-money`, `/settings`, `/scenarios`).
  - Notes: Ensure redirect targets are deterministic and avoid redirect loops; direct URL access to any governed ConnectShyft route must be blocked when entitlement is missing.

- [ ] Task 19: Hide module navigation entries when entitlement is missing
  - File: `frontend/src/components/layout/AppHeader.vue`
  - Action: Update desktop nav item composition to exclude ConnectShyft/MoneyShyft links when module entitlement is disabled.
  - Notes: Keep admin nav logic intact.

- [ ] Task 20: Mirror module visibility gating in mobile navigation
  - File: `frontend/src/components/layout/AppMobileNav.vue`
  - Action: Apply same entitlement-based nav filtering behavior used in desktop header.
  - Notes: Keep route parity between desktop and mobile navigation menus.

- [ ] Task 21: Align ConnectShyft views with entitlement-driven availability semantics
  - File: `frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - Action: Render inaccessible state using module-entitlement refusal data and hide operational controls when module/capability is denied.
  - Notes: Preserve current refusal messaging model and test IDs where possible.

- [ ] Task 22: Align availability page with entitlement authority and refusal contracts
  - File: `frontend/src/views/ConnectShyft/ConnectShyftAvailabilityView.vue`
  - Action: Source displayed capability state from entitlement-backed availability response and remove env-only assumptions from UI state interpretation.
  - Notes: Keep compatibility with existing test override behavior in local/test contexts.

- [x] Task 23: Strengthen operability/usability release gate enforcement
  - File: `scripts/enforce-operability-closeout-guard.sh`
  - Action: Tighten done-state checks so any story marked `Critical Capability: yes` and/or access-control requires concrete real-user walkthrough evidence and pass result before closeout.
  - Notes: Ensure failure messages identify missing fields, classification mismatches, and affected story files.

- [x] Task 24: Validate policy and workflow guard behavior with existing gate harness coverage
  - File: `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts`
  - Action: Add scenarios for automation-backed status transitions and operability gate hard-fail behavior.
  - Notes: Include both positive and negative closeout cases, plus concurrent status-transition attempts where exactly one transition succeeds and the other fails with deterministic conflict/lock-timeout semantics.

- [ ] Task 25: Add backend test coverage for scoped lookup, inline creation, and delegation limits
  - File: `src/src/services/__tests__/PlatformAdminService.test.ts`
  - File: `src/src/modules/connectshyft/__tests__/featureFlags.test.ts`
  - Action: Add unit/service tests for scoped user search visibility, inline user creation, hierarchy guardrails, bounded module assignment, and concurrent re-parent contention scenarios; keep `featureFlags.test.ts` focused on env/test-override parsing and capability evaluation from provided flags only.
  - Notes: Cover cross-tenant leakage denial and cycle-prevention errors, including concurrent re-parent races with deterministic conflict/cycle outcomes; cover entitlement-precedence behavior in service/route tests (not in `featureFlags.test.ts`).

- [ ] Task 26: Add route-layer API coverage for entitlement + admin flow overhauls
  - File: `src/src/routes/api/v1/__tests__/platform-admin.test.ts`
  - Action: Add controller tests for new lookup/creation endpoints and refusal behaviors under scope/entitlement violations.
  - Notes: Validate envelope codes and HTTP status expectations.

- [ ] Task 27: Expand Playwright API contracts for blocker criteria closure
  - File: `tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts`
  - Action: Extend API contract tests to cover inline admin creation, scoped lookup, delegation constraints, and ConnectShyft/MoneyShyft entitlement enforcement.
  - Notes: Include explicit denied-module and out-of-scope identity scenarios; for MoneyShyft, add denied-entitlement assertions for governed API prefixes (`/api/v1/accounts`, `/api/v1/transactions`, `/api/v1/categories`, `/api/v1/goals`, `/api/v1/budgets`, `/api/v1/income`, `/api/v1/debts`, `/api/v1/assignments`, `/api/v1/households`, `/api/v1/recurring-transactions`, `/api/v1/extra-money`, `/api/v1/settings`, `/api/v1/scenarios`, `/api/v1/tags`) and include a control assertion proving excluded routes (`/api/v1/auth`, `/api/v1/platform/*`) are unaffected by the MoneyShyft entitlement gate.

- [ ] Task 28: Expand E2E operator journeys for usability gate criteria
  - File: `tests/e2e/platform/1-2-admin-provisioning-rbac-ui.spec.ts`
  - File: `tests/e2e/platform/1-2-tenant-and-module-entitlement-administration.spec.ts`
  - Action: Add real-flow UI scenarios for system admin bootstrap and tenant admin delegation with non-UUID identity assignment.
  - Notes: Include negative UX validations for out-of-scope lookup and disallowed module assignment options; for MoneyShyft, assert nav invisibility plus direct-URL denial/redirect for governed routes (`/`, `/accounts`, `/transactions`, `/recurring-transactions`, `/budget`, `/goals`, `/debts`, `/extra-money`, `/settings`, `/scenarios`).

- [ ] Task 29: Update CI gating to ensure operability evidence is release-blocking
  - File: `.github/workflows/test.yml`
  - Action: Confirm/adjust job dependencies so policy and operability guard failures block release-readiness jobs; reporting remains `always()` but must surface failed upstream status.
  - Notes: Preserve existing policy-first ordering and shard/burn-in/quality gates structure.

### Acceptance Criteria

- [ ] AC 1: Given a story branch in any configured lane, when an operator changes story status using the status-transition command, then the story `Status:` field and lane sprint-status entry update atomically and remain synchronized; under concurrent transition attempts, exactly one update succeeds and losing attempts fail with deterministic conflict/lock-timeout errors without partial writes.
- [ ] AC 2: Given a story/sprint-status mismatch, when `npm run policy:check` runs locally or in CI, then the run hard-fails with a mismatch error and blocks downstream gates.
- [ ] AC 3: Given a tenant with missing or disabled `connectshyft` entitlement, when the user attempts ConnectShyft API access, then the response is an envelope refusal (`ok=false`) with contract-aligned denial semantics.
- [ ] AC 4: Given a tenant without `connectshyft` entitlement, when the user loads the application or directly enters any governed ConnectShyft route (`/app/connectshyft/inbox`, `/app/connectshyft/settings/availability`, `/app/connectshyft/settings/numbers`, `/app/connectshyft/settings/escalation`), then ConnectShyft navigation and entry routes are hidden or redirected and operational controls are inaccessible.
- [ ] AC 5: Given a tenant with missing or disabled `moneyshyft` entitlement, when the user attempts any governed MoneyShyft API prefix (`/api/v1/accounts`, `/api/v1/transactions`, `/api/v1/categories`, `/api/v1/goals`, `/api/v1/budgets`, `/api/v1/income`, `/api/v1/debts`, `/api/v1/assignments`, `/api/v1/households`, `/api/v1/recurring-transactions`, `/api/v1/extra-money`, `/api/v1/settings`, `/api/v1/scenarios`, `/api/v1/tags`) or governed UI route (`/`, `/accounts`, `/transactions`, `/recurring-transactions`, `/budget`, `/goals`, `/debts`, `/extra-money`, `/settings`, `/scenarios`), then the module is invisible in navigation and inaccessible via direct URL/API access.
- [ ] AC 6: Given a system admin creating a tenant, when tenancy model options and module grants are selected, then the tenant is created with only the selected options and tenancy model + entitlements are persisted transactionally; when `tenancyModel`/`moduleGrants` are omitted by a legacy caller, defaults are applied (`tenancyModel='single-tenant'`, `moneyshyft=true`, `connectshyft=false`) and persisted in the same transaction.
- [ ] AC 7: Given a system admin provisioning a new tenant, when an initial tenant admin does not already exist, then the admin can be created inline (email as canonical username) and assigned in the same flow.
- [ ] AC 8: Given a tenant admin within scope, when creating orgUnit/subtenant hierarchy nodes (including concurrent re-parent attempts), then creation/update succeeds only within tenant scope and rejects invalid parent/cycle conditions deterministically.
- [ ] AC 9: Given a tenant admin managing delegated access, when assigning modules, then assignable modules are restricted to the subset granted by system admin and out-of-bound assignments are refused.
- [ ] AC 10: Given an admin performing user assignment, when searching by email or name, then only in-scope users are returned, out-of-scope identities are never disclosed, and anti-enumeration controls are enforced (`q.length >= 3`, default `pageSize=20`, max `pageSize=25`, deterministic ordering by `lower(email)` then `user.id`).
- [ ] AC 11: Given an admin cannot find a required assignee, when inline user creation is used, then the new user can be created and assigned without requiring UUID entry.
- [ ] AC 12: Given ConnectShyft/MoneyShyft entitlement denial, when denied paths are exercised, then UI/API behavior is consistent with refusal contracts and does not leak sensitive tenant scope details.
- [ ] AC 13: Given a story marked `Critical Capability: yes` and/or access-control, when status is moved to `done`, then missing real-user walkthrough evidence or failed walkthrough results block closeout.
- [ ] AC 14: Given the blocker remediation branch, when API/E2E suites for admin and entitlement flows run, then new/updated tests pass and cover happy-path plus denial edge cases, including explicit MoneyShyft governed API-prefix denial coverage and governed UI-route/nav denial coverage.
- [ ] AC 15: Given CI execution on PR/push, when policy, lint, test shards, burn-in, and quality gates run, then policy/operability failures prevent release-readiness from passing and are surfaced in the report job summary.
- [ ] AC 16: Given existing tenants prior to entitlement-authority rollout, when default-deny module gating is enabled, then no previously-enabled governed module loses access due to missing entitlement rows because backfill was applied and verified first.
- [ ] AC 17: Given a request that simultaneously violates scope/security and module entitlement/capability conditions, when denial is evaluated, then the response always uses the precedence contract (`security` before `client` before `business`) and does not leak tenant/orgUnit existence.
- [ ] AC 18: Given scoped lookup and assignment/inline-create admin operations, when requests are processed, then platform events and outbox rows are emitted for both search audit and mutation flows with tenant/entity/actor linkage and redacted payload fields.

## Additional Context

### Dependencies

- Existing lane-resolution and policy enforcement toolchain:
  - `scripts/project-lane-context.js`
  - `scripts/enforce-git-policy.sh`
  - `scripts/enforce-story-status-sync.sh`
  - `scripts/enforce-operability-closeout-guard.sh`
- Existing platform tenancy and RBAC foundations:
  - `src/src/platform/tenancy/*`
  - `src/src/platform/rbac/capabilities.ts`
  - `src/src/platform/envelopes/response.ts`
- Existing entitlement persistence and admin API baselines:
  - `src/src/migrations/20260220110000_add_tenant_module_entitlements.ts`
  - `src/src/routes/api/v1/platform-admin.ts`
  - `src/src/services/PlatformAdminService.ts`
- Existing frontend access and admin foundations:
  - `frontend/src/stores/access.ts`
  - `frontend/src/router/index.ts`
  - `frontend/src/views/Admin/SystemAdminView.vue`
  - `frontend/src/views/Admin/TenantAdminView.vue`
- Existing regression frameworks and CI harness:
  - Jest service/route tests under `src/src/**/__tests__`
  - Playwright API/E2E tests under `tests/api/platform` and `tests/e2e/platform`
  - CI orchestration in `.github/workflows/test.yml`

### Testing Strategy

- Unit and service tests:
  - Extend `src/src/services/__tests__/PlatformAdminService.test.ts` for scoped lookup visibility, inline creation, hierarchy cycle checks, and delegated module assignment boundaries.
  - Add concurrent hierarchy re-parent contention tests that assert deterministic cycle/conflict outcomes and no tenant-scope escape under race conditions.
  - Add assertions that scoped lookup and assignment/inline-create operations emit platform event + outbox records with expected event names, tenant/entity linkage, and redacted payload fields.
  - Extend `src/src/modules/connectshyft/__tests__/featureFlags.test.ts` for env/test-override parsing and capability evaluation from provided flags only (no entitlement-fetch precedence assertions in this unit suite).
- Route/controller tests:
  - Extend `src/src/routes/api/v1/__tests__/platform-admin.test.ts` for new lookup/inline creation endpoints and denial contracts.
  - Include contract assertions that successful scoped lookup and assignment/inline-create requests trigger audit/event emission paths (or their observable envelopes) without leaking sensitive fields.
  - Add entitlement-authority precedence assertions in route/controller and service-level suites (`src/src/routes/api/v1/__tests__/platform-admin.test.ts`, `tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts`) to verify async entitlement decisions override env-only defaults where required by contract.
- Policy/script validation:
  - Expand `tests/api/platform/1-5-policy-gate-and-branch-workflow-guard-enforcement.api.spec.ts` for status transition automation and operability closeout hard-fail paths.
  - Add concurrent status-transition contention coverage that asserts deterministic conflict/lock-timeout behavior and unchanged synchronization guarantees.
- Playwright API contracts:
  - Expand `tests/api/platform/1-2-tenant-and-module-entitlement-administration.api.spec.ts` and related platform specs for entitlement-backed module gating, scoped lookup, and inline admin provisioning flows.
  - Include explicit MoneyShyft governed API-prefix denial coverage plus excluded-route control coverage (`/api/v1/auth`, `/api/v1/platform/*` remain unaffected by MoneyShyft entitlement gating).
  - Include scoped-lookup anti-enumeration boundary coverage (`q.length` below minimum rejected, `pageSize` cap enforced) and deterministic ordering assertions (`lower(email)` then `user.id`).
  - Include tenant-create backward-compatibility coverage proving omitted `tenancyModel`/`moduleGrants` receive server defaults (`single-tenant`, `moneyshyft=true`, `connectshyft=false`) with transactional persistence.
- Playwright E2E operator journeys:
  - Expand `tests/e2e/platform/1-2-admin-provisioning-rbac-ui.spec.ts` and `tests/e2e/platform/1-2-tenant-and-module-entitlement-administration.spec.ts` for system-admin and tenant-admin flow overhauls.
  - Add negative cases for out-of-scope user visibility and disallowed module assignment.
  - Add explicit MoneyShyft nav invisibility and direct-URL denial/redirect coverage for governed UI routes.
- Manual validation (release-gate evidence):
  - Execute real-user walkthrough scripts for system-admin bootstrap and tenant-admin delegation flows.
  - Capture evidence and pass/fail result in story guardrail fields required by operability closeout policy.
- CI validation:
  - Run `npm run policy:check`, lint/test shards, burn-in, and quality gates; confirm policy/operability failures block release-readiness and are surfaced in report output.

### Notes

- Highest-risk implementation areas:
  - Balancing entitlement authority with existing test override pathways without destabilizing current ConnectShyft tests.
  - Introducing hierarchy cycle prevention while preserving existing orgUnit records and update behaviors.
  - Avoiding accidental information leakage in scoped user lookup responses.
- Backward-compatibility constraints:
  - Preserve existing envelope refusal contracts and role/capability naming.
  - Keep migration strategy additive; no rewrites of historic migrations.
  - Maintain current CI job ordering and policy-first blocking semantics.
- Explicit non-goals for this remediation:
  - No broad UI redesign outside admin/operator flows required for blocker closure.
  - No unrelated module architecture refactors beyond entitlement gating and scoped admin requirements.
- This spec is intentionally implementation-ready for immediate handoff to quick-dev after Step 4 approval.

## Review Notes

- Adversarial review completed on 2026-02-23.
- Findings: 12 total, 12 addressed, 0 skipped.
- Resolution approach: walk-through (`fix now` applied for each finding).
- This review note set supersedes earlier counts/wording from prior passes.
