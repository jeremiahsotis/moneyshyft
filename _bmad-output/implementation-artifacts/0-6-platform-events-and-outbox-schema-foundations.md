# Story 0.6: Platform Events and Outbox Schema Foundations

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform architect,
I want canonical `platform.events` and `platform.outbox_events` schemas,
so that all write paths can emit integration-safe records..

## Acceptance Criteria

1. events and outbox tables exist with required lineage and delivery fields
2. indexes support operational and replay queries

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

- `cd src && npm test -- --runInBand src/src/migrations/__tests__/platformEventsOutboxMigration.test.ts` (RED: module not found before migration, then GREEN)
- `cd src && npm test -- --runInBand` (full backend regression suite)

### Completion Notes List

- Added migration `src/src/migrations/20260217113000_create_platform_events_and_outbox.ts` creating canonical `platform.events` and `platform.outbox_events` tables.
- Implemented required lineage fields on `platform.events`: `event_name`, `tenant_id`, `actor_id`, `entity_type`, `entity_id`, `occurred_at_utc`, and `payload`.
- Implemented required delivery + lineage fields on `platform.outbox_events`, including `delivery_status`, `delivery_attempts`, `available_at_utc`, `delivered_at_utc`, `last_delivery_error`, and immutable event linkage via `event_id`.
- Added operational/replay indexes for events and outbox polling/replay query patterns.
- Added automated migration contract coverage in `src/src/migrations/__tests__/platformEventsOutboxMigration.test.ts` for AC1 and AC2.
- Verified no regressions with full Jest suite: 13/13 suites passing, 41/41 tests passing.

### File List

- src/src/migrations/20260217113000_create_platform_events_and_outbox.ts
- src/src/migrations/__tests__/platformEventsOutboxMigration.test.ts
- _bmad-output/implementation-artifacts/0-6-platform-events-and-outbox-schema-foundations.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-02-17: Implemented Story 0.6 by adding canonical platform events/outbox migration with lineage+delivery fields, replay/operational indexes, and automated migration coverage; story moved to `review`.
