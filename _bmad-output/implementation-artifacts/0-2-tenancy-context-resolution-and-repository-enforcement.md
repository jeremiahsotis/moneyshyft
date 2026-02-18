# Story 0.2: Tenancy Context Resolution and Repository Enforcement

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want tenant + orgUnit context resolution and mandatory scoped data access,
so that cross-tenant or cross-orgUnit reads/writes cannot occur by omission..

## Acceptance Criteria

1. request context includes `{tenantId, orgUnitId|null, scopeMode}` for protected data paths
2. required repository filters are applied by scope mode (`tenant_id`, plus `org_unit_id` when orgUnit-scoped)
3. orgUnit-scoped reads/writes validate orgUnit membership unless caller has tenant-privileged scope
4. deterministic negative tests fail for cross-tenant access, cross-orgUnit access, and orgUnit spoofing

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Resolve canonical request context `{tenantId, orgUnitId|null, scopeMode}` in platform middleware from authenticated session claims (never from caller-supplied tenant/orgUnit headers)
  - [x] Add automated coverage for AC 1
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Enforce scope-aware repository helpers for tenant-scoped and orgUnit-scoped query patterns
  - [x] Add automated coverage for AC 2
- [x] Implement acceptance criterion 3 (AC: 3)
  - [x] Validate orgUnit membership via `tenant_memberships` + `org_unit_memberships` with tenant-privileged bypass only through capability checks
  - [x] Add automated coverage for AC 3
- [x] Implement acceptance criterion 4 (AC: 4)
  - [x] Add deterministic negative tests for cross-tenant, cross-orgUnit, and spoofed-orgUnit context attempts
  - [x] Add automated coverage for AC 4

## Dev Notes

- Phase-0 scope only. Do not introduce Route/Operations/Resource/POS module behavior in this story.
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

- `npm test -- --runInBand` (in `/Users/jeremiahotis/moneyshyft/src`) - pass, 21 suites passed / 1 skipped; 88 tests passed / 2 skipped
- `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts` (in `/Users/jeremiahotis/moneyshyft`) - pass, 10/10 tests

### Completion Notes List

- Added `/Users/jeremiahotis/moneyshyft/src/src/platform/tenancy/tenantScope.ts` to require non-public tenant context and apply mandatory tenant filters to repository-style query builders.
- Enforced tenant scoping in `/Users/jeremiahotis/moneyshyft/src/src/services/AccountService.ts` across read/update/delete/recalculate query paths so tenant filtering cannot be omitted.
- Added deterministic negative coverage for cross-tenant account access and tenant-filter assertions in account/transaction query paths.
- Added dedicated tenant scope unit tests to verify missing/public tenant context is rejected and required tenant filters are always injected.
- Added tenant-scope error mapping in `/Users/jeremiahotis/moneyshyft/src/src/middleware/errorHandler.ts` so tenant context violations are returned as explicit `403` responses instead of generic `500`s.
- Added canonical tenant normalization/enforcement in `/Users/jeremiahotis/moneyshyft/src/src/middleware/auth.ts` and `/Users/jeremiahotis/moneyshyft/src/src/services/CategoryService.ts` to reject reserved/invalid tenant contexts and require validated tenant IDs in category operations.
- Expanded cross-tenant deterministic negative coverage to write paths (`updateAccount` and `deleteAccount`) in `/Users/jeremiahotis/moneyshyft/src/src/services/__tests__/AccountService.tenancy.test.ts`.
- Reworked `/Users/jeremiahotis/moneyshyft/src/src/platform/tenancy/requestContext.ts` to canonicalize context exclusively from authenticated session claims and ignore caller-supplied tenant/orgUnit headers.
- Extended `/Users/jeremiahotis/moneyshyft/src/src/platform/tenancy/tenantScope.ts` with `resolveScopeFilters` and `applyScopeMode` so repository enforcement deterministically injects `tenant_id` and `org_unit_id` by `scopeMode`.
- Added `/Users/jeremiahotis/moneyshyft/src/src/platform/tenancy/orgUnitAccess.ts` to validate orgUnit-scoped access through `tenant_memberships` + `org_unit_memberships`, with bypass allowed only through capability evaluation.
- Updated `/Users/jeremiahotis/moneyshyft/src/src/routes/api/v1/platform-contracts.ts` tenancy diagnostics/repository checks to enforce canonical protected context, reject tenant/orgUnit spoofing attempts, and surface deterministic refusal codes for cross-scope violations.
- Added coverage for canonical claim-based context, scope-mode filters, orgUnit membership rules, and deterministic cross-tenant/cross-orgUnit/spoof negatives in backend unit tests and Playwright API/E2E tenancy suites.

### File List

- src/src/platform/tenancy/tenantScope.ts
- src/src/platform/tenancy/__tests__/tenantScope.test.ts
- src/src/services/AccountService.ts
- src/src/services/__tests__/AccountService.tenancy.test.ts
- src/src/middleware/errorHandler.ts
- src/src/middleware/auth.ts
- src/src/services/CategoryService.ts
- src/src/platform/tenancy/requestContext.ts
- src/src/platform/tenancy/__tests__/requestContext.test.ts
- src/src/platform/tenancy/orgUnitAccess.ts
- src/src/platform/tenancy/__tests__/orgUnitAccess.test.ts
- src/src/routes/api/v1/platform-contracts.ts
- tests/support/factories/tenantRepositoryFactory.ts
- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts
- tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts

## Change Log

- 2026-02-17: Implemented tenant-scope enforcement helpers, applied mandatory tenant filters in AccountService, and added deterministic cross-tenant negative tests for Story 0.2.
- 2026-02-17: Addressed senior review findings by canonicalizing tenant IDs, mapping tenant-scope failures to `403`, enforcing tenant validation in CategoryService, and expanding cross-tenant negative write-path tests.
- 2026-02-18: Re-opened for approved course-correction scope (tenant + orgUnit context contract, membership validation, scope-mode enforcement, and spoofing negatives).
- 2026-02-18: Completed course-correction implementation by enforcing claim-derived request context, adding scope-mode repository filters, validating orgUnit membership with capability-based bypass, and adding deterministic cross-tenant/cross-orgUnit/spoofing tests (unit + Playwright).
