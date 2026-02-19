# Story 0.2: Tenancy Context Resolution and Repository Enforcement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want tenant + orgUnit context resolution and mandatory scoped data access primitives,
so that Phase-0 kernel contracts enforce deterministic tenancy boundaries for protected platform endpoints.

## Acceptance Criteria

1. protected platform request context includes `{tenantId, orgUnitId|null, scopeMode}` from canonical auth/session claims
2. kernel repository scope helpers enforce required filters by scope mode (`tenant_id`, plus `org_unit_id` when orgUnit-scoped) for kernel contract paths using those helpers
3. orgUnit-scoped kernel contract reads/writes validate orgUnit membership unless caller has tenant-privileged scope
4. deterministic negative tests fail for cross-tenant access, cross-orgUnit access, and orgUnit spoofing on kernel contract endpoints

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Resolve canonical protected request context from authenticated session claims (ignore caller-supplied tenant/orgUnit headers for protected scope resolution)
  - [x] Add automated coverage for AC 1
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Enforce scope-aware kernel helper behavior for tenant-scoped and orgUnit-scoped query patterns
  - [x] Replace static contract diagnostics rows with helper-driven query probe evidence
  - [x] Add automated coverage for AC 2
- [x] Implement acceptance criterion 3 (AC: 3)
  - [x] Validate orgUnit membership via `tenant_memberships` + `org_unit_memberships` with tenant-privileged bypass through capability checks
  - [x] Add deterministic guardrail on legacy account routes so orgUnit-scoped sessions are rejected until module adoption stories apply orgUnit-safe repositories
  - [x] Add automated coverage for AC 3 guardrail behavior
- [x] Implement acceptance criterion 4 (AC: 4)
  - [x] Keep deterministic negative tests for cross-tenant, cross-orgUnit, and spoofed-orgUnit attempts on kernel contract endpoints
  - [x] Add automated coverage for AC 4

## Dev Notes

- Phase-0 scope is platform kernel only. Story 0.2 establishes kernel primitives and validates them via platform contract endpoints.
- Module-level orgUnit repository adoption (e.g. AccountService/CategoryService full orgUnit filtering) is deferred to module migration stories.
- Preserve monolith kernel constraints: tenancy, first-party auth, CSRF, refusal envelope, event/outbox, and timezone guarantees.
- Keep changes incremental and isolated for small PR sequencing in Epic 0.

### Project Structure Notes

- Platform kernel code paths should live under `src/platform`, shared API routing in `src/api`, and module code under `src/modules`.
- Maintain alias usage and shared entrypoint registration patterns from architecture and roadmap constraints.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-18.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/sprint-change-escalation-notice-2026-02-18.md
- /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
- /Users/jeremiahotis/moneyshyft/ROADMAP.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- --runInBand src/routes/api/v1/__tests__/accounts.scope.test.ts src/services/__tests__/AccountService.tenancy.test.ts src/platform/tenancy` (in `/Users/jeremiahotis/moneyshyft/src`)
- `npm test -- --runInBand src/__tests__/apiEnvelopeContract.test.ts src/__tests__/centralizedTimeServiceContract.test.ts` (in `/Users/jeremiahotis/moneyshyft/src`)
- `npm test -- --runInBand src/routes/api/v1/__tests__/platform-contracts.tenancy.test.ts src/routes/api/v1/__tests__/accounts.scope.test.ts src/services/__tests__/AccountService.tenancy.test.ts src/platform/tenancy src/__tests__/apiEnvelopeContract.test.ts` (in `/Users/jeremiahotis/moneyshyft/src`)
- `npm run build` (in `/Users/jeremiahotis/moneyshyft/src`)
- `npm run migrate:latest` (in `/Users/jeremiahotis/moneyshyft/src`) - required locally so `platform.*` tenancy tables exist for orgUnit membership diagnostics paths
- `npm run test:e2e -- --list tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts` (in `/Users/jeremiahotis/moneyshyft`)
- `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts` (in `/Users/jeremiahotis/moneyshyft`) - pass (7/7) with backend running at `API_URL=http://localhost:3001`
- `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts` (in `/Users/jeremiahotis/moneyshyft`) - currently requires local backend at `API_URL`

### Completion Notes List

- Hardened envelope context resolution to use canonical middleware tenant context and ignore mismatched caller `x-tenant-id` overrides.
- Replaced static repository-check response rows with helper-driven SQL probe output (`applyScopeMode` + `resolveScopeFilters`) against selected resource tables so contract responses prove scope filters are injected.
- Normalized account create-path writes to persist canonical `tenantId` (not raw `householdId`) for both `accounts` and opening-balance `transactions`.
- Added an explicit orgUnit-scope guardrail on account routes to block orgUnit-scoped access until module-level orgUnit repository adoption stories land.
- Added route tests proving account endpoints reject orgUnit-scoped sessions and allow tenant-scoped requests.
- Clarified story AC2/AC3 scope to kernel primitives and kernel contract endpoints only; module-wide adoption remains deferred by design.
- Restored public envelope contract behavior so contract probe endpoints can echo caller tenant headers while protected scopes still require canonical tenant match.
- Updated tenancy API contract assertions to validate helper-driven repository SQL probe evidence (instead of vacuous checks against empty rows).
- Added deterministic endpoint-level diagnostics tests that cover orgUnit tenant-membership refusal mapping and tenant-privileged bypass signaling.
- Updated synthetic orgUnit membership test identifiers to UUID values so database-level UUID constraints do not mask expected refusal semantics.

### File List

- `src/src/routes/api/v1/__tests__/platform-contracts.tenancy.test.ts`
- `src/src/routes/api/v1/platform-contracts.ts`
- `src/src/services/AccountService.ts`
- `src/src/routes/api/v1/accounts.ts`
- `src/src/routes/api/v1/__tests__/accounts.scope.test.ts`
- `src/src/__tests__/apiEnvelopeContract.test.ts`
- `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- `_bmad-output/implementation-artifacts/0-2-tenancy-context-resolution-and-repository-enforcement.md`

## Senior Developer Review (AI)

- 2026-02-18: Resolved `[P2] Envelope tenant context trusts caller-supplied header` by requiring canonical tenant match before envelope tenant override and by deriving envelope tenant from middleware context.
- 2026-02-18: Resolved `[P1] OrgUnit scope is not enforced in account repository access` with a fail-closed route guard that rejects orgUnit-scoped account requests until module-level orgUnit repository adoption stories apply full orgUnit filtering.
- 2026-02-18: Resolved `[P1] OrgUnit membership checks are limited to diagnostics contracts` for account endpoints by preventing orgUnit-scoped account access in Phase 0 rather than permitting unvalidated orgUnit execution paths.
- 2026-02-18: Resolved `[P2] Repository-check route does not verify real repository enforcement` by replacing synthetic rows with helper-driven SQL probe evidence over selected resource tables.
- 2026-02-18: Resolved `[P2] createAccount writes unnormalized tenant IDs` by persisting canonical `tenantId` in account and opening-balance transaction inserts.
- 2026-02-18: Resolved `[P1] Envelope tenant context change breaks existing API contract expectations` by allowing public envelope probes to echo caller `x-tenant-id` while keeping canonical-tenant enforcement for protected scopes.
- 2026-02-18: Resolved `[P2] AC2 coverage assertion is vacuous after repository probe change` by asserting repository SQL probe metadata + bindings instead of empty row predicates.
- 2026-02-18: Resolved `[P2] Missing endpoint-level tests for orgUnit membership and tenant-privileged bypass` by adding deterministic diagnostics endpoint tests for membership-required refusal and bypass signaling.

## Change Log

- 2026-02-18: Revised Story 0.2 AC scope to kernel primitives + platform contract endpoints only (Phase-0 boundary clarification).
- 2026-02-18: Fixed code-review findings by hardening envelope tenant context, replacing static repository-check evidence with helper-driven SQL probe output, normalizing account create tenant writes, and adding orgUnit-scope guardrails for account routes.
- 2026-02-18: Fixed follow-up review findings by restoring public envelope tenant echo compatibility, strengthening AC2 probe assertions, and adding diagnostics endpoint tests for orgUnit membership refusal + tenant-privileged bypass.
