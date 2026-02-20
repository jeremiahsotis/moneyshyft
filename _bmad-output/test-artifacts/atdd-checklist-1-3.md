---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-02-20T02:14:31Z'
---

# ATDD Checklist - Story 1.3: First-Party Auth, Sessions, and CSRF Enforcement

**Date:** 2026-02-20T02:14:31Z  
**Author:** Jeremiah (executed by TEA agent)  
**Primary Test Level:** API

## Step 1: Preflight and Context

- Story file resolved: `_bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md`
- Policy gate and workflow guard:
  - `npm run policy:check` failed on protected default branch `codex/dev`
  - Auto-remediation executed: `npm run start:story-branch -- 1-3 first-party-auth-sessions-and-csrf-enforcement`
  - Re-check passed: `npm run policy:check`
  - Workflow guard passed: `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md`
- Framework detected: `playwright.config.ts` with `testDir: ./tests`
- Existing pattern review completed for auth/session/csrf API and E2E suites.
- TEA config flags:
  - `tea_use_playwright_utils: true`
  - `tea_browser_automation: auto`
- Knowledge fragments loaded:
  - Core: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`
  - Playwright Utils path: `overview`, `api-request`, `network-recorder`, `auth-session`, `intercept-network-call`, `recurse`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`
  - Browser automation mode `auto`: `playwright-cli`
  - Applied during subprocess generation: `fixture-architecture`, `network-first`, `api-testing-patterns`

## Step 2: Generation Mode

- Selected mode: **AI generation**.
- Rationale: acceptance criteria are explicit and already map to stable kernel auth/session/csrf contracts.

## Step 3: Test Strategy

### Acceptance Criteria to Scenario Mapping

1. AC1 (refresh rotation persistence and revocation support)
- API P0: refresh issue + rotate persists metadata and revokes prior session state
- API P0: replayed refresh token rejected deterministically
- E2E P0: operator login posture with refresh lifecycle contract

2. AC2 (state-changing routes fail without valid CSRF token)
- API P0: missing CSRF header fails with refusal code
- API P0: mismatched CSRF header/proof fails deterministically
- E2E P0/P1: app-origin journey rejects missing token and accepts valid token pair

3. Cookie security posture support
- API P1: parent-domain cookie policy evaluation for app/api topology

### Red-Phase Guarantees

- All generated tests use `test.skip()` intentionally.
- Assertions target expected behavior and refusal codes (no placeholder assertions).
- Coverage is API-first with focused E2E journey checks.

## Step 4: Aggregated Generation Outputs (RED)

### Test Files Created

- `tests/api/platform/1-3-first-party-auth-sessions-and-csrf-enforcement.atdd.api.spec.ts`
- `tests/e2e/platform/1-3-first-party-auth-sessions-and-csrf-enforcement.atdd.spec.ts`
- `tests/fixtures/test-data.ts` (reused shared fixture module)

### TDD Red-Phase Validation

- API tests include `test.skip()`: yes
- E2E tests include `test.skip()`: yes
- Placeholder assertions (`expect(true).toBe(true)`): none
- Expected-to-fail flags captured in subprocess artifacts: yes

### Subprocess Artifacts

- `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-02-20T02-14-31Z.json`
- `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-02-20T02-14-31Z.json`
- `_bmad-output/test-artifacts/tea-atdd-summary-2026-02-20T02-14-31Z.json`

### Coverage Summary

- Total tests: 8
- API tests: 5
- E2E tests: 3
- Fixture/helper files created: 1 (shared fixture reused)

## Step 5: Validation and Completion

### Checklist Validation Results

- Prerequisites satisfied: yes
- Story ACs parsed and mapped: yes
- Framework configuration present: yes
- Failing tests generated (red phase): yes
- CLI sessions cleanup needed: not applicable (no live CLI browser session opened)
- Temp artifacts persisted under `{test_artifacts}`: yes

### Key Assumptions / Risks

- Endpoint contracts and refusal codes are validated against current platform contract routes and may require alignment if implementation paths diverge.
- E2E assertions use current login-page role/label assumptions (`Log in`, `Dashboard`) and may need selector contract updates during implementation.
- This is strict red phase; tests remain intentionally skipped until dev begins green-phase implementation.

## Next Recommended Workflow

1. Implement story behavior for session rotation/revocation and CSRF middleware enforcement.
2. Remove `test.skip()` progressively per scenario.
3. Run focused verification:
- `npm run test:e2e -- tests/api/platform/1-3-first-party-auth-sessions-and-csrf-enforcement.atdd.api.spec.ts`
- `npm run test:e2e -- tests/e2e/platform/1-3-first-party-auth-sessions-and-csrf-enforcement.atdd.spec.ts`
4. After green phase, run `TA` to expand regression depth and fixtures.
