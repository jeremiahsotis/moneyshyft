# Story b.3: Relationship-Gated Neighbor Edits with Provenance Audit

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit identity lead,
I want neighbor edits to require relationship-based permission and orgUnit provenance logging,
so that sensitive identity updates remain governed and auditable.

## Acceptance Criteria

1. Given a user attempts to edit a neighbor, when authorization is evaluated, then edits are permitted only for users with active-thread relationship in the current orgUnit or tenant-privileged roles.
2. Given an authorized neighbor edit succeeds, when audit/outbox records are written, then originating `org_unit_id` metadata is included with actor and mutation context.
3. Given a user lacks relationship or privileged access, when edit is attempted, then operation is refused with deterministic policy messaging and no data leakage.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Permission denials must map to refusal-style guidance in UI and must never silently fail.
- Real-User Validation Evidence: Executed operator-path validation via `npm run test:e2e -- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.api.spec.ts tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts` (result: 8 passed, 7 skipped).
- Real-User Validation Result: pass
- Role-Admin UI Path: Role assignment and membership paths are required to validate related-user and tenant-privileged access scenarios.
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement relationship-gated edit authorization (AC: 1, 3)
  - [x] Add neighbor-edit authorization utility using active thread relationship checks in current orgUnit.
  - [x] Allow tenant-privileged bypass only via capability-driven policy, not ad hoc role string checks.
- [x] Implement provenance-rich audit/outbox writes (AC: 2)
  - [x] Ensure edit mutation writes include `org_unit_id`, actor id, previous value summary, and updated value summary.
  - [x] Ensure audit/outbox writes are transactionally coupled to successful neighbor edit mutations.
- [x] Implement deterministic refusal and UI feedback paths (AC: 3)
  - [x] Return stable refusal code/message for unauthorized edit attempts.
  - [x] Surface actionable refusal copy in neighbor editing UI.
- [x] Add automated matrix coverage (AC: 1, 2, 3)
  - [x] API tests for related-user allow, tenant-privileged allow, and unrelated-user refusal.
  - [x] API tests validating provenance fields in audit/outbox records.
  - [x] E2E tests covering permission-gated edit interactions.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-008, FR-CS-008a.
- Story dependencies: `b.1` (neighbor identity exists) and `c.3` (thread/read contract alignment dependency) per sprint status map.
- Execution gate: do not start this story until `c-3-inbox-and-thread-detail-read-contracts` is `done` per sprint rule `no_story_starts_with_unmet_dependencies`.
- Treat this as a governance-critical access-control story.

### Architecture Compliance

- AD-04 mandates relationship-gated neighbor edits and originating orgUnit metadata in audit events.
- Keep authorization checks enforced at endpoint and service boundaries.
- Preserve deterministic envelope contracts and no-leak refusal semantics.

### Library / Framework Requirements

- Reuse capability helpers from `src/src/platform/rbac/capabilities.ts`.
- Reuse tenancy/orgUnit validation utilities from existing ConnectShyft context enforcement.
- Reuse existing mutation + audit/outbox patterns already used in platform contracts.

### File Structure Requirements

- Backend route/API updates in `src/src/routes/api/v1/connectshyft.ts`.
- Neighbor authorization/service logic under `src/src/modules/connectshyft/`.
- Audit/outbox integration where platform mutation wrapper patterns currently live.
- Tests in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Add permission matrix tests:
  - active-thread related user can edit in current orgUnit
  - tenant-privileged role can edit
  - unrelated orgUnit user refusal
- Validate audit/outbox payload includes originating `org_unit_id` and actor metadata.
- Regression run for context and envelope contract suites after edits.

### Previous Story Intelligence

- `b.1` and `b.2` define canonical identity payload shape; this story must not break tenant-shared identity consistency.
- `a.2` and `a.5` established context and capability enforcement patterns; apply same layering (route + service).

### Git Intelligence Summary

- Recent commits hardened envelope helper naming and policy/entitlement behavior; keep refusal/error paths aligned with normalized helpers.
- Avoid introducing path-specific custom response shapes that bypass shared envelope middleware.

### Latest Technical Information

- Follow currently pinned repository stack and policy-first implementation constraints; avoid speculative dependency upgrades during this story.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep neighbor-edit policy evaluation explicit and testable.
- Ensure cross-epic dependency with `c.3` is tracked in implementation notes and branch workflow guard usage.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story b-3-relationship-gated-neighbor-edits-with-provenance-audit`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic b, Story b.3)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-04, Authorization, Audit/Outbox constraints)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flow 5, permission-denial UX)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-008, FR-CS-008a)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --lane connectshyft --workflow dev-story --story b-3-relationship-gated-neighbor-edits-with-provenance-audit`
- `npm run test:e2e -- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.api.spec.ts tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.spec.ts tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts`
- `npm run story:status:set -- --lane connectshyft --story-file _bmad-output/implementation-artifacts/b-3-relationship-gated-neighbor-edits-with-provenance-audit.md --status in-progress`

### Completion Notes List

- Confirmed dependency gate clear (`c-3-inbox-and-thread-detail-read-contracts: done`) and resumed DS on story branch.
- Validated existing relationship-gated authorization path in `src/src/routes/api/v1/connectshyft.ts` including deterministic refusal semantics.
- Validated provenance payload shape (`audit` + `outbox`) includes originating `org_unit_id`, `actor_user_id`, and mutation context fields.
- Re-ran b.3 API/E2E coverage; suite result was `8 passed, 7 skipped` with no failures.
- Updated sprint tracking unblock metadata and restored queue artifact for lane-b execution continuity.

### File List

- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/neighbors.ts
- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.api.spec.ts
- tests/api/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.api.spec.ts
- tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.spec.ts
- tests/e2e/platform/b-3-relationship-gated-neighbor-edits-with-provenance-audit.atdd.spec.ts
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- _bmad-output/implementation-artifacts/next-unblocked-queue-connectshyft.md
- _bmad-output/implementation-artifacts/b-3-relationship-gated-neighbor-edits-with-provenance-audit.md

## Change Log

- 2026-02-24: Created Story b.3 ready-for-dev context document.
- 2026-02-26: Unblocked Story b.3 dependency gate, validated relationship-gated edit behavior and provenance coverage, and advanced story toward review.
