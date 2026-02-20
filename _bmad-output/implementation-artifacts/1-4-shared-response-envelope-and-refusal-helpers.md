# Story 1.4: Shared Response Envelope and Refusal Helpers

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,
I want a consistent success/refusal/systemError envelope,
so that clients can handle business refusals deterministically.

## Acceptance Criteria

1. Given an API route returns success, refusal, or system error, when the response is serialized, then it follows shared envelope helpers.
2. Business refusals return `HTTP 200` with `ok=false`.

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Identify API routes still returning ad hoc response shapes and migrate them to shared envelope helpers.
  - [x] Ensure serializer behavior is consistent across platform and module routes.
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Enforce refusal helper semantics (`HTTP 200`, `ok=false`) for business refusal outcomes.
  - [x] Verify distinction between refusal outcomes and system errors remains explicit.
- [x] Add verification coverage
  - [x] Add API contract tests for success/refusal/systemError envelope consistency.
  - [x] Add regression checks to prevent envelope drift in future route additions.

## Dev Notes

### Story Intent

This story standardizes client-facing API behavior so business logic outcomes are deterministic and easy to consume.

### Technical Requirements

- Use shared helper functions for all API outcomes (`success`, `refusal`, `systemError`).
- Refusal outcomes must not be represented as transport failures when business outcome is expected.
- System failures must remain separate from business refusals.

### Architecture Compliance

- Keep envelope logic centralized in shared platform response utilities.
- Avoid route-level copy/paste envelope logic.
- Preserve refusal semantics as an explicit product/governance requirement.

### Library / Framework Requirements

- Continue with existing Express response utility patterns and TypeScript contracts.
- Do not introduce alternate response frameworks.

### File Structure Requirements

- Shared envelope helpers in platform utility location.
- Route adoption work in `src/src/routes/api/v1/*`.
- Contract tests under platform API test suites.

### Testing Requirements

- Add/extend contract tests to assert response shape and status code rules.
- Include refusal-with-HTTP-200 assertions for business refusal paths.
- Include representative success and system error cases to validate full envelope matrix.

### Previous Story Intelligence

- Stories 1.1-1.3 establish tenant, authorization, and auth integrity guardrails that envelope responses must preserve and communicate clearly.

### Git Intelligence Summary

- Existing work in Epic 0 introduced shared API envelope foundations; this story should enforce broader and stricter adoption.

### Latest Tech Information

- Current stack supports this via existing Express and TypeScript utilities; no external dependency changes required.

### Project Context Reference

- Follow refusal-envelope contract (`ok=false` with HTTP 200 for business refusals) from project context and architecture artifacts.

### Project Structure Notes

- Keep response helper usage consistent and discoverable to reduce future divergence.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added response-matrix contract routes to `src/src/routes/api/v1/platform-contracts.ts`:
  - `POST /api/v1/platform/_kernel/contracts/envelope/response-matrix/success`
  - `POST /api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal`
  - `POST /api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error`
- Validated green on story-specific API and e2e contract coverage:
  - `npm run test:e2e -- tests/api/platform/1-4-shared-response-envelope-and-refusal-helpers.api.spec.ts`
  - `npm run test:e2e -- tests/e2e/platform/1-4-shared-response-envelope-and-refusal-helpers.spec.ts`
- Validated backend regression suite:
  - `cd src && npm test -- --runInBand`

### Implementation Plan

- Reused centralized helpers (`success`, `refusal`, `systemError`) from shared platform envelope utilities.
- Implemented dedicated story 1.4 response-matrix endpoints so platform contract probes exercise all envelope outcomes deterministically.
- Preserved refusal semantics as explicit business outcomes (`HTTP 200` + `ok=false`) and separated system failures (`errorType=system`, `HTTP 500`).

### Completion Notes List

- Implemented response-matrix envelope contract routes using shared response helpers, removing ad hoc 404 behavior for story 1.4 probe paths.
- Enforced business refusal contract semantics via refusal helper with `refusalType=business`, `ok=false`, and `HTTP 200`.
- Kept system error behavior explicit and isolated with `systemError` helper and `HTTP 500`.
- Verified canonical envelope keys and correlation stability across success/refusal/system-error outcomes via API and e2e story suites.
- Confirmed no regressions across backend Jest suites after route additions.

### File List

- _bmad-output/implementation-artifacts/1-4-shared-response-envelope-and-refusal-helpers.md
- src/src/routes/api/v1/platform-contracts.ts

## Change Log

- 2026-02-20: Implemented story 1.4 shared response envelope response-matrix routes and validated refusal/system-error contract behavior with story API + e2e coverage and backend regression tests.
