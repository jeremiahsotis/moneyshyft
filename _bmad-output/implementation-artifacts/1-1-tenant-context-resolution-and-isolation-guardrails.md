# Story 1.1: Tenant Context Resolution and Isolation Guardrails

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want every request to resolve tenant + orgUnit context and enforce scoped data boundaries,
so that cross-tenant and cross-orgUnit leakage are structurally prevented.

## Acceptance Criteria

1. Given an authenticated or anonymous request reaches the API, when middleware resolves tenancy, then canonical context `{tenantId, orgUnitId|null, scopeMode}` is attached to request context.
2. OrgUnit-scoped routes require a valid orgUnit belonging to the active tenant.
3. Repository helpers enforce required scope filters (`tenant_id`; plus `org_unit_id` when orgUnit-scoped).
4. Deterministic negative tests reject cross-tenant access, cross-orgUnit access, and orgUnit spoofing.

## Tasks / Subtasks

- [ ] Implement acceptance criterion 1 (AC: 1)
  - [ ] Normalize tenancy context resolution in middleware for both authenticated and anonymous requests.
  - [ ] Ensure request context object is typed and consistently available to downstream handlers.
- [ ] Implement acceptance criterion 2 (AC: 2)
  - [ ] Enforce orgUnit membership validation against the active tenant context.
  - [ ] Reject missing/invalid orgUnit context on orgUnit-scoped routes with deterministic refusal/error response.
- [ ] Implement acceptance criterion 3 (AC: 3)
  - [ ] Add or harden shared repository helpers to require tenant/orgUnit filters by scope.
  - [ ] Remove/flag any unscoped repository access paths.
- [ ] Implement acceptance criterion 4 (AC: 4)
  - [ ] Add API/integration negative tests for tenant isolation and orgUnit spoof prevention.
  - [ ] Verify tests cover both read and write paths.

## Dev Notes

### Story Intent

This story formalizes tenancy + orgUnit context as a hard platform invariant for all RouteShyft request handling and persistence paths.

### Technical Requirements

- Canonical request context shape: `{ tenantId, orgUnitId|null, scopeMode }`.
- No trusted tenant context from client-provided headers alone.
- orgUnit-scoped routes must fail closed when orgUnit is missing, invalid, or outside active tenant.
- Tenant-scoped and orgUnit-scoped repository helpers must enforce filters by default.

### Architecture Compliance

- Keep platform-level context/middleware logic in platform middleware utilities.
- Preserve deny-by-default authorization and tenancy enforcement posture.
- Keep route handlers thin; avoid embedding filter construction logic ad hoc in handlers.

### Library / Framework Requirements

- Node `>=20`.
- Express `4.18.x` middleware chain conventions.
- TypeScript strict-safe types for request context extensions.
- Existing repo stack only; no framework swaps.

### File Structure Requirements

- Middleware and context logic: `src/src/platform/middleware/*` and related platform utilities.
- Route handlers: `src/src/routes/api/v1/*.ts`.
- Validators: `src/src/validators/*.validators.ts` where needed.
- Tests: existing platform API/E2E test conventions under `tests/api/platform` and `tests/e2e/platform`.

### Testing Requirements

- Add deterministic negative tests for:
  - cross-tenant read/write attempts,
  - cross-orgUnit access attempts,
  - orgUnit spoofing attempts.
- Verify expected refusal/error contract on invalid scope resolution.
- Run targeted platform tenancy tests plus impacted regression slices.

### Previous Story Intelligence

- Epic 0 already hardened early tenancy context enforcement paths; reuse those patterns and avoid duplicated logic.

### Git Intelligence Summary

- Recent commits emphasize policy-first, deterministic test coverage, and guardrail hardening.
- Continue pattern: contract-first implementation + explicit regression tests.

### Latest Tech Information

- Current backend stack in-repo: Express `^4.18.2`, Knex `^3.0.1`, pg `^8.11.3`, jsonwebtoken `^9.0.2`, Joi `^17.11.0`.
- Keep implementation aligned to pinned repo versions and existing runtime constraints.

### Project Context Reference

- Enforce project-context critical rule: all persistence/query paths must apply tenant filters; no unscoped access paths.

### Project Structure Notes

- Keep platform invariants centralized; avoid scattering tenancy checks across feature modules.
- Preserve migration-safe incremental changes and avoid broad refactors.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status.yaml

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story preparation only; implementation logs pending.

### Completion Notes List

- Story context prepared with tenancy and scope-enforcement guardrails.

### File List

- _bmad-output/implementation-artifacts/1-1-tenant-context-resolution-and-isolation-guardrails.md
