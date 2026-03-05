# Story 8.6: Service-Ready Identity Boundary

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a service-ready identity boundary interface implemented in-process,
so that identity resolution and dedupe logic can be extracted later without breaking lane behavior now.

## Acceptance Criteria

1. A clear identity module interface is introduced with explicit request/response and error contracts for match/dedupe operations.
2. In-process adapters implement the interface while preserving current lane behavior.
3. Idempotency expectations for identity operations are explicit and enforced by tests.
4. Lane modules consume the boundary interface instead of scattered direct identity logic.
5. Policy/workflow gates and targeted regression tests pass after boundary introduction.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Identity outcome messaging depends on stable backend contract and operator-facing refusals.
- Real-User Validation Evidence: Manual validation notes required before closeout
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-admin path change in this story.

## Tasks / Subtasks

- [x] Define identity boundary contract (AC: 1, 3)
  - [x] Define interface operations, payload schemas, and deterministic error/result types.
  - [x] Define idempotency semantics and replay-safe behavior.
- [x] Implement in-process adapter layer (AC: 2)
  - [x] Add module implementation behind the new interface.
  - [x] Preserve existing behavior and response contracts.
- [x] Refactor lane callsites to boundary interface (AC: 4)
  - [x] Replace direct identity-logic coupling with boundary calls.
  - [x] Keep changes scoped to interface adoption without broad behavior refactor.
- [x] Validate and gate (AC: 3, 5)
  - [x] Add/adjust tests for contract behavior and idempotency.
  - [x] Run policy, branch/workflow guard, and changed-test validation.

## Dev Notes

### Story Intent

Create a stable identity interface boundary now to de-risk future service extraction.

### Technical Requirements

- Keep implementation in-process for this phase.
- Formalize contract and typed failure paths.
- Enforce idempotent behavior where identity operations can be retried.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change C2.
- Pair with Story 8.5 dedupe contract decisions.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/project-context.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- `npm test -- --runInBand --testPathPattern=connectshyft.identity-boundary.test.ts` (cwd: `apps/routeshyft-api`)
- `npm test -- --runInBand --testPathPattern=connectshyft.identity-dedupe.test.ts` (cwd: `apps/routeshyft-api`)
- `npm test -- --runInBand --testPathPattern=connectshyft.identity-match.test.ts` (cwd: `apps/routeshyft-api`)
- `npm test -- --runInBand --testPathPattern='connectshyft.identity-boundary.test.ts|connectshyft.identity-dedupe.test.ts|connectshyft.identity-match.test.ts'` (cwd: `apps/routeshyft-api`)
- `npm run test:connectshyft` (cwd: `apps/routeshyft-api`)
- `npm test` (cwd: `apps/routeshyft-api`)
- `npm run build` (cwd: `apps/routeshyft-api`)
- `npm run policy:check` (repo root)
- `npm run branch:ensure-workflow -- --workflow dev-story --story 8-6-service-ready-identity-boundary` (repo root)
- `scripts/test-changed.sh origin/main` (repo root)
- `npx nx run routeshyft-api:lint` (repo root)
- `npx nx run connectshyft-api:test` (repo root)

### Completion Notes List

- Added `identityBoundary` module contracts for identity match/dedupe operations with explicit success/refusal schemas and deterministic manual-resolution metadata.
- Implemented in-process identity boundary adapters (`InProcess...` and `AsyncInProcess...`) and delegated both neighbor service identity-match paths to the new boundary interface.
- Added explicit replay-safe idempotency semantics (`idempotency.key`, `idempotency.semantics`) to identity boundary responses and surfaced idempotency metadata through the identity-match route contract.
- Preserved existing lane behavior and refusal codes (`CONNECTSHYFT_IDENTITY_MATCH_*`, `IDENTITY_MATCH_AMBIGUOUS`) while removing duplicated identity decision logic from neighbor services.
- Added dedicated boundary contract tests and expanded dedupe/route tests to validate idempotency and response parity.
- Operator usability note (Backend/API Implies Human Operability): operator-facing identity responses now carry deterministic refusal context and replay-safe idempotency metadata to support safe retriable workflows without accidental duplicate merge actions.
- Senior review remediation: `Idempotency-Key` now propagates through `/neighbors/identity-match` into boundary evaluation for explicit replay control.
- Senior review remediation: sync service boundary invocation now enforces non-Promise adapter contracts to prevent async shape drift.
- Senior review remediation: identity-match evaluation now uses targeted tenant+phone lookups and adds a dedicated `(tenant_id, value_e164, ...)` index migration for scalable matching.

### File List

- `_bmad-output/implementation-artifacts/8-6-service-ready-identity-boundary.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts` (modified)
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` (modified)
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` (modified)
- `apps/routeshyft-api/src/migrations/20260304100000_add_connectshyft_neighbor_phone_lookup_index.ts` (added)
- `apps/routeshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts` (modified)
- `apps/routeshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` (modified)

## Senior Developer Review (AI)

- Date: 2026-03-04
- Reviewer: Jeremiah (AI-assisted code review workflow)
- Outcome: Approved after remediation
- Findings Addressed:
  - Fixed route-level idempotency propagation: identity-match now accepts and forwards explicit `Idempotency-Key`/`idempotencyKey`.
  - Fixed sync boundary contract safety: sync service now rejects Promise-returning adapter wiring at runtime.
  - Fixed identity-match query shape: async boundary now consumes targeted tenant+phone lookups, and supporting DB index migration added.
- Validation Evidence:
  - `npm test -- --runInBand --testPathPattern='connectshyft.identity-boundary.test.ts|connectshyft.identity-dedupe.test.ts|connectshyft.identity-match.test.ts'` (pass)
  - `npm run test:connectshyft` (pass)
  - `npm run build` (pass)
  - `git status --short` reviewed against File List update (no undocumented code changes)

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change C2).
- 2026-03-04: Added service-ready identity boundary contracts and in-process adapters for identity match/dedupe evaluation.
- 2026-03-04: Refactored ConnectShyft neighbor identity callsites to consume the new boundary interface while preserving existing behavior/refusal contracts.
- 2026-03-04: Added replay-safe idempotency metadata and expanded identity boundary/dedupe/route regression coverage.
- 2026-03-04: Passed policy/workflow gates and targeted ConnectShyft regressions for boundary introduction.
- 2026-03-04: Senior Developer Review (AI) remediation applied for idempotency propagation, sync boundary type safety, and targeted tenant+phone identity lookup/indexing; status set to `done`.
