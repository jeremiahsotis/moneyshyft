# Story 0.4: CSRF and Parent-Domain Cookie Enforcement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security engineer,
I want CSRF and cookie policy enforced for `app.*` / `api.*` topology,
so that state-changing routes are protected across domain boundaries..

## Acceptance Criteria

1. request is rejected
2. cookie flags/domain/same-site behavior follows environment-safe policy matrix

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

- Added platform middleware `csrfProtection` to reject unsafe authenticated requests when double-submit CSRF token is missing or invalid.
- Updated auth cookie utilities to enforce environment-safe cookie policy matrix (dev vs prod parent-domain) and issue/clear CSRF token cookie.
- Wired CSRF middleware in canonical app entrypoint after platform middleware registration and before route registration.

### Completion Notes List

- ✅ AC1 complete: state-changing authenticated requests are rejected with `403` when `x-csrf-token` is missing/invalid, while safe methods are unaffected.
- ✅ AC2 complete: cookie matrix now enforces dev (`secure=false`, `sameSite=lax`, no domain) and prod (`secure=true`, `sameSite=none`, parent-domain via `COOKIE_DOMAIN`) with consistent auth and CSRF cookie behavior.
- ✅ Frontend API client now auto-sends `X-CSRF-Token` from `csrf_token` cookie for non-safe methods, including refresh/mutation calls.
- ✅ Auth cookie clearing now uses the same env-aware policy attributes/domain as cookie issuance to ensure reliable logout in parent-domain production deployments.
- ✅ Canonical middleware order now logs requests before CSRF rejection, preserving visibility for blocked state-changing requests.
- ✅ Added automated coverage:
  - `src/src/platform/middleware/__tests__/csrfProtection.test.ts`
  - `src/src/utils/__tests__/jwt.cookiePolicy.test.ts`
- ✅ Added app-chain integration coverage in `src/src/__tests__/app-entrypoint-kernel.test.ts` for CSRF enforcement in canonical middleware order.
- ✅ Full backend regression suite passed: `cd src && npm test -- --runInBand` (34 tests, 11 suites).

### File List

- src/src/platform/middleware/csrfProtection.ts
- src/src/platform/middleware/__tests__/csrfProtection.test.ts
- src/src/utils/jwt.ts
- src/src/utils/__tests__/jwt.cookiePolicy.test.ts
- src/src/__tests__/app-entrypoint-kernel.test.ts
- src/src/app.ts
- frontend/src/services/api.ts
- _bmad-output/implementation-artifacts/0-4-csrf-and-parent-domain-cookie-enforcement.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-02-17: Implemented CSRF double-submit enforcement for authenticated unsafe methods and added parent-domain cookie policy matrix with automated tests; story moved to `review`.
- 2026-02-17: Code review fixes applied for CSRF header propagation, middleware logging order, cookie-clear policy parity, and app-chain coverage; story moved to `done`.
