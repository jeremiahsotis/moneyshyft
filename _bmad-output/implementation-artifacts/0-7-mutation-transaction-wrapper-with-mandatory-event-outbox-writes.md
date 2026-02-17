# Story 0.7: Mutation Transaction Wrapper with Mandatory Event/Outbox Writes

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend developer,
I want a shared mutation execution wrapper,
so that handlers cannot persist state without corresponding event/outbox records..

## Acceptance Criteria

1. domain write + event + outbox are atomic
2. missing event/outbox writes fail contract tests

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

- Added `executePlatformMutation` wrapper under `src/src/platform/mutations` to enforce atomic mutation + event + outbox writes.
- Added contract tests with transactional rollback simulation and mandatory event/outbox contract validation.
- Validation run: `cd src && npm test` (14 suites, 45 tests passing).

### Completion Notes List

- Implemented shared mutation transaction wrapper that:
  - executes domain mutation logic inside a single transaction
  - writes `platform.events` and `platform.outbox_events` in that same transaction boundary
  - fails fast when mandatory event contract fields are missing
  - fails when event insert does not return an event id (prevents outbox orphaning)
- Added automated contract coverage for:
  - atomic commit across domain + event + outbox writes
  - rollback behavior when outbox write fails
  - contract failure for missing required event fields
  - contract failure when event id is unavailable
- Full backend regression suite is passing after changes.

### File List

- src/src/platform/mutations/executePlatformMutation.ts
- src/src/platform/mutations/__tests__/executePlatformMutation.test.ts

## Change Log

- 2026-02-17: Added shared mutation transaction wrapper with mandatory platform event/outbox writes and AC1/AC2 contract coverage.
