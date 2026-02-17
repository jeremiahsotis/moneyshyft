# Story 0.6: Platform Events and Outbox Schema Foundations

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform architect,
I want canonical `platform.events` and `platform.outbox_events` schemas,
so that all write paths can emit integration-safe records..

## Acceptance Criteria

1. events and outbox tables exist with required lineage and delivery fields
2. indexes support operational and replay queries

## Tasks / Subtasks

- [ ] Implement acceptance criterion 1 (AC: 1)
  - [ ] Add automated coverage for AC 1
- [ ] Implement acceptance criterion 2 (AC: 2)
  - [ ] Add automated coverage for AC 2

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

-

### Completion Notes List

-

### File List

-
