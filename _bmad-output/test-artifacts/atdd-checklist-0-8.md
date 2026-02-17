---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-17T17:06:00Z'
---

# ATDD Checklist - Epic 0, Story 8: Centralized Time Service and UTC/Local Rendering Contract

**Date:** 2026-02-17
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

This story defines a centralized time-rendering contract where persistence remains UTC while operational UI receives local-time rendering. The contract requires deterministic fallback selection (`user -> tenant -> system`) and explicitly prevents raw UTC values from being shown in operational experiences.

**As a** product operator  
**I want** a unified date-time pipeline  
**So that** users/admin always see local timezone while storage remains UTC

---

## Acceptance Criteria

1. UTC storage and local display are enforced with fallback (`user -> tenant -> system`)
2. contract tests confirm raw UTC is not displayed in operational UI responses

---

## Failing Tests Created (RED Phase)

### E2E Tests (3 tests)

**File:** `tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts` (80 lines)

- ✅ **Test:** `[P0] renders localized operation time from utc in operational grid`
  - **Status:** RED (skipped intentionally) - `/operations` UI/route contract not implemented
  - **Verifies:** localized display value is rendered for operation rows
- ✅ **Test:** `[P1] shows tenant fallback indicator when user timezone is unavailable`
  - **Status:** RED (skipped intentionally) - fallback indicator and render-context endpoint not implemented
  - **Verifies:** timezone source fallback is visible when user preference is absent
- ✅ **Test:** `[P1] never surfaces raw utc iso text in operational ui elements`
  - **Status:** RED (skipped intentionally) - UTC suppression contract not implemented
  - **Verifies:** raw ISO UTC text does not appear in operational UI

### API Tests (3 tests)

**File:** `tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts` (68 lines)

- ✅ **Test:** `[P0] resolves timezone fallback in strict order user -> tenant -> system`
  - **Status:** RED (skipped intentionally) - render-context endpoint contract not implemented
  - **Verifies:** fallback precedence resolves correctly
- ✅ **Test:** `[P1] returns localized timestamps for operational payload contract`
  - **Status:** RED (skipped intentionally) - render-contract endpoint not implemented
  - **Verifies:** UTC input can be transformed to localized payload contract
- ✅ **Test:** `[P1] contract endpoint omits raw utc strings in operational-ui response envelope`
  - **Status:** RED (skipped intentionally) - feed contract not yet enforcing presentation invariant
  - **Verifies:** operational responses are UI-safe (no raw UTC strings)

### Component Tests (0 tests)

Component-level coverage deferred. Story scope is currently contract and integration level.

---

## Data Factories Created

### Timezone Context Factory

**File:** `tests/support/factories/timezoneContextFactory.ts`

**Exports:**

- `createTimezoneContext(overrides?)` - Create timezone headers/context with fallback metadata and correlation id

---

## Fixtures Created

### Timezone Context Fixture

**File:** `tests/support/fixtures/timezoneContext.fixture.ts`

**Fixtures:**

- `timezoneContext` - Provides generated timezone context for tests
  - **Setup:** creates context via `createTimezoneContext()`
  - **Provides:** user/tenant/system timezone metadata and headers
  - **Cleanup:** none needed (pure in-memory data)

---

## Mock Requirements

### Time Rendering Contract Mock

**Endpoint:** `GET /api/v1/platform/time/render-context`

**Success Response:**

```json
{
  "timezone": "America/Chicago",
  "timezoneSource": "tenant"
}
```

**Failure Response:**

```json
{
  "code": "TIMEZONE_CONTEXT_UNRESOLVED",
  "message": "Unable to resolve timezone context"
}
```

### Operations Feed Contract Mock

**Endpoint:** `GET /api/v1/platform/operations/feed`

**Success Response:**

```json
{
  "rows": [
    {
      "id": "op-001",
      "occurredAtUtc": "2026-02-17T15:30:00.000Z",
      "occurredAtLocal": "2026-02-17 10:30 AM",
      "timezoneSource": "user"
    }
  ]
}
```

**Failure Response:**

```json
{
  "code": "OPERATIONS_FEED_UNAVAILABLE",
  "message": "Unable to generate operations feed"
}
```

---

## Required data-testid Attributes

### Operations Screen

- `operations-time-cell` - Localized date-time display cell in operations table/grid
- `timezone-source-badge` - Badge indicating fallback source (`user|tenant|system`)
- `operations-row` - Row container used for deterministic row assertions

---

## Implementation Checklist

### Test: `[P0] resolves timezone fallback in strict order user -> tenant -> system`

**File:** `tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement centralized timezone resolver in platform kernel
- [ ] Enforce precedence chain `user -> tenant -> system`
- [ ] Implement `GET /api/v1/platform/time/render-context`
- [ ] Return stable response contract including `timezoneSource`
- [ ] Run test: `npx playwright test tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

### Test: `[P1] returns localized timestamps for operational payload contract`

**File:** `tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement UTC->local rendering service entrypoint for operations payloads
- [ ] Implement `POST /api/v1/platform/time/render-contract`
- [ ] Ensure timestamps remain UTC at storage boundary
- [ ] Return localized render fields for operational consumers
- [ ] Run test: `npx playwright test tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

### Test: `[P1] never surfaces raw utc iso text in operational ui elements`

**File:** `tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts`

**Tasks to make this test pass:**

- [ ] Add operational UI rendering path for localized time values
- [ ] Prevent direct binding of raw UTC fields in operational components
- [ ] Add required data-testid attributes: `operations-time-cell`, `timezone-source-badge`, `operations-row`
- [ ] Confirm fallback source badge handling in UI
- [ ] Run test: `npx playwright test tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npx playwright test tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts

# Run specific test file
npx playwright test tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts

# Run tests in headed mode (see browser)
npx playwright test tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts --headed

# Debug specific test
npx playwright test tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts --debug

# Run tests with coverage (if configured)
npx playwright test --coverage
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Tests authored before implementation
- ✅ API and E2E contracts mapped directly to story acceptance criteria
- ✅ Supporting factory/fixture scaffolding added
- ✅ Implementation checklist prepared

### GREEN Phase (DEV Team - Next Steps)

1. Implement centralized timezone service and fallback chain.
2. Implement operational render-contract endpoints.
3. Wire UI rendering to localized output only.
4. Remove `test.skip()` markers from story tests.
5. Execute tests and iterate until green.

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Consolidate timezone logic in one service boundary.
2. Remove duplication across API and UI adapters.
3. Harden contract typing and error envelopes.
4. Re-run full platform test set for regression confidence.

---

## Next Steps

1. Hand off checklist and RED tests to DEV workflow.
2. Implement feature with one test-at-a-time progression.
3. Remove `test.skip()` once implementation exists.
4. Re-run the two story spec files and confirm green.

---

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
- `api-testing-patterns.md`

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:**  
`npx playwright test tests/api/platform/centralized-time-service-and-utc-local-rendering-contract.api.spec.ts tests/e2e/platform/centralized-time-service-and-utc-local-rendering-contract.spec.ts`

**Results:** Not executed in this run. RED-phase intent is represented by `test.skip()` scaffolding and implementation checklist handoff.

**Expected Failure Messages (after removing skip pre-implementation):**

- `GET /api/v1/platform/time/render-context` returns `404` or missing contract fields
- `POST /api/v1/platform/time/render-contract` returns `404` or missing localized render fields
- `/operations` UI lacks localized time rendering and fallback badge contract

---

## Notes

- Story scope remains Phase-0 and avoids module-specific behavior outside kernel/platform contracts.
- Tests are intentionally authored in RED mode with `test.skip()` to stage implementation handoff safely.

---

**Generated by BMad TEA Agent** - 2026-02-17
