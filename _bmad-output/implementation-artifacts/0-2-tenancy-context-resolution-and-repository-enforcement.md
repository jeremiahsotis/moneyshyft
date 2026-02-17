# Story 0.2: Tenancy Context Resolution and Repository Enforcement

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want tenant resolution and mandatory tenant-scoped data access,
so that cross-tenant reads/writes cannot occur by omission..

## Acceptance Criteria

1. tenant context is present and required filters are applied
2. cross-tenant negative tests fail deterministically

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

- `npm test` (in `/Users/jeremiahotis/moneyshyft/src`) - pass, 7/7 suites, 19/19 tests

### Completion Notes List

- Added `/Users/jeremiahotis/moneyshyft/src/src/platform/tenancy/tenantScope.ts` to require non-public tenant context and apply mandatory tenant filters to repository-style query builders.
- Enforced tenant scoping in `/Users/jeremiahotis/moneyshyft/src/src/services/AccountService.ts` across read/update/delete/recalculate query paths so tenant filtering cannot be omitted.
- Added deterministic negative coverage for cross-tenant account access and tenant-filter assertions in account/transaction query paths.
- Added dedicated tenant scope unit tests to verify missing/public tenant context is rejected and required tenant filters are always injected.

### File List

- src/src/platform/tenancy/tenantScope.ts
- src/src/platform/tenancy/__tests__/tenantScope.test.ts
- src/src/services/AccountService.ts
- src/src/services/__tests__/AccountService.tenancy.test.ts

## Change Log

- 2026-02-17: Implemented tenant-scope enforcement helpers, applied mandatory tenant filters in AccountService, and added deterministic cross-tenant negative tests for Story 0.2.
