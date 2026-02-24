# Story b.1: Tenant-Scoped Neighbor Creation with Required Phone

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit member,
I want to create neighbors with at least one phone number in tenant scope,
so that communications can be started with valid contact records.

## Acceptance Criteria

1. Given an authorized user submits neighbor data, when create neighbor is requested, then neighbor identity is stored tenant-scoped.
2. Given a create request omits phone entries, when validation executes, then the request is refused with deterministic refusal messaging.
3. Given a create request includes at least one valid phone entry, when persistence succeeds, then accepted records include normalized phone values and are returned via shared response envelope semantics.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Neighbor creation refusals must be actionable for operators (missing phone, invalid format, forbidden scope) without leaking tenant/orgUnit data.
- Real-User Validation Evidence: Pending implementation. Validate with API + E2E story suites before moving to `review`.
- Real-User Validation Result: pending
- Role-Admin UI Path: Tenant/orgUnit role assignment path is required to verify who can create neighbor records.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement tenant-scoped neighbor persistence contract (AC: 1, 3)
  - [ ] Add or confirm `connectshyft.cs_neighbors` + `connectshyft.cs_neighbor_phones` schema and repository methods with tenant scoping.
  - [ ] Normalize and validate phone entries before write; reject malformed entries.
- [ ] Implement create-neighbor API behavior (AC: 1, 2, 3)
  - [ ] Add `POST /api/v1/connectshyft/neighbors` handler using shared `success/refusal/systemError` envelope helpers.
  - [ ] Enforce explicit orgUnit context + capability checks before mutation.
- [ ] Add operator-facing create flow guardrails (AC: 2, 3)
  - [ ] Surface deterministic refusal reasons for missing phone and invalid format.
  - [ ] Confirm tenant/orgUnit scope is visible in UI during create flow.
- [ ] Add automated regression coverage (AC: 1, 2, 3)
  - [ ] API specs: authorized create, no-phone refusal, cross-tenant/orgUnit refusal.
  - [ ] E2E specs: create journey with valid phone and validation failure states.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-004, FR-CS-006, FR-CS-007.
- Story dependency: `a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes` (already done) must remain authoritative for scope validation.
- Preserve shared envelope response contract and deterministic refusal codes.

### Architecture Compliance

- Keep ConnectShyft bounded context isolation: no direct RouteShyft imports.
- Persist ConnectShyft data in schema `connectshyft` with `cs_*` table conventions.
- Use additive-first migrations and maintain policy gate compatibility.

### Library / Framework Requirements

- Reuse existing Express + TypeScript + Knex stack and shared envelope helpers in `src/src/platform/envelopes/response.ts`.
- Reuse role capability checks from `src/src/platform/rbac/capabilities.ts`; avoid ad hoc authorization logic.
- Prefer existing phone parsing/normalization utilities if available; avoid introducing a new dependency unless required.

### File Structure Requirements

- Backend route surface: `src/src/routes/api/v1/connectshyft.ts`.
- Backend module/service additions expected under `src/src/modules/connectshyft/` (e.g., neighbor service/repository).
- Schema/migration additions under `src/src/migrations/`.
- API and E2E tests under `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Add API specs for:
  - authorized create with valid phone list
  - refusal when no phone is supplied
  - refusal for cross-tenant or invalid orgUnit context
- Add E2E coverage for neighbor creation flow and deterministic validation messaging.
- Re-run Epic A ConnectShyft guardrails (at minimum `a-2` and `a-5` API suites) after route/module changes.

### Previous Story Intelligence

- `a.2` established context resolution and orgUnit membership enforcement. Reuse that middleware path; do not fork scope-validation logic.
- `a.5` hardened capability enforcement at endpoint and service boundaries. Mirror that pattern for neighbor mutations.

### Git Intelligence Summary

- Recent commits normalized envelope helper usage across platform/auth/admin routes; neighbor routes must use the same normalized error/refusal patterns.
- Recent CI hardening touched policy and entitlement paths; keep story tests compatible with current test-harness entitlement behavior.

### Latest Technical Information

- Implementation should follow repository-pinned stack versions and patterns already in use (Node/Express/TypeScript/Knex as defined in project context) to avoid compatibility drift.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep changes scoped to ConnectShyft module and shared platform helpers.
- Avoid broad refactors while adding neighbor-create capability.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story b-1-tenant-scoped-neighbor-creation-with-required-phone`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic b, Story b.1)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-04, Data Architecture, API Architecture, Authorization)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Neighbor profile governance, context visibility)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-004/006/007, tenancy and scope constraints)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story b.1 context with acceptance criteria, guardrails, task breakdown, and architecture/testing constraints.

### File List

- _bmad-output/implementation-artifacts/b-1-tenant-scoped-neighbor-creation-with-required-phone.md

## Change Log

- 2026-02-24: Created Story b.1 ready-for-dev context document.
