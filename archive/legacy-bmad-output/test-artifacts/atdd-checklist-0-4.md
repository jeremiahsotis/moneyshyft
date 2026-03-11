---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-17T17:20:33Z'
storyId: '0-4'
storyFile: '/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-4-csrf-and-parent-domain-cookie-enforcement.md'
generationMode: 'ai-generation'
tddPhase: 'RED'
subprocessTimestamp: '2026-02-17T17-20-33Z'
---

# ATDD Checklist - Epic 0, Story 4: CSRF and Parent-Domain Cookie Enforcement

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Workflow Progress Log

### Step 1 - Preflight and Context

- Story loaded: `/Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/0-4-csrf-and-parent-domain-cookie-enforcement.md`
- Framework config loaded: `/Users/jeremiahotis/moneyshyft/playwright.config.ts`
- Test patterns reviewed under `/Users/jeremiahotis/moneyshyft/tests`
- Required policy gates passed on branch: `codex/story-0-4-csrf-and-parent-domain-cookie-enforcement`
  - `npm run policy:check`
  - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/0-4-csrf-and-parent-domain-cookie-enforcement.md`
- TEA flags:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`

Knowledge fragments loaded:
- Core: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`
- Playwright Utils: `overview`, `api-request`, `network-recorder`, `auth-session`, `intercept-network-call`, `recurse`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`
- Browser automation: `playwright-cli`

### Step 2 - Generation Mode

Selected mode: **AI generation**

Reasoning:
- Acceptance criteria are compact but precise enough to model expected API contract behavior.
- Existing platform test patterns for stories `0.2` and `0.3` provide reusable structure for kernel-level contract tests.
- Recording mode was not required for this phase because tests are intentionally RED-phase and endpoint contracts are not yet implemented.

### Step 3 - Test Strategy

Acceptance criteria mapped to scenarios:

1. Missing CSRF token on state-changing request => reject deterministically
2. Invalid/mismatched CSRF token on state-changing request => reject deterministically
3. Environment-safe cookie policy matrix evaluation for app/api sibling subdomains
4. Browser journey validation for cross-subdomain CSRF and parent-domain cookie behavior

Test levels selected:
- API (P0/P1): security contract validation for CSRF and cookie policy matrix
- E2E (P0/P1): browser journey behavior across app/api topology

Priority allocation:
- P0: CSRF missing/invalid rejection paths
- P1: cookie policy matrix and cross-subdomain browser contract

RED-phase enforcement:
- All generated tests use `test.skip(...)` intentionally
- Assertions target final expected behavior contract (not placeholders)

---

## Story Summary

Story 0.4 hardens the platform kernel so authenticated state-changing requests across `app.*` and `api.*` are protected by CSRF validation and consistent parent-domain cookie rules. The generated RED-phase tests define expected refusal semantics and cookie-policy contracts before implementation.

**As a** security engineer  
**I want** CSRF and cookie policy enforced for `app.*` / `api.*` topology  
**So that** state-changing routes are protected across domain boundaries

---

## Acceptance Criteria

1. Given a state-changing authenticated request, when CSRF token is missing or invalid, then request is rejected.
2. Cookie flags/domain/same-site behavior follows an environment-safe policy matrix for `app.*` and `api.*` topology.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts` (95 lines)

- ✅ **Test:** `rejects state-changing requests when csrf token is missing @P0`
  - **Status:** RED - expected refusal until CSRF guard contract exists
  - **Verifies:** deterministic 403 refusal with `CSRF_TOKEN_REQUIRED`
- ✅ **Test:** `rejects state-changing requests when csrf token is invalid @P0`
  - **Status:** RED - expected refusal until CSRF token-pair verification exists
  - **Verifies:** deterministic 403 refusal with `CSRF_TOKEN_INVALID`
- ✅ **Test:** `applies development cookie policy matrix for app.* / api.* topology @P1`
  - **Status:** RED - expected failure until cookie policy evaluation endpoint is implemented
  - **Verifies:** development-safe (`secure=false`, `sameSite=lax`, parent-domain) contract
- ✅ **Test:** `applies production cookie policy matrix for app.* / api.* topology @P1`
  - **Status:** RED - expected failure until production cookie policy matrix is implemented
  - **Verifies:** production-safe (`secure=true`, `sameSite=strict`, parent-domain) contract

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts` (115 lines)

- ✅ **Test:** `blocks cross-subdomain state-changing fetch when csrf header is missing @P0`
  - **Status:** RED - expected failure until browser-CSRF guard path exists
  - **Verifies:** app->api state-changing request rejected without CSRF header proof
- ✅ **Test:** `accepts cross-subdomain state-changing fetch when csrf proof pair is valid @P1`
  - **Status:** RED - expected failure until valid CSRF path is implemented
  - **Verifies:** accepted mutation with valid CSRF header/body proof pair
- ✅ **Test:** `sets parent-domain cookie attributes that are shared by app and api hosts @P1`
  - **Status:** RED - expected failure until cookie bootstrap contract is implemented
  - **Verifies:** parent-domain cookie attributes are shared for `app.*` and `api.*`

### Component Tests (0 tests)

No component-level tests were generated for this story because requirements are kernel-security contract focused (API + browser journey).

---

## Data Factories Created

### CSRF/Cookie Policy Factory

**File:** `tests/support/factories/csrfCookiePolicyFactory.ts`

**Exports:**

- `createParentDomainHosts(overrides?)`
- `createCsrfGuardRequest(overrides?)`
- `createCookiePolicyProbe(overrides?)`

Factory outputs include request headers/payload and environment-specific expected policy matrix values.

---

## Fixtures Created

### CSRF/Cookie Policy Fixture

**File:** `tests/support/fixtures/csrfCookiePolicy.fixture.ts`

**Fixtures:**

- `csrfGuardRequest`
- `csrfGuardRequestWithoutToken`
- `cookiePolicyProbe`
- `parentDomainHosts`

These fixtures provide deterministic request scaffolding for E2E security journey tests.

---

## Mock Requirements

External services are not required for this story.

Kernel endpoints expected by RED-phase tests:
- `POST /api/v1/platform/_kernel/security/csrf/guard`
- `POST /api/v1/platform/_kernel/security/cookies/policy/evaluate`
- `POST /api/v1/platform/_kernel/security/cookies/bootstrap`

---

## Required data-testid Attributes

No UI component selectors are required for this story at this phase. Tests validate browser-request behavior and cookie/session contracts.

---

## Implementation Checklist

### Test: API CSRF rejection paths

**File:** `tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts`

**Tasks to make this test set pass:**

- [ ] Implement kernel CSRF guard endpoint for state-changing requests
- [ ] Enforce missing-token refusal with `403` + `CSRF_TOKEN_REQUIRED`
- [ ] Enforce invalid-token refusal with `403` + `CSRF_TOKEN_INVALID`
- [ ] Ensure refusal envelope includes `ok=false` and `refusalType='security'`
- [ ] Remove `test.skip()` from P0 API tests
- [ ] Run: `npm run test:e2e -- tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts`
- [ ] ✅ Tests pass

### Test: Cookie policy matrix contract

**File:** `tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts`

**Tasks to make this test set pass:**

- [ ] Implement cookie policy matrix evaluation contract (`development`, `staging`, `production`)
- [ ] Derive/emit parent-domain cookie strategy for sibling subdomains
- [ ] Enforce secure/sameSite rules by environment
- [ ] Remove `test.skip()` from cookie matrix API tests
- [ ] Run: `npm run test:e2e -- tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts`
- [ ] ✅ Tests pass

### Test: Browser journey contract for app/api topology

**File:** `tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts`

**Tasks to make this test set pass:**

- [ ] Wire browser-facing CSRF enforcement on state-changing app->api fetch flow
- [ ] Support valid CSRF proof pair acceptance path
- [ ] Implement cookie bootstrap endpoint with parent-domain cookie attributes
- [ ] Verify `HttpOnly`, `secure`, and `sameSite` attributes are emitted as expected
- [ ] Remove `test.skip()` from E2E tests
- [ ] Run: `npm run test:e2e -- tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts`
- [ ] ✅ Tests pass

---

## Running Tests

```bash
# Run story 0.4 generated ATDD specs
npm run test:e2e -- tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts

# Run API spec only
npm run test:e2e -- tests/api/platform/csrf-and-parent-domain-cookie-enforcement.api.spec.ts

# Run E2E spec only
npm run test:e2e -- tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts

# Run headed for interactive debugging
npm run test:e2e:headed -- tests/e2e/platform/csrf-and-parent-domain-cookie-enforcement.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- RED-phase ATDD test contracts generated.
- Tests are intentionally `test.skip()` while implementation is missing.
- Assertions are concrete and non-placeholder.

### GREEN Phase (Next)

1. Implement CSRF and cookie-policy contracts.
2. Remove `test.skip()` incrementally (P0 first).
3. Verify green state for API tests, then E2E tests.

### REFACTOR Phase (After Green)

1. Consolidate shared CSRF and cookie policy helpers under platform security module.
2. Ensure middleware order and refusal envelope compliance remain unchanged.
3. Keep tests deterministic and parallel-safe.

---

## Test Execution Evidence

RED-phase evidence artifacts:

- `/tmp/tea-atdd-api-tests-2026-02-17T17-20-33Z.json`
- `/tmp/tea-atdd-e2e-tests-2026-02-17T17-20-33Z.json`
- `/tmp/tea-atdd-summary-2026-02-17T17-20-33Z.json`

Persisted copies:

- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-02-17T17-20-33Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-02-17T17-20-33Z.json`
- `/Users/jeremiahotis/moneyshyft/_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-02-17T17-20-33Z.json`

---

## Validation (Step 5)

Checklist status:

- [x] Prerequisites satisfied (story + framework + policy gates)
- [x] Test files created and organized by level (API/E2E)
- [x] All generated tests are explicitly RED-phase (`test.skip`)
- [x] Acceptance criteria mapped to test scenarios and priorities
- [x] Supporting factory + fixture scaffolding created
- [x] ATDD checklist output generated at required path
- [x] Temp subprocess artifacts are persisted under `{test_artifacts}/atdd-temp`

Open assumptions/risks:

- Story acceptance criteria are high-level; endpoint path and refusal code names are contractual assumptions in this ATDD output.
- Cookie matrix exact values (`sameSite=strict` in production) should be confirmed if product/security policy differs.

---

## Next Recommended Workflow

- Continue with implementation workflow (`dev-story`) for Story 0.4.
- After implementation, run `review tests` to remove `test.skip()` and verify green phase.
