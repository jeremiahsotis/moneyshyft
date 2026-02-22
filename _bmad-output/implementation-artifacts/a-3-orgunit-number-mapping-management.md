# Story a.3: OrgUnit Number Mapping Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit administrator,
I want to manage multiple Twilio numbers per orgUnit with tenant-safe uniqueness rules,
so that inbound routing is deterministic and operationally maintainable.

## Acceptance Criteria

1. Given an orgUnit admin creates or updates number mappings, when they save valid Twilio E.164 numbers, then multiple mappings per orgUnit are supported.
2. Given a duplicate `(tenant_id, twilio_number_e164)` mapping attempt, when validation runs, then the operation is blocked with actionable validation feedback.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Admin UI and API validation rules must mirror each other for number uniqueness and formatting errors.
- Real-User Validation Evidence: Admin flow validation of add/update/duplicate number scenarios.
- Real-User Validation Result: pending
- Role-Admin UI Path: OrgUnit admin number-mapping screen and API path are both required.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement number mapping create/update paths for multiple orgUnit numbers (AC: 1)
  - [ ] Support multiple mapped numbers per orgUnit.
  - [ ] Validate Twilio E.164 format before persistence.
- [ ] Enforce tenant-safe uniqueness constraints (AC: 2)
  - [ ] Enforce uniqueness for `(tenant_id, twilio_number_e164)` at persistence and service layers.
  - [ ] Return deterministic validation/refusal payloads on duplicate collisions.
- [ ] Deliver admin UX + API parity and tests (AC: 1, 2)
  - [ ] Add API tests for valid create/update and duplicate failure paths.
  - [ ] Add UI tests for error feedback and deterministic state after validation failures.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-025, FR-CS-026.
- Inbound routing relies on deterministic number-to-context mapping correctness.
- This story depends on a.1 and a.2 context/guardrails.

### Architecture Compliance

- Keep number mapping data under ConnectShyft schema and service boundaries.
- Preserve strict tenant isolation for all mapping queries and mutations.

### File Structure Requirements

- Backend number mapping modules/services/routes: `src/src/modules/connectshyft/` and `src/src/routes/api/v1/`.
- Frontend admin management UI: `frontend/src/`.
- Tests: `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Validate multi-number orgUnit support with deterministic read-back behavior.
- Validate duplicate detection and stable error messaging.
- Validate tenant-boundary isolation on number mapping operations.

### Project Structure Notes

- Keep mapping operations additive and migration-safe.
- Reuse shared refusal envelope semantics; avoid custom ad hoc error shapes.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic a, Story a.3)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (Number mapping and deterministic context routing)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Screen D: Numbers & OrgUnit Config)
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context creation only; implementation logs pending.

### Completion Notes List

- Created ConnectShyft Epic A context for orgUnit number mapping, uniqueness constraints, and admin UX/API parity.

### File List

- _bmad-output/implementation-artifacts/a-3-orgunit-number-mapping-management.md
