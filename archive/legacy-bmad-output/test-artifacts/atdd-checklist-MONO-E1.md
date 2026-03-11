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

# ATDD Checklist - Epic 1 (MONO-E1): Platform Kernel and Tenant Access Foundations

**Date:** 2026-02-19
**Author:** Jeremiah
**Primary Test Level:** API

## Story Summary

MONO-E1 establishes the monolith platform kernel guardrails for tenancy scope enforcement, entitlement administration, auth/session + CSRF integrity, envelope consistency, policy-first workflow enforcement, and security redaction verification. This ATDD package provides RED-phase acceptance tests that are intentionally skipped until implementation reaches green phase.

**As a** platform and tenant governance team
**I want** enforceable, test-backed platform access and security controls
**So that** the monolith enforces deterministic, auditable behavior before feature expansion

## Acceptance Criteria

1. Tenant/orgUnit context resolution and scoped data boundary enforcement prevent cross-tenant/orgUnit leakage.
2. Tenant entitlement/orgUnit/role administration updates authorization behavior and emits audit/outbox records.
3. First-party session rotation/revocation and CSRF enforcement protect state-changing routes.
4. Shared success/refusal/systemError envelope is consistent, with business refusal as `HTTP 200` and `ok=false`.
5. CI policy gate and branch workflow guard enforcement remain mandatory.
6. Security regression verifies tenant isolation, CSRF/cookie posture, and sensitive-field redaction.

## Failing Tests Created (RED Phase)

### API Tests (7 tests)

**File:** `tests/api/platform/epic-1-platform-kernel.atdd.api.spec.ts`

- `test.skip` for each acceptance contract (P0/P1)
- Expected green-phase outcomes codified in assertions
- Designed to fail when unskipped before implementation

### E2E Tests (4 tests)

**File:** `tests/e2e/platform/epic-1-platform-kernel.atdd.spec.ts`

- `test.skip` for end-to-end governance/security user journeys
- Resilient selectors (`getByRole`, `getByLabel`, `getByText`)
- Designed to fail when unskipped before implementation

## Data Factories / Fixtures

- `tests/support/fixtures/epic1Atdd.fixture.ts`
  - `epic1AtddData` baseline IDs/emails for deterministic scenario setup.

## Mock Requirements

1. Entitlement mutation API responses for tenant settings screens.
2. Auth refresh/session rotation responses for stateful auth flow.
3. Security verification report endpoint responses for redaction evidence UI.

## Required data-testid Attributes

1. `tenant-settings-module-switch`
2. `tenant-protected-actions-panel`
3. `security-verification-panel`
4. `security-redaction-summary`

## Implementation Checklist

1. Implement tenant/orgUnit context middleware and scope-safe repository enforcement.
2. Implement tenant entitlement/orgUnit/role admin mutations with outbox/audit writes.
3. Implement refresh rotation + revocation persistence and CSRF hard-enforcement.
4. Standardize envelope helper adoption (`success/refusal/systemError`) and refusal HTTP semantics.
5. Ensure CI policy-first stage + branch workflow guard enforcement contracts remain passing.
6. Implement security regression and redaction report endpoints/contracts.
7. Remove `test.skip` from ATDD test files and run green-phase verification.

## Running Tests

```bash
npm run test:e2e -- tests/api/platform/epic-1-platform-kernel.atdd.api.spec.ts
npm run test:e2e -- tests/e2e/platform/epic-1-platform-kernel.atdd.spec.ts
npm run test:e2e -- tests/api/platform/epic-1-platform-kernel.atdd.api.spec.ts tests/e2e/platform/epic-1-platform-kernel.atdd.spec.ts
```

## Red-Green-Refactor Workflow

### RED Phase (complete)

- Failing acceptance tests authored and intentionally marked with `test.skip`.
- Assertions capture target behavior; implementation not yet complete.

### GREEN Phase (dev next)

1. Remove one `test.skip` at a time.
2. Implement minimal code to satisfy that test.
3. Repeat until all ATDD cases pass.

### REFACTOR Phase (dev after green)

- Consolidate shared logic, harden fixtures, preserve passing tests.

## Validation Summary

- Policy gate: passed on story branch.
- Branch workflow guard: passed after Phase-0 readiness artifact availability.
- ATDD outputs generated for MONO-E1 scope.

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

## Notes

- Generation mode selected: AI generation (ACs are clear; no browser recording required).
- Scope interpreted as epic-level ATDD package for `MONO-E1`.
