---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: 2026-02-19
---

# ATDD Checklist - Epic 1, Story 1.1: Tenant Context Resolution and Isolation Guardrails

**Date:** 2026-02-19
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

Story 1.1 establishes canonical tenant + orgUnit context resolution and deterministic scoped-access refusal behavior. This ATDD output creates RED-phase tests for middleware context attachment, scoped repository enforcement, and negative spoof/cross-tenant cases.

**As a** platform engineer
**I want** canonical tenancy context and scoped data guardrails
**So that** cross-tenant and cross-orgUnit leakage is structurally prevented

## Acceptance Criteria

1. Canonical context `{tenantId, orgUnitId|null, scopeMode}` is attached on request handling.
2. OrgUnit-scoped routes require valid tenant-owned orgUnit.
3. Repository helpers enforce tenant/orgUnit filters by scope.
4. Cross-tenant, cross-orgUnit, and spoof attempts are deterministically rejected.

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/1-1-tenant-context-resolution-and-isolation-guardrails.atdd.api.spec.ts`

- All tests use `test.skip` and assert expected post-implementation behavior.

### E2E Tests (2 tests)

**File:** `tests/e2e/platform/1-1-tenant-context-resolution-and-isolation-guardrails.atdd.spec.ts`

- All tests use `test.skip` and assert tenant-scope UX guardrails.

## Data Factories / Fixtures

- `tests/support/fixtures/tenantContextStory11.fixture.ts`

## Required data-testid Attributes

1. `tenant-context-banner`
2. `tenant-context-scope-mode`

## Implementation Checklist

1. Implement canonical context attachment in tenancy middleware.
2. Enforce orgUnit validity/membership against active tenant context.
3. Ensure repository helper scope filters are mandatory by mode.
4. Implement deterministic refusal codes for scope violations and spoof attempts.
5. Remove `test.skip` and run green-phase verification.

## Running Tests

```bash
npm run test:e2e -- tests/api/platform/1-1-tenant-context-resolution-and-isolation-guardrails.atdd.api.spec.ts
npm run test:e2e -- tests/e2e/platform/1-1-tenant-context-resolution-and-isolation-guardrails.atdd.spec.ts
```

## Notes

- Generation mode: AI generation.
- Scope: `mono-S1.1` (story-specific).
