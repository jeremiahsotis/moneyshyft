# Story 6.3: Cutover Controls and Dual-Write Prevention

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As platform operators,
I want controlled migration toggles and validation checks,
so that WP storage is retired without split-brain state.

## Acceptance Criteria

1. Given cutover stages progress, when authority switches to monolith paths, then dual-write patterns are blocked.
2. Reconciliation checks confirm single-source-of-truth behavior.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Cutover controls require explicit operator-visible stage and reconciliation outcomes before production promotion.
- Real-User Validation Evidence: Route bridge API contract tests validate stage-gated write behavior, dual-write conflict blocking, idempotent replay behavior, and reconciliation drift reporting.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story governs cutover and state authority behavior, not access-control administration.

## Tasks / Subtasks

- [x] Implement cutover stage controls (AC: 1)
  - [x] Added explicit cutover state/toggles for WP bridge authority switching.
  - [x] Ensured authority stage is auditable and deterministic through bridge metadata.
- [x] Enforce dual-write prevention gates (AC: 1)
  - [x] Blocked disallowed bridge writes by stage and required `api_only` assertion for authoritative stage.
  - [x] Added fail-closed behavior for ambiguous/invalid stage configuration.
- [x] Implement reconciliation verification checks (AC: 2)
  - [x] Added duplicate source and lineage drift checks for bridge commitments.
  - [x] Added pass/drift contract signals for release readiness.
- [x] Add contract/regression tests (AC: 1, 2)
  - [x] Stage transition behavior.
  - [x] Dual-write block behavior.
  - [x] Reconciliation check behavior.

## Dev Notes

### Story Intent

Complete Epic 6 by introducing production-safe cutover controls that prevent split-brain state and prove monolith single-source authority.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_WP_to_Monolith_Cutover_Plan.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run story:status:set -- --story-key 6-3-cutover-controls-and-dual-write-prevention --status ready-for-dev` (pass)
- `npm run story:status:set -- --story-key 6-3-cutover-controls-and-dual-write-prevention --status in-progress` (pass)
- `npm run story:status:set -- --story-key 6-3-cutover-controls-and-dual-write-prevention --status review` (pass)
- `npm run story:status:set -- --story-key 6-3-cutover-controls-and-dual-write-prevention --status done` (pass)
- `npm run story:status:check` (pass)
- `npm --prefix apps/routeshyft-api test -- src/routes/api/v1/__tests__/route.bridge.test.ts` (pass)
- `npm --prefix apps/routeshyft-api run build` (pass)

### Completion Notes List

- Added env/test-header cutover stage resolution (`bridge`, `monolith_authoritative`, `read_only`) with fail-closed invalid-config behavior.
- Added stage-gated bridge write enforcement including required `api_only` assertion at authoritative stage.
- Added dual-write prevention checks to block sourceId/lineage remaps and return idempotent replay for safe duplicate submissions.
- Added `/api/v1/route-bridge/reconciliation` endpoint with duplicate source/lineage drift checks and single-source confirmation signal.
- Extended route bridge contract tests to cover stage gating, dual-write prevention, idempotent replay, and reconciliation outcomes.

### File List

- _bmad-output/implementation-artifacts/6-3-cutover-controls-and-dual-write-prevention.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/routeshyft-api/src/modules/route/application/commitmentService.ts
- apps/routeshyft-api/src/modules/route/infrastructure/commitmentRepository.ts
- apps/routeshyft-api/src/routes/api/v1/__tests__/route.bridge.test.ts
- apps/routeshyft-api/src/routes/api/v1/route-bridge.ts
- scripts/enforce-story-status-sync.sh

## Change Log

- 2026-03-05: Story artifact created for Epic 6.3 workflow tracking.
- 2026-03-05: Implemented cutover controls, dual-write prevention guards, reconciliation checks, and route bridge contract coverage for Story 6.3.
