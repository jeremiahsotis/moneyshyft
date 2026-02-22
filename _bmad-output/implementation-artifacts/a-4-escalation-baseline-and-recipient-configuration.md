# Story a.4: Escalation Baseline and Recipient Configuration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit administrator,
I want to configure escalation baseline `X` in integer hours and recipient targets,
so that unclaimed threads escalate to the correct recipients at defined intervals.

## Acceptance Criteria

1. Given an orgUnit admin updates escalation settings, when baseline and recipients are submitted, then configuration is persisted with required-recipient validation and valid integer-hour timings (`X` default 24, allowed 1-24).
2. Given invalid escalation recipient assignments or invalid timing values, when validation executes, then deterministic refusal messaging is returned and invalid settings are not persisted.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Admin controls must clearly show claim-only reset semantics and scheduler-impacting configuration values.
- Real-User Validation Evidence: Admin configuration flow plus scheduler-facing contract verification.
- Real-User Validation Result: pending
- Role-Admin UI Path: OrgUnit escalation configuration screen and endpoint path.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement escalation baseline and recipient configuration persistence (AC: 1)
  - [ ] Enforce integer-hour baseline with default 24 and bounds 1-24.
  - [ ] Persist recipient targets with required recipient validation.
- [ ] Enforce deterministic refusal behavior for invalid configuration (AC: 2)
  - [ ] Refuse invalid timing values or invalid/missing recipients.
  - [ ] Return shared refusal envelope semantics with stable policy reasons.
- [ ] Add integration and UX tests for config behavior (AC: 1, 2)
  - [ ] API tests for accepted and refused config updates.
  - [ ] UI tests for admin form validation, persistence confirmation, and error feedback.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-027.
- Escalation baseline `X` is integer-hour only (1-24), default 24.
- Configuration must be compatible with deterministic scheduler behavior in downstream thread lifecycle stories.

### Architecture Compliance

- Keep escalation config under orgUnit context and tenant boundaries.
- Preserve deterministic semantics and avoid in-memory configuration drift.

### File Structure Requirements

- Backend config services/routes: `src/src/modules/connectshyft/` and `src/src/routes/api/v1/`.
- Frontend orgUnit admin settings UI: `frontend/src/`.
- Tests: `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Verify integer range validation (below 1, above 24, non-integer values).
- Verify required recipient validation and persistence behavior.
- Verify refusal messages are deterministic and envelope-compliant.

### Project Structure Notes

- Keep story scope on configuration and validation only; do not implement escalation scheduler progression here.
- Preserve API and UI contract consistency for all validation outcomes.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic a, Story a.4)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (Escalation progression and config constraints)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Numbers & OrgUnit Config, escalation UX rules)
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context creation only; implementation logs pending.

### Completion Notes List

- Created ConnectShyft Epic A context for escalation baseline and recipient configuration with deterministic validation rules.

### File List

- _bmad-output/implementation-artifacts/a-4-escalation-baseline-and-recipient-configuration.md
