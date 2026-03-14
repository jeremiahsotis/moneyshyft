# Story 6.2: Bridge Completion Endpoint and Idempotency

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As WP integration clients,
I want completion submissions to be idempotent and traceable,
so that completion state remains consistent under retries.

## Acceptance Criteria

1. Given completion payloads arrive from bridge, when duplicates or retries occur, then final state is consistent and no duplicate side effects occur.
2. Bridge lineage identifiers remain intact.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: n/a
- Operability Pairing Notes: Completion bridge behavior is contract-tested for idempotent retries and lineage consistency.
- Real-User Validation Evidence: Route bridge completion tests validate apply + replay paths, required idempotency keys, and lineage mismatch refusal behavior.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control administration behavior is in scope.

## Tasks / Subtasks

- [x] Implement completion bridge endpoint (AC: 1, 2)
  - [x] Register `/api/v1/route-bridge/fulfillment/:commitmentId/completion`.
  - [x] Require idempotency key and bridge lineage identifier.
- [x] Enforce idempotent replay semantics (AC: 1)
  - [x] Return replay acknowledgement on duplicate completion retry.
  - [x] Avoid duplicate completion transition side effects.
- [x] Enforce lineage consistency (AC: 2)
  - [x] Refuse completion when bridge lineage does not match commitment lineage.
- [x] Add completion contract tests (AC: 1, 2)
  - [x] Apply path, replay path, lineage mismatch path, required idempotency path.

## Dev Notes

### Story Intent

Ensure WP bridge completion writes are idempotent and lineage-safe under retries while preserving monolith lifecycle authority.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git show --name-only --pretty=format:'%H%n%s%n%b' 871271e` (pass)
- `npm --prefix apps/routeshyft-api test -- src/routes/api/v1/__tests__/route.bridge.test.ts` (pass)
- `npm run story:status:set -- --story-key 6-2-bridge-completion-endpoint-and-idempotency --status ready-for-dev` (pass)
- `npm run story:status:set -- --story-key 6-2-bridge-completion-endpoint-and-idempotency --status in-progress` (pass)
- `npm run story:status:set -- --story-key 6-2-bridge-completion-endpoint-and-idempotency --status review` (pass)
- `npm run story:status:set -- --story-key 6-2-bridge-completion-endpoint-and-idempotency --status done` (pass)

### Completion Notes List

- Added idempotent bridge completion endpoint with required idempotency and lineage inputs.
- Added replay-safe completion response semantics for duplicate retries.
- Added lineage mismatch refusal logic to block wrong-lineage completion attempts.
- Extended route bridge contract tests to cover completion apply/replay/refusal scenarios.

### File List

- _bmad-output/implementation-artifacts/6-2-bridge-completion-endpoint-and-idempotency.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/routeshyft-api/src/routes/api/v1/__tests__/route.bridge.test.ts
- apps/routeshyft-api/src/routes/api/v1/route-bridge.ts

## Change Log

- 2026-03-05: Story artifact backfilled to align sprint tracking with merged implementation for Story 6.2.
