# Story a.4: Escalation Baseline and Recipient Configuration

Status: review

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

- [x] Implement escalation baseline and recipient configuration persistence (AC: 1)
  - [x] Enforce integer-hour baseline with default 24 and bounds 1-24.
  - [x] Persist recipient targets with required recipient validation.
- [x] Enforce deterministic refusal behavior for invalid configuration (AC: 2)
  - [x] Refuse invalid timing values or invalid/missing recipients.
  - [x] Return shared refusal envelope semantics with stable policy reasons.
- [x] Add integration and UX tests for config behavior (AC: 1, 2)
  - [x] API tests for accepted and refused config updates.
  - [x] UI tests for admin form validation, persistence confirmation, and error feedback.

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

- `cd src && npm test -- escalationConfig.test.ts` (pass, 7 tests)
- `cd src && npm test -- src/modules/connectshyft/__tests__` (pass, 4 suites / 32 tests)
- `npm run test:e2e -- tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.api.spec.ts tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.spec.ts` (pass, 10 tests)
- `npm run test:e2e -- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts` (pass, 9 tests regression)

### Completion Notes List

- Created ConnectShyft Epic A context for escalation baseline and recipient configuration with deterministic validation rules.
- Implemented orgUnit-scoped escalation configuration service with default baseline handling (`24`), integer-only + range validation (`1-24`), and deterministic refusal contracts.
- Added ConnectShyft escalation config endpoints (`GET`/`PUT` `/api/v1/connectshyft/escalation/config`) with capability enforcement and shared response-envelope semantics.
- Added ConnectShyft escalation settings frontend route/view and API client with deterministic validation/error UI states for baseline and recipient rules.
- Activated and passed story a.4 API and E2E automation coverage (removed `fixme` from executable suites).
- Added backend unit coverage for escalation config service persistence and validation non-mutation guarantees.

### File List

- _bmad-output/implementation-artifacts/a-4-escalation-baseline-and-recipient-configuration.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/escalationConfig.ts
- src/src/modules/connectshyft/__tests__/escalationConfig.test.ts
- src/src/routes/api/v1/connectshyft.ts
- frontend/src/features/connectshyft/escalation.ts
- frontend/src/views/ConnectShyft/ConnectShyftEscalationSettingsView.vue
- frontend/src/router/index.ts
- tests/api/platform/a-4-escalation-baseline-and-recipient-configuration.api.spec.ts
- tests/e2e/platform/a-4-escalation-baseline-and-recipient-configuration.spec.ts

### Change Log

- 2026-02-22: Implemented story a.4 end-to-end (backend escalation configuration service + routes, frontend escalation settings UI, and deterministic refusal handling).
- 2026-02-22: Added and passed backend unit tests plus Playwright API/E2E suites for accepted/invalid escalation configuration paths.
- 2026-02-22: Ran adjacent ConnectShyft a.3 API/E2E suites as regression validation after connectshyft route updates.
