# Story 0.10: Kernel Readiness Verification Suite

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release manager,
I want explicit kernel hardening checks,
so that Phase 1 Route work starts only when kernel controls are proven..

## Acceptance Criteria

1. tenancy/auth/csrf/envelope/event-outbox/timezone gates all pass
2. readiness status is recorded as Phase-0 complete before Route story execution

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

- `cd src && npm run build`
- `bash scripts/quality-gates-epic0.sh`
- `API_URL=http://localhost:3001 npm run test:e2e -- tests/api/platform/kernel-readiness-verification-suite.api.spec.ts tests/e2e/platform/kernel-readiness-verification-suite.spec.ts`
- `API_URL=http://localhost:3001 npm run test:e2e -- tests/api/platform/ci-policy-gate-as-blocking-first-stage.api.spec.ts tests/e2e/platform/ci-policy-gate-as-blocking-first-stage.spec.ts`

### Completion Notes List

- Added kernel readiness verification API contract at `POST /api/v1/platform/_kernel/readiness/verify` with canonical gate validation, pass/fail matrix, refusal handling, and readiness artifact output.
- Added Phase-0 readiness recording API contract at `POST /api/v1/platform/_kernel/readiness/record-phase0-complete` with idempotent persistence and route-execution eligibility response semantics.
- Enhanced `scripts/quality-gates-epic0.sh` to emit `phase0_readiness` gate evidence (`required_gates`, `all_passed`, ordered `gate_results`) with optional report-path override.
- Enhanced `scripts/branch-ensure-workflow.sh` to block post-Phase-0 story workflow execution until Phase-0 readiness is recorded, with explicit remediation commands.
- Activated Story 0.10 API + E2E readiness suites and isolated readiness artifacts per test context for stable parallel execution.
- Validated no regression in Story 0.9 policy/branch-guard suites after readiness guard changes.
- Updated sprint tracking status for `0-10-kernel-readiness-verification-suite` to `review` in `sprint-status.yaml`.

### File List

- src/src/routes/api/v1/platform-contracts.ts
- scripts/quality-gates-epic0.sh
- scripts/branch-ensure-workflow.sh
- tests/support/factories/kernelReadinessContextFactory.ts
- tests/api/platform/kernel-readiness-verification-suite.api.spec.ts
- tests/e2e/platform/kernel-readiness-verification-suite.spec.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-02-18: Implemented kernel readiness verification + Phase-0 readiness recording contracts, release-gate script enforcement, and full AC coverage tests for Story 0.10.
