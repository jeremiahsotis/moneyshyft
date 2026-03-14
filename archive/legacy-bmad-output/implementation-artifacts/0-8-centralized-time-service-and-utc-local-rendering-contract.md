# Story 0.8: Centralized Time Service and UTC/Local Rendering Contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product operator,
I want a unified date-time pipeline,
so that users/admin always see local timezone while storage remains UTC..

## Acceptance Criteria

1. UTC storage and local display are enforced with fallback (`user -> tenant -> system`)
2. contract tests confirm raw UTC is not displayed in operational UI responses

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

- Added centralized time resolution + UTC->local formatter in `src/src/platform/time/timezoneService.ts`.
- Added platform contract endpoints in `src/src/routes/api/v1/platform-contracts.ts`:
  - `GET /api/v1/platform/time/render-context`
  - `POST /api/v1/platform/time/render-contract`
  - `GET /api/v1/platform/operations/feed`
- Added contract/integration tests in `src/src/__tests__/centralizedTimeServiceContract.test.ts`.
- Added unit coverage in `src/src/platform/time/__tests__/timezoneService.test.ts`.
- Applied review follow-up fixes: strict UTC ISO validation, render-contract UTC redaction, and operations-feed invalid-timestamp refusal handling.
- Applied follow-up reconciliation fixes (2026-02-19): removed top-level `utcTimestamp` from `/time/render-contract` and added root-level UTC omission assertion in contract tests.
- Regression run: `cd src && npm test` (pass).

### Completion Notes List

- Enforced timezone fallback order `user -> tenant -> system` with IANA timezone validation.
- Implemented UTC-to-local render contract endpoint using centralized formatter and refusal envelope for invalid context/timestamp paths.
- Implemented operational feed payload contract that only returns localized display values (`occurredAtLocal`) and excludes raw UTC fields from UI-oriented rows.
- Added automated AC coverage:
  - AC1 covered by fallback/resolve tests in `src/src/__tests__/centralizedTimeServiceContract.test.ts` and `src/src/platform/time/__tests__/timezoneService.test.ts`.
  - AC2 covered by operations-feed and render-contract assertions that raw UTC fields are omitted at both `data` and top-level response shapes, plus refusal-path coverage for unresolved context and invalid timestamp input.
- Reconciled story/review drift by replacing stale "resolved" claims with verified 2026-02-19 follow-up evidence and git/workspace notes.
- Full backend Jest suite passes after changes.

### Implementation Plan

- Keep the change kernel-scoped and isolated in existing platform contracts route.
- Centralize timezone validation, fallback resolution, and formatting in a single platform service.
- Enforce refusal envelope for unresolved timezone context to preserve shared API contract semantics.
- Validate behavior with both unit-level and route contract coverage.

### File List

- `src/src/platform/time/timezoneService.ts`
- `src/src/platform/time/__tests__/timezoneService.test.ts`
- `src/src/routes/api/v1/platform-contracts.ts`
- `src/src/__tests__/centralizedTimeServiceContract.test.ts`
- `_bmad-output/implementation-artifacts/0-8-centralized-time-service-and-utc-local-rendering-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-02-18: Implemented centralized timezone fallback/formatting service, added platform time endpoints and operational feed UTC-redaction contract behavior, and added automated AC1/AC2 backend coverage.
- 2026-02-18: Senior Developer Review (AI) completed; status moved to in-progress due to unresolved HIGH/MEDIUM findings.
- 2026-02-18: Resolved all 4 review findings (UTC redaction, strict UTC validation, invalid timestamp contract tests, and feed null-guard refusal path) and reconciled story/git tracking.
- 2026-02-19: Reopened code review found 4 discrepancies (UTC leak regression, missing root-level UTC assertion, stale review narrative, and git/story mismatch context); all fixed, story status moved to done, and sprint tracker synced.

## Senior Developer Review (AI)

Reviewer: Jeremiah  
Date: 2026-02-19  
Outcome: Resolved

### Scope Reviewed

- `src/src/platform/time/timezoneService.ts`
- `src/src/platform/time/__tests__/timezoneService.test.ts`
- `src/src/routes/api/v1/platform-contracts.ts`
- `src/src/__tests__/centralizedTimeServiceContract.test.ts`

### Git vs Story

- Workspace currently contains unrelated in-flight changes for Story 0.3, so full `git diff --name-only` is not Story 0.8-isolated.
- Story 0.8 follow-up fixes in this pass are present in:
  - `src/src/routes/api/v1/platform-contracts.ts`
  - `src/src/__tests__/centralizedTimeServiceContract.test.ts`
  - `_bmad-output/implementation-artifacts/0-8-centralized-time-service-and-utc-local-rendering-contract.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story File List remains the canonical set of implementation artifacts for Story 0.8 across the full story lifecycle.

### Findings (Resolved)

#### HIGH (Resolved)

1. Raw UTC leak regression in operational response:
   - `src/src/routes/api/v1/platform-contracts.ts` returned top-level `utcTimestamp` in `/time/render-contract`.
   - Fix: removed top-level raw UTC from success payload; only localized render context remains.

2. AC2 test gap allowed regression:
   - `src/src/__tests__/centralizedTimeServiceContract.test.ts` asserted UTC omission only under `response.body.data`.
   - Fix: added assertion that root payload also omits `utcTimestamp`.

#### MEDIUM (Resolved)

1. Story review narrative drift:
   - Story claimed UTC-redaction fix was resolved while code still exposed top-level UTC.
   - Fix: updated review section to match verified implementation state and 2026-02-19 remediation.

2. Git/story discrepancy context missing:
   - Prior review text claimed file-list alignment without acknowledging unrelated active workspace diffs.
   - Fix: Git-vs-Story section now distinguishes Story 0.8 files from unrelated in-flight workspace changes.

### Resolution Update (2026-02-19)

- Removed top-level raw `utcTimestamp` from `/time/render-contract` success payload.
- Added root-level response assertion to prevent UTC leakage regressions in AC2 contract tests.
- Updated story review narrative and git/workspace reconciliation notes to reflect actual current repository state.
- No open HIGH or MEDIUM findings remain for Story 0.8.

### Validation Evidence

- Backend test run executed: `cd src && npm test -- --runTestsByPath src/__tests__/centralizedTimeServiceContract.test.ts src/platform/time/__tests__/timezoneService.test.ts`
- Result: 2 passed suites; 15 passed tests.
- Backend full regression run executed: `cd src && npm test`
- Result: 23 passed suites, 1 skipped; 95 passed tests, 2 skipped.
