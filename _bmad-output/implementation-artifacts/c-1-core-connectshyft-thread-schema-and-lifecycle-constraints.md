# Story c.1: Core ConnectShyft Thread Schema and Lifecycle Constraints

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want core ConnectShyft thread tables and indexes created with canonical constraints,
so that thread lifecycle behavior is enforced at the persistence layer.

## Acceptance Criteria

1. Given ConnectShyft lifecycle migrations are applied, when thread entities are created or updated, then canonical state enum `UNCLAIMED | CLAIMED | CLOSED` and required metadata fields are present.
2. Given lifecycle persistence is active, when thread rows are inserted or changed, then partial unique constraint and scheduler indexes enforce one active thread per `(tenant_id, org_unit_id, neighbor_id)` with performant due-thread scans.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: no
- Frontend/Operator Usability Criteria Included: no
- Operability Pairing Notes: Data integrity of thread lifecycle state is a precondition for all inbox/operator behavior.
- Real-User Validation Evidence: Pending implementation. Validate schema and index behavior under realistic write concurrency.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Schema foundation story; no role administration surface introduced.

## Tasks / Subtasks

- [x] Implement core thread schema migration in ConnectShyft namespace (AC: 1, 2)
  - [x] Create/align `connectshyft.cs_threads` with canonical state, tenant/orgUnit scope, escalation fields, and number metadata columns.
  - [x] Keep migration additive-first and aligned with existing naming conventions.
- [x] Enforce active-thread identity and due-thread scan indexes (AC: 2)
  - [x] Add partial unique active-thread index for `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.
  - [x] Add scheduler index on due-evaluation access pattern.
- [x] Wire model/repository defaults to schema constraints (AC: 1)
  - [x] Ensure state transitions and nullable lifecycle fields align with database contract.
  - [x] Ensure writes use UTC timestamps and centralized time service patterns.
- [x] Add migration and repository validation coverage (AC: 1, 2)
  - [x] Add integration tests proving single-active-thread constraint under conflict scenarios.
  - [x] Add test coverage for index-backed due-thread query plan assumptions.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-011, FR-CS-013, FR-CS-017.
- NFR alignment: NFR-CS-006, NFR-CS-008, NFR-CS-009.
- This is the root Epic C dependency for `c.2` and all downstream lifecycle stories.
- Required `cs_threads` fields include lifecycle ownership, escalation tracking, and number metadata used by read/outbound flows.

### Architecture Compliance

- AD-02 defines canonical thread states and lifecycle semantics.
- AD-03 defines single-active-thread identity and ensure behavior foundation.
- AD-07 requires ConnectShyft schema namespace (`connectshyft`) and `cs_*` naming.
- Keep bounded-context isolation (no RouteShyft cross-imports).

### Library / Framework Requirements

- Use Knex migrations and repository patterns already used in `src/src/migrations` and ConnectShyft module services.
- Reuse shared time/transaction primitives; avoid introducing story-local persistence helpers.

### File Structure Requirements

- Migration files in `src/src/migrations/` with ordered numeric prefixes.
- Module persistence logic in `src/src/modules/connectshyft/`.
- Route wiring only if required to expose readiness checks; no unnecessary API surface.
- Tests in `tests/api/platform/` or backend integration suites aligned with current project conventions.

### Testing Requirements

- Verify canonical enum/state validation paths at persistence boundary.
- Verify duplicate active-thread insert attempts are prevented by constraint.
- Verify due-thread scan queries can target `next_evaluation_at_utc` with deterministic ordering.
- Include regression checks that existing tenant/orgUnit isolation assumptions remain intact.

### Previous Story Intelligence

- `b.1` and `b.2` established tenant-scoped identity conventions; keep thread schema aligned to those tenancy constraints.
- `a.2` and `a.5` enforce context and envelope rigor that downstream thread APIs must continue to honor.

### Git Intelligence Summary

- Recent story artifacts and platform policy work emphasize deterministic contracts and refusal-safe behavior; schema must make invalid lifecycle states impossible.

### Latest Technical Information

- Follow repository-pinned stack and architecture decisions already locked for ConnectShyft implementation.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep thread schema and indexes localized to ConnectShyft bounded context.
- Preserve compatibility with existing additive migration strategy and production deployment constraints.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-1-core-connectshyft-thread-schema-and-lifecycle-constraints`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.1)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-02, AD-03, AD-07, section 4.3/4.4)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-011, FR-CS-013, FR-CS-017)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story c-1-core-connectshyft-thread-schema-and-lifecycle-constraints`
- `cd src && npm test -- src/migrations/__tests__/connectShyftThreadsMigration.test.ts src/modules/connectshyft/__tests__/threads.test.ts`
- `cd src && npm test`
- `cd src && npm run build`

### Completion Notes List

- Added `connectshyft.cs_threads` migration with canonical lifecycle constraints, escalation metadata, additive-first column alignment, and due-thread/active-thread indexes.
- Implemented `src/src/modules/connectshyft/threads.ts` with in-memory and Knex stores, conflict-safe active-thread ensure behavior, lifecycle transitions, and deterministic due-thread reads.
- Wired `POST /api/v1/connectshyft/threads` to persisted thread ensure logic and added `GET /api/v1/connectshyft/internal/threads/due` for scheduler scans.
- Added repository/migration validation coverage for canonical state enforcement, single-active-thread behavior, lifecycle transition nullable fields, and due-ordering assumptions.
- Verified backend regression suite and TypeScript build pass after implementation.

### File List

- src/src/migrations/20260224170000_create_connectshyft_threads.ts
- src/src/migrations/__tests__/connectShyftThreadsMigration.test.ts
- src/src/modules/connectshyft/threads.ts
- src/src/modules/connectshyft/__tests__/threads.test.ts
- src/src/routes/api/v1/connectshyft.ts
- _bmad-output/implementation-artifacts/c-1-core-connectshyft-thread-schema-and-lifecycle-constraints.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml

## Change Log

- 2026-02-24: Created Story c.1 ready-for-dev context document.
- 2026-02-24: Implemented core ConnectShyft thread schema, lifecycle repository/service wiring, and C.1 migration/repository validation coverage; set story to review.
