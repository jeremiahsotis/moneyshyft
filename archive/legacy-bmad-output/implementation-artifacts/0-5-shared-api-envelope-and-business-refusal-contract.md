# Story 0.5: Shared API Envelope and Business Refusal Contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a [role],
I want [action],
so that [benefit].

## Acceptance Criteria

1. they use shared envelope helpers
2. business refusals return HTTP 200 with `ok=false` and structured code/message

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

- `cd src && npm test -- --runInBand src/__tests__/apiEnvelopeContract.test.ts` (RED/GREEN cycle for AC1 and AC2)
- `cd src && npm test -- --runInBand` (full regression suite)

### Completion Notes List

- Added shared success envelope helper in `src/src/platform/envelopes/response.ts` and wired it through `POST /api/v1/platform/_kernel/contracts/envelope/success`.
- Added AC1 contract coverage in `src/src/__tests__/apiEnvelopeContract.test.ts`.
- Updated shared route registry and middleware-chain registration test expectations for `/api/v1/platform`.
- Added shared `refusal(...)` envelope helper with fixed business contract semantics (`HTTP 200`, `ok=false`, `code`, `message`, `refusalType`).
- Added `POST /api/v1/platform/_kernel/contracts/envelope/business-refusal` contract route and AC2 coverage.
- Added shared `systemError(...)` helper and contract endpoint `POST /api/v1/platform/_kernel/contracts/envelope/system-error`.
- Added API response normalization in `responseEnvelope` middleware so `/api/*` platform and module endpoints serialize through shared envelope builders.
- Added module route contract coverage (`/api/v1/auth/logout` success, `/api/v1/auth/refresh` refusal) in `apiEnvelopeContract` tests.
- Reconciled story documentation with implementation commit history and current changes.

### File List

- src/jest.config.js
- src/src/platform/envelopes/response.ts
- src/src/platform/middleware/responseEnvelope.ts
- src/src/routes/api/v1/platform-contracts.ts
- src/src/api/registerRoutes.ts
- src/src/__tests__/apiEnvelopeContract.test.ts
- src/src/__tests__/app-entrypoint-kernel.test.ts
- _bmad-output/implementation-artifacts/0-5-shared-api-envelope-and-business-refusal-contract.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

### Reviewer

- Jeremiah (AI-assisted review)

### Findings

- Resolved prior review findings:
  - AC1 now enforced for `/api/*` endpoints through shared envelope serialization.
  - Shared `systemError` helper now implemented and contract-tested.
  - Test suite now includes module endpoint serialization coverage.
  - Story File List now includes missing implementation file (`src/jest.config.js`) and current envelope middleware changes.
- AC1 and AC2 are implemented and covered by executable tests:
  - `src/src/__tests__/apiEnvelopeContract.test.ts`
  - `src/src/__tests__/app-entrypoint-kernel.test.ts`
- Story File List has been reconciled against story implementation commits and current git changes.

## Change Log

- 2026-02-17: Implemented Story 0.5 shared success/refusal envelope helpers and contract endpoints with automated test coverage.
- 2026-02-17: Senior developer review completed; no blocking issues found. Story moved to `done` and sprint tracking synced.
- 2026-02-17: Addressed review findings by adding `systemError`, API-wide envelope serialization for `/api/*`, expanded module route contract tests, and reconciled story/git documentation.
