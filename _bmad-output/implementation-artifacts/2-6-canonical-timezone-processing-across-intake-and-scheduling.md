# Story 2.6: Canonical Timezone Processing Across Intake and Scheduling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a dispatcher, cashier, donor, or admin,
I want all displayed date/time values in my preferred local timezone while UTC is stored at rest,
so that scheduling decisions are accurate and no user sees raw UTC.

## Acceptance Criteria

1. Given a user with explicit timezone preference (or tenant/system fallback), when date/time fields are created, updated, or rendered, then timestamps are persisted in UTC and displayed in local timezone with deterministic fallback order (`user -> tenant -> system`).
2. UI/API contract tests confirm raw UTC strings are not shown on operational screens.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Time displays must be operator-comprehensible and consistent across donor/cashier/dispatcher workflows.
- Real-User Validation Evidence: Same record rendered for users in different timezones shows localized output without UTC leakage.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is time rendering correctness, not access administration.

## Tasks / Subtasks

- [ ] Implement canonical timezone resolution strategy (AC: 1)
  - [ ] Resolve timezone via deterministic fallback (`user -> tenant -> system`).
  - [ ] Centralize timezone resolver for route intake and scheduling surfaces.
- [ ] Enforce UTC-at-rest persistence and localized read rendering (AC: 1)
  - [ ] Validate all persistence paths store UTC timestamps.
  - [ ] Ensure API serializers/UI adapters convert to resolved local timezone.
- [ ] Prevent raw UTC leakage on operational surfaces (AC: 2)
  - [ ] Audit key response payloads and rendered fields for raw UTC strings.
  - [ ] Add guards against accidental pass-through of UTC formatted timestamps.
- [ ] Add deterministic cross-timezone tests (AC: 1, 2)
  - [ ] API and UI contract tests for locale rendering and UTC suppression.

## Dev Notes

### Story Intent

Deliver reliable, user-centric time behavior across Epic 2 intake and scheduling workflows.

### Technical Requirements

- Persist all canonical datetimes in UTC.
- Render local timezone values using deterministic fallback precedence.
- Avoid mixed timezone handling across route workflows.

### Architecture Compliance

- Keep timezone utilities centralized and shared across route module APIs.
- Ensure serializer/adapters, not domain state, are responsible for display localization.

### Library / Framework Requirements

- Existing stack/time utilities in project should be reused; no new major dependency required.

### File Structure Requirements

- Timezone resolver/utilities in shared route module utilities.
- Intake/scheduling serializers under route API adapters.
- Tests in API/E2E suites covering timezone rendering behavior.

### Testing Requirements

- Coverage for all fallback branches: user, tenant, system.
- Contract tests proving absence of raw UTC rendering on operational endpoints/screens.
- Regression tests around DST boundary and timezone offset edge cases.

### Project Context Reference

- Route lane only (`project_lane: routeshyft`).
- UTC storage with local display is a baseline project requirement.

### Project Structure Notes

- Reuse any existing platform time-service patterns to avoid duplicate time logic.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.6)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (timezone-local rendering requirements)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Non_Functional_Requirements.md` (time accuracy and consistency constraints)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-6-canonical-timezone-processing-across-intake-and-scheduling.md
