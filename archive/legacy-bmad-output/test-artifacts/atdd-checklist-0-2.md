---
stepsCompleted: ['step-01-preflight-and-context','step-02-generation-mode','step-03-test-strategy','step-04-generate-tests','step-04c-aggregate','step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-17'
---

# ATDD Checklist - Epic 0, Story 2: Tenancy context resolution and repository enforcement

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

Story 0.2 hardens tenant isolation by requiring resolved tenant context before protected repository access and by enforcing mandatory tenant filters during read and write operations. The RED-phase suite defines deterministic cross-tenant refusal behavior so implementation can be verified without ambiguity.

**As a** platform engineer
**I want** tenant resolution and mandatory tenant-scoped data access
**So that** cross-tenant reads/writes cannot occur by omission

---

## Acceptance Criteria

1. Tenant context is present and required filters are applied.
2. Cross-tenant negative tests fail deterministically.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`

- ✅ **Test:** requires tenant context before repository guard queries execute `@P0`
  - **Status:** RED - tenancy diagnostics contract is not implemented yet.
  - **Verifies:** protected repository paths reject missing tenant context.

- ✅ **Test:** applies mandatory tenant filter to repository reads `@P0`
  - **Status:** RED - repository guard endpoint/filtering contract is not implemented yet.
  - **Verifies:** read queries are scoped to resolved tenant id.

- ✅ **Test:** rejects cross-tenant query overrides from protected paths `@P1`
  - **Status:** RED - tenant override refusal semantics are not implemented yet.
  - **Verifies:** cross-tenant reads are blocked with deterministic refusal code.

- ✅ **Test:** blocks cross-tenant writes when payload tenant differs from context tenant `@P1`
  - **Status:** RED - write-path tenant guard and refusal envelope are not implemented yet.
  - **Verifies:** cross-tenant writes are rejected with business refusal structure.

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts`

- ✅ **Test:** resolves stable tenant context for protected repository diagnostics journey `@P0`
  - **Status:** RED - repository diagnostics journey contract does not exist yet.
  - **Verifies:** tenant context is resolved once and reused downstream.

- ✅ **Test:** denies cross-tenant read attempts deterministically in end-to-end flow `@P1`
  - **Status:** RED - deterministic refusal journey not yet implemented.
  - **Verifies:** end-to-end guarded flow returns tenant-scope violation semantics.

- ✅ **Test:** keeps tenant scope consistent across repeated guarded requests `@P1`
  - **Status:** RED - repeated guarded request behavior is not implemented yet.
  - **Verifies:** tenant context remains stable for sequential protected calls.

### Component Tests (0 tests)

No component tests are required for this backend kernel story.

---

## Data Factories Created

### Tenant Repository Factory

**File:** `tests/support/factories/tenantRepositoryFactory.ts`

**Exports:**

- `createTenantScopeHeaders(overrides?)` - builds tenant/correlation/csrf header sets.
- `createRepositoryGuardQuery(overrides?)` - builds deterministic repository guard query strings.
- `createCrossTenantProbe(overrides?)` - builds cross-tenant read/write probe query and payload data.

---

## Fixtures Created

### Tenant Context Fixture

**File:** `tests/support/fixtures/tenantContext.fixture.ts`

**Fixtures:**

- `tenantHeaders` - provides generated tenant-scoped request headers.
- `crossTenantProbe` - provides deterministic cross-tenant read/write probe data.

---

## Mock Requirements

No third-party mocks required. Story focuses on platform kernel behavior and repository guard semantics.

---

## Required data-testid Attributes

None. This story verifies API/kernel contracts and tenant enforcement semantics.

---

## Implementation Checklist

### Test: requires tenant context before repository guard queries execute

**File:** `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement `/api/v1/platform/_kernel/tenancy/diagnostics` endpoint.
- [ ] Enforce required tenant context for protected repository paths.
- [ ] Return deterministic refusal payload with `TENANCY_CONTEXT_REQUIRED`.
- [ ] Run test: `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2-4 hours

### Test: applies mandatory tenant filter to repository reads

**File:** `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement repository guard read diagnostics endpoint.
- [ ] Apply mandatory tenant filter to all repository reads.
- [ ] Include tenant-scoped diagnostics output for verification.
- [ ] Run test: `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3-5 hours

### Test: rejects cross-tenant query overrides from protected paths

**File:** `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Reject `tenantOverride`/target-tenant request parameters when context tenant differs.
- [ ] Return refusal contract with `TENANT_SCOPE_VIOLATION`.
- [ ] Ensure deterministic status behavior for negative tests.
- [ ] Run test: `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2-4 hours

### Test: blocks cross-tenant writes when payload tenant differs from context tenant

**File:** `tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Add write-path tenant guard in repository mutation flow.
- [ ] Enforce mismatch detection between context and payload tenant ids.
- [ ] Return refusal envelope (`ok=false`, `code=TENANT_SCOPE_VIOLATION`, `refusalType=business`).
- [ ] Run test: `npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3-5 hours

---

## Running Tests

```bash
# Run story 0.2 RED-phase tests
npm run test:e2e -- tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts

# Run headed mode
npm run test:e2e:headed -- tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts

# Debug mode
npm run test:e2e:debug -- tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API and E2E acceptance tests generated for story 0.2.
- ✅ Tests assert expected tenancy and repository guard behavior.
- ✅ Tests are intentionally skipped to indicate pre-implementation RED artifacts.
- ✅ Support factory and fixture generated for consistent tenant/cross-tenant setup.

### GREEN Phase (DEV Team - Next Steps)

1. Implement protected tenancy diagnostics and repository guard endpoints.
2. Enforce mandatory tenant filters on repository reads and writes.
3. Add deterministic refusal semantics for cross-tenant violations.
4. Remove `test.skip()` markers and run the story suite until passing.

### REFACTOR Phase (After GREEN)

- Consolidate tenant guard diagnostics into reusable kernel testing helpers.
- Remove any temporary diagnostics once invariant coverage is preserved.

---

## Output

- Checklist: `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-checklist-0-2.md`
- API spec: `/Users/jeremiahotis/moneyshyft/tests/api/platform/tenancy-context-and-repository-enforcement.api.spec.ts`
- E2E spec: `/Users/jeremiahotis/moneyshyft/tests/e2e/platform/tenancy-context-and-repository-enforcement.spec.ts`
- Factory: `/Users/jeremiahotis/moneyshyft/tests/support/factories/tenantRepositoryFactory.ts`
- Fixture: `/Users/jeremiahotis/moneyshyft/tests/support/fixtures/tenantContext.fixture.ts`
