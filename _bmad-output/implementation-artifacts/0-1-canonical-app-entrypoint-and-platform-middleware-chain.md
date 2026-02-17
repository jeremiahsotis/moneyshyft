# Story 0.1: Canonical App Entrypoint and Platform Middleware Chain

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want one canonical app bootstrap with ordered platform middleware,
so that all modules inherit the same kernel guarantees..

## Acceptance Criteria

1. middleware order enforces correlation, tenancy resolution, auth context, and envelope handling
2. all module routes are mounted through shared route registration

## Tasks / Subtasks

- [x] Implement acceptance criterion 1 (AC: 1)
  - [x] Add automated coverage for AC 1
- [x] Implement acceptance criterion 2 (AC: 2)
  - [x] Add automated coverage for AC 2

## Dev Notes

- Phase-0 scope only. Do not introduce Route/Operations/Resource/POS module behavior in this story.
- Preserve monolith kernel constraints: tenancy, first-party auth, CSRF, refusal envelope, event/outbox, and timezone guarantees.
- Keep changes incremental and isolated for small PR sequencing in Epic 0.

### Project Structure Notes

- Platform kernel code paths should live under `src/platform`, shared API routing in `src/api`, and module code under `src/modules`.
- Maintain alias usage and shared entrypoint registration patterns from architecture and roadmap constraints.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epic-0-phase-0-kernel-story-set.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
- /Users/jeremiahotis/moneyshyft/ROADMAP.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added canonical middleware chain and route registry.
- Added Story 0.1 kernel entrypoint tests.
- Verified targeted and full backend test runs pass.

### Implementation Plan

- Introduce canonical platform middleware chain for correlation, tenancy resolution, auth context derivation, and response envelope bootstrapping.
- Centralize v1 route mounting into one shared registry + registration function.
- Keep existing route behavior unchanged by lazily loading route modules only during app bootstrap.
- Validate ACs with automated tests for middleware ordering and centralized route registration coverage.

### Completion Notes List

- AC1 complete: app bootstrap now applies ordered platform middleware via `registerPlatformMiddleware` with sequence `correlation -> tenancy -> auth-context -> response-envelope`.
- AC2 complete: v1 modules are mounted through one shared registration function `registerV1Routes` backed by a single `V1_ROUTE_REGISTRATIONS` registry.
- Added automated coverage in `src/src/__tests__/app-entrypoint-kernel.test.ts`.
- Validation passed:
  - `npm test -- app-entrypoint-kernel.test.ts`
  - `npm test`

### File List

- src/src/app.ts
- src/src/api/registerRoutes.ts
- src/src/platform/middleware/requestCorrelation.ts
- src/src/platform/middleware/tenancyContext.ts
- src/src/platform/middleware/authContext.ts
- src/src/platform/middleware/responseEnvelope.ts
- src/src/types/express.d.ts
- src/src/__tests__/app-entrypoint-kernel.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-02-17: Implemented canonical app middleware chain and centralized route registration for Story 0.1; added automated AC coverage and verified full backend regression suite.
