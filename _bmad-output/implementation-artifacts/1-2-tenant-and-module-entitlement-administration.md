# Story 1.2: Tenant and Module Entitlement Administration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tenant admin,
I want to manage module entitlements, orgUnits, and scoped role assignments,
so that only authorized users can access actions in the correct tenant/orgUnit scope.

## Acceptance Criteria

1. Given a tenant admin opens tenant settings, when they enable/disable a module, create/update orgUnits, or change user roles, then authorization behavior updates immediately for protected actions by scope layer.
2. Every entitlement/role/membership change is audit logged via platform events/outbox.
3. Only `SYSTEM_ADMIN` can assign initial `TENANT_ADMIN` for a tenant.

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Add tenant-admin APIs/services for module entitlement toggles.
  - [x] Add orgUnit create/update flows scoped to active tenant.
  - [x] Add scoped role assignment/revocation endpoints with immediate authorization effect.
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Emit event + outbox records atomically for entitlement/role/membership mutations.
  - [x] Include actor, tenant, scope, and reason metadata in audit payloads.
- [x] Implement acceptance criterion 3 (AC: 3)
  - [x] Enforce `SYSTEM_ADMIN`-only control for initial tenant-admin assignment path.
  - [x] Add refusal/error path tests for unauthorized initial tenant-admin assignment attempts.

## Dev Notes

### Story Intent

This story makes tenant governance operational by introducing explicit entitlement and scope-management controls with auditable mutation behavior.

### Technical Requirements

- Support tenant-level module enable/disable state.
- Support orgUnit lifecycle management within tenant boundary.
- Support role assignment at tenant and orgUnit layers using approved role stack.
- Apply immediate authorization effects after successful mutation (no stale role cache behavior).

### Architecture Compliance

- Preserve deny-by-default access controls.
- Keep entitlement/role mutation logic in service/application layer, not directly in route handlers.
- Ensure each write path follows event + outbox mutation contract.

### Library / Framework Requirements

- Use existing Node/Express/TypeScript/Joi/Knex stack.
- Reuse platform envelope helpers for refusal and system errors.
- Do not introduce new authorization libraries without explicit requirement.

### File Structure Requirements

- API surface: `src/src/routes/api/v1/*`.
- Validation rules: `src/src/validators/*`.
- Shared authorization and entitlement enforcement utilities: platform/module-level service helpers.
- Tests: platform authorization and mutation contract suites in existing backend test structure.

### Testing Requirements

- Matrix coverage for:
  - `SYSTEM_ADMIN`,
  - `TENANT_ADMIN`, `TENANT_STAFF`, `TENANT_VIEWER`,
  - `ORGUNIT_ADMIN`, `ORGUNIT_MEMBER`, `ORGUNIT_IDENTITY_LEAD`.
- Verify unauthorized scope changes are blocked.
- Verify event/outbox rows are persisted atomically with successful mutations.
- Verify initial tenant-admin assignment is blocked for non-system roles.

### Previous Story Intelligence

- Build directly on Story 1.1 context guarantees to avoid role/entitlement writes without valid tenant scope.

### Git Intelligence Summary

- Existing repository work favors deterministic policy/test gates and explicit contract checks; match that standard here.

### Latest Tech Information

- Current stack versions are already pinned in `src/package.json` and should be treated as authoritative for this story.

### Project Context Reference

- Follow project-context rules for module entitlement governance, tenant scoping, and audit/event requirements.

### Project Structure Notes

- Keep governance APIs cohesive and avoid leaking platform-admin concerns into feature-specific route files.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status.yaml

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- --runInBand` (src/)

### Completion Notes List

- Implemented `PlatformAdminService` to centralize entitlement, orgUnit, and membership mutation logic and keep route handlers thin.
- Added tenant-scoped module entitlement API + persistence (`platform.tenant_module_entitlements`) with active-tenant enforcement.
- Added orgUnit update endpoint and tenant/orgUnit membership revoke endpoints with immediate authorization effect via direct membership writes.
- Added actor/tenant/scope/reason metadata to entitlement and membership mutation event payloads, persisted via mutation wrapper event+outbox contract.
- Enforced SYSTEM_ADMIN-only initial tenant-admin assignment gate in both tenant-create bootstrap and tenant-membership assignment path.
- Added/updated Jest coverage for route refusal paths and migration schema contract.

### File List

- _bmad-output/implementation-artifacts/1-2-tenant-and-module-entitlement-administration.md
- src/src/services/PlatformAdminService.ts
- src/src/routes/api/v1/platform-admin.ts
- src/src/platform/rbac/capabilities.ts
- src/src/routes/api/v1/__tests__/platform-admin.test.ts
- src/src/migrations/20260220110000_add_tenant_module_entitlements.ts
- src/src/migrations/__tests__/tenantModuleEntitlementsMigration.test.ts

### Change Log

- 2026-02-20: Implemented AC1-AC3 for tenant module entitlement administration, scoped orgUnit/role mutation APIs, and initial tenant-admin enforcement with passing backend test suite.
