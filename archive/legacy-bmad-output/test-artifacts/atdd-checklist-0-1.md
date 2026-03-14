---
stepsCompleted: ['step-01-preflight-and-context','step-02-generation-mode','step-03-test-strategy','step-04-generate-tests','step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-17'
---

# ATDD Checklist - Epic 0, Story 1: Canonical app entrypoint and middleware chain

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

Story 0.1 requires a single canonical app entrypoint that applies shared middleware in strict order and mounts all module routes through centralized registration. This is a platform-kernel prerequisite because every downstream module depends on consistent correlation, tenancy, auth context, and envelope behavior.

**As a** platform engineer
**I want** one canonical app bootstrap with ordered platform middleware
**So that** all modules inherit the same kernel guarantees

---

## Acceptance Criteria

1. Middleware order enforces correlation, tenancy resolution, auth context, and envelope handling.
2. All module routes are mounted through shared route registration.

---

## Failing Tests Created (RED Phase)

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`

- ✅ **Test:** registers platform kernel route through canonical app entrypoint `@P0`
  - **Status:** RED - endpoint contract does not exist yet (`/api/v1/platform/_kernel/health` expected `200`)
  - **Verifies:** canonical app entrypoint registers kernel route and exposes health path.

- ✅ **Test:** adds correlation id via platform middleware `@P0`
  - **Status:** RED - middleware chain not yet returning correlation header from kernel context endpoint
  - **Verifies:** correlation middleware executes before handler and response includes `x-correlation-id`.

- ✅ **Test:** enforces middleware ordering for tenancy before handler execution `@P1`
  - **Status:** RED - middleware diagnostics endpoint not yet implemented
  - **Verifies:** tenancy resolution occurs in expected order before endpoint handler.

### API Tests (0 tests)

No additional API-only spec created for this story because this baseline suite uses Playwright request-context API checks as the primary acceptance layer.

### Component Tests (0 tests)

No component tests are required for this backend platform-kernel story.

---

## Data Factories Created

### Kernel Request Factory

**File:** `tests/support/factories/kernelRequestFactory.ts`

**Exports:**

- `createKernelRequest(overrides?)` - creates deterministic kernel request context with tenant/correlation/csrf headers.

---

## Fixtures Created

### Kernel API Fixture

**File:** `tests/support/fixtures/kernelApi.fixture.ts`

**Fixtures:**

- `kernelRequest` - provides generated tenant/correlation/csrf context for kernel API tests.
  - **Setup:** generates request metadata via factory.
  - **Provides:** `kernelRequest.headers` for authenticated kernel checks.
  - **Cleanup:** no persistence side-effects in RED phase.

---

## Mock Requirements

No third-party service mocks are required for story 0.1. Tests target monolith platform routes directly.

---

## Required data-testid Attributes

None for this story. Validation is API/middleware contract focused.

---

## Implementation Checklist

### Test: registers platform kernel route through canonical app entrypoint

**File:** `tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`

**Tasks to make this test pass:**

- [ ] Create canonical `src/app.ts` entrypoint and wire middleware bootstrap order.
- [ ] Implement `/api/v1/platform/_kernel/health` route through `registerRoutes`.
- [ ] Ensure route registration happens only through centralized route registrar.
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2-3 hours

### Test: adds correlation id via platform middleware

**File:** `tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`

**Tasks to make this test pass:**

- [ ] Add correlation middleware in canonical middleware chain.
- [ ] Implement `/api/v1/platform/_kernel/context` route returning request-context metadata.
- [ ] Echo correlation id in response headers.
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2-4 hours

### Test: enforces middleware ordering for tenancy before handler execution

**File:** `tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`

**Tasks to make this test pass:**

- [ ] Ensure tenancy resolver executes before route handlers.
- [ ] Add `/api/v1/platform/_kernel/middleware-order` diagnostic endpoint for test-only assertions.
- [ ] Return deterministic middleware trace for assertion.
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3-5 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npm run test:e2e -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts

# Run tests in headed mode
npm run test:e2e:headed -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts

# Debug specific test file
npm run test:e2e:debug -- tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Tests created for story-level acceptance criteria.
- ✅ Supporting factory and fixture created for repeatable request context.
- ✅ Expected failure reasons documented.

### GREEN Phase (DEV Team - Next Steps)

1. Implement canonical app bootstrap and route registration.
2. Add kernel diagnostic routes and middleware context propagation.
3. Re-run story test suite until passing.

### REFACTOR Phase (After GREEN)

- Consolidate kernel fixture patterns with shared API fixtures.
- Remove any temporary diagnostic endpoints not needed post-verification.

---

## Output

- Checklist: `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-checklist-0-1.md`
- Test spec: `/Users/jeremiahotis/moneyshyft/tests/e2e/platform/kernel-entrypoint-and-middleware.spec.ts`
- Factory: `/Users/jeremiahotis/moneyshyft/tests/support/factories/kernelRequestFactory.ts`
- Fixture: `/Users/jeremiahotis/moneyshyft/tests/support/fixtures/kernelApi.fixture.ts`
