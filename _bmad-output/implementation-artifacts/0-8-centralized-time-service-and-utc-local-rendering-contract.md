# Story 0.8: Centralized Time Service and UTC/Local Rendering Contract

Status: review

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
- Regression run: `cd src && npm test` (pass).

### Completion Notes List

- Enforced timezone fallback order `user -> tenant -> system` with IANA timezone validation.
- Implemented UTC-to-local render contract endpoint using centralized formatter and refusal envelope for invalid context/timestamp paths.
- Implemented operational feed payload contract that only returns localized display values (`occurredAtLocal`) and excludes raw UTC fields from UI-oriented rows.
- Added automated AC coverage:
  - AC1 covered by fallback/resolve tests in `src/src/__tests__/centralizedTimeServiceContract.test.ts` and `src/src/platform/time/__tests__/timezoneService.test.ts`.
  - AC2 covered by operations-feed contract assertion that raw UTC fields are omitted plus refusal-path coverage.
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
