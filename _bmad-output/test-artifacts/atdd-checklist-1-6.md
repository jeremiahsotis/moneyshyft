---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-20T14:03:29Z'
---

# ATDD Checklist - Epic 1, Story 6: Security Controls and Redaction Verification

**Date:** 2026-02-20
**Author:** Jeremiah
**Primary Test Level:** API

---

## Story Summary

This story hardens the platform security verification lane by formalizing regression checks for tenant isolation, CSRF enforcement, and cookie posture while introducing a contract that verifies log/audit payload redaction. The ATDD suite defines expected control behavior and redaction-safe evidence before implementation changes are activated.

**As a** security engineer  
**I want** tenant isolation, CSRF/cookie posture, and log/event redaction verified continuously  
**So that** core security controls are enforced in implementation and CI

---

## Acceptance Criteria

1. Given protected API and auth paths, when security regression tests run, then cross-tenant access attempts fail and CSRF protection is enforced on state-changing routes.
2. Logs and event payloads exclude prohibited secret/plaintext sensitive fields.

---

## Failing Tests Created (RED Phase)

### E2E Tests (2 tests)

**File:** `tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts` (62 lines)

- ✅ **Test:** `[P1] operator verification journey surfaces tenant-scope and csrf control evidence in the security workspace @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`), expected behavior encoded before implementation is activated
  - **Verifies:** Security verification journey exposes tenancy + CSRF control evidence

- ✅ **Test:** `[P1] security evidence panel displays redaction-safe telemetry without exposing plaintext secrets @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** UI evidence panel contract does not surface plaintext secrets

### API Tests (6 tests)

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts` (158 lines)

- ✅ **Test:** `[P0] rejects cross-tenant read overrides on protected repository diagnostics @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC1 cross-tenant read spoofing refusal behavior

- ✅ **Test:** `[P0] rejects cross-tenant write overrides with deterministic business refusal envelope @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC1 cross-tenant write spoofing refusal behavior

- ✅ **Test:** `[P0] enforces csrf evidence on state-changing security guard endpoints @P0`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC1 CSRF required behavior for state-changing security routes

- ✅ **Test:** `[P1] rejects csrf mismatch and preserves deterministic security refusal semantics @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC1 CSRF mismatch refusal semantics

- ✅ **Test:** `[P1] verifies production cookie posture contract for sibling app/api domains @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC1 cookie policy matrix expectations for production topology

- ✅ **Test:** `[P1] emits redaction-safe audit evidence and excludes plaintext secrets from payload contracts @P1`
  - **Status:** RED - skipped by ATDD design (`test.skip`)
  - **Verifies:** AC2 redaction evidence contract and no-secret leakage guarantees

### Component Tests (0 tests)

**File:** `N/A`

No component-level tests are required for this story.

---

## Data Factories Created

### Security Controls Story 1.6 Context Factory

**File:** `tests/support/factories/securityControlsStory16Factory.ts`

**Exports:**

- `createStory16Context(overrides?)` - canonical Story 1.6 context
- `createStory16TenantHeaders(context, overrides?)` - tenant-scoped authenticated headers
- `createStory16CrossTenantReadProbe(context)` - read-path cross-tenant probe
- `createStory16CrossTenantWriteProbe(context)` - write-path cross-tenant probe
- `createStory16CsrfGuardProbe(context, overrides?)` - CSRF request payload + headers
- `createStory16CookiePolicyProbe(context)` - cookie posture matrix probe
- `createStory16RedactionProbe(context)` - redaction payload + expected redaction contract assertions

---

## Fixtures Created

### Security Controls Story 1.6 Fixtures

**File:** `tests/support/fixtures/securityControlsStory16.fixture.ts`

**Fixtures:**

- `story16Context` - story-scoped canonical context values and target routes
- `story16TenantHeaders` - ready-to-use tenant/auth headers
- `story16CrossTenantReadProbe` - read override probe payload/query
- `story16CrossTenantWriteProbe` - write override probe payload/query
- `story16CsrfGuardProbe` - CSRF guard probe
- `story16CookiePolicyProbe` - cookie posture matrix probe
- `story16RedactionProbe` - redaction verification probe + expected assertions

---

## Mock Requirements

No external service mocks are required for this story-level ATDD suite.

---

## Required data-testid Attributes

### Security Verification Workspace

- `security-controls-heading` - heading for the verification page
- `security-run-verification-button` - action button to run verification
- `security-tenant-scope-status` - tenant isolation status indicator
- `security-csrf-status` - CSRF status indicator
- `security-redaction-status` - redaction verification status indicator
- `security-audit-minimality-status` - minimal audit payload status indicator

---

## Implementation Checklist

### Test: cross-tenant read override refusal

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Ensure protected repository diagnostics reject cross-tenant overrides with `TENANT_SCOPE_VIOLATION` and security refusal semantics
- [ ] Keep deterministic refusal envelope fields stable (`ok`, `code`, `refusalType`)
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: cross-tenant write override refusal

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Ensure write override checks return business refusal semantics for cross-tenant attempts
- [ ] Preserve refusal transport behavior for blocked write probes
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: missing CSRF evidence refusal

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Ensure state-changing guard endpoints require CSRF header/proof token
- [ ] Preserve `CSRF_TOKEN_REQUIRED` refusal semantics
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: CSRF mismatch refusal

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Preserve deterministic mismatch refusal code `CSRF_TOKEN_INVALID`
- [ ] Keep failure semantics stable for malformed state-changing requests
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: production cookie posture matrix

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Ensure cookie policy matrix returns secure/sameSite/domain posture for app/api sibling topology
- [ ] Preserve response contract for policy evaluation
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: redaction-safe audit evidence contract

**File:** `tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`

- [ ] Implement centralized redaction logic for sensitive fields in audit/event payloads
- [ ] Ensure redaction report contract returns `allSensitiveFieldsRedacted=true`
- [ ] Ensure plaintext sensitive markers are absent from emitted payloads/log evidence
- [ ] Run test: `npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.0 hours

### Test: security verification journey surface checks

**File:** `tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts`

- [ ] Implement/update security verification page controls and evidence rendering
- [ ] Ensure tenant scope + CSRF status indicators are visible and deterministic
- [ ] Add required `data-testid` hooks for stable selectors
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.75 hours

### Test: redaction-safe telemetry UI checks

**File:** `tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts`

- [ ] Ensure redaction-safe telemetry view renders pass state and hides plaintext secret values
- [ ] Ensure policy compliance banner is visible after verification run
- [ ] Run test: `npm run test:e2e -- tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.75 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts

# Run API file only
npm run test:e2e -- tests/api/platform/1-6-security-controls-and-redaction-verification.atdd.api.spec.ts

# Run E2E file only
npm run test:e2e -- tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts

# Headed mode
npm run test:e2e -- --headed tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts

# Debug mode
npm run test:e2e -- --debug tests/e2e/platform/1-6-security-controls-and-redaction-verification.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing (skipped) ATDD API/E2E tests generated for AC1 + AC2
- ✅ Story-specific factory + fixture created
- ✅ Implementation checklist mapped from tests to concrete tasks
- ✅ Required UI test-id hooks documented for stable E2E execution

### GREEN Phase (DEV Team - Next Steps)

1. Remove `test.skip()` from highest-priority P0 API tests.
2. Implement minimal behavior required for each test to pass.
3. Progress from P0 → P1 across API, then complete E2E requirements.

### REFACTOR Phase

- Consolidate repeated security verification helpers into shared platform test utilities.
- Keep redaction assertions strict while reducing duplication across API/E2E tests.
