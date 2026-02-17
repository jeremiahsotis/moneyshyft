# Story 0.3: Platform Session Store and Refresh Rotation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security engineer,
I want first-party session persistence with refresh rotation,
so that token lifecycle and revocation are auditable and safe..

## Acceptance Criteria

1. `platform.sessions` stores hashed refresh state, expiry, and revocation metadata
2. replayed/revoked refresh tokens are rejected

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

- `npm test -- PlatformSessionStore.test.ts`
- `npm test`
- `npm run build`

### Completion Notes List

- Added `platform.sessions` persistence with hashed refresh token state, expiry metadata, and revocation/rotation fields.
- Added `PlatformSessionStore` for refresh hash persistence, lookup, revocation, and atomic rotation behavior.
- Integrated session persistence into signup/login and refresh-token rotation plus logout revocation.
- Added automated tests for AC1 and AC2 in `PlatformSessionStore.test.ts`.
- Full backend Jest suite and TypeScript build pass.

### File List

- `src/src/migrations/20260217103000_create_platform_sessions.ts`
- `src/src/platform/sessions/PlatformSessionStore.ts`
- `src/src/platform/sessions/__tests__/PlatformSessionStore.test.ts`
- `src/src/services/AuthService.ts`
- `src/src/routes/api/v1/auth.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/0-3-platform-session-store-and-refresh-rotation.md`

## Change Log

- 2026-02-17: Implemented platform session store + refresh rotation and added automated AC coverage.
