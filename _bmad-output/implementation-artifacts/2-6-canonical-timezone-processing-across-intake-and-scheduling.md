# Story 2.6: Canonical Timezone Processing Across Intake and Scheduling

Status: review

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

- [x] Implement canonical timezone resolution strategy (AC: 1)
  - [x] Resolve timezone via deterministic fallback (`user -> tenant -> system`).
  - [x] Centralize timezone resolver for route intake and scheduling surfaces.
- [x] Enforce UTC-at-rest persistence and localized read rendering (AC: 1)
  - [x] Validate all persistence paths store UTC timestamps.
  - [x] Ensure API serializers/UI adapters convert to resolved local timezone.
- [x] Prevent raw UTC leakage on operational surfaces (AC: 2)
  - [x] Audit key response payloads and rendered fields for raw UTC strings.
  - [x] Add guards against accidental pass-through of UTC formatted timestamps.
- [x] Add deterministic cross-timezone tests (AC: 1, 2)
  - [x] API and UI contract tests for locale rendering and UTC suppression.

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
- Added shared route timezone adapter and wired localized serialization in `src/src/routes/api/v1/route.ts`.
- Added frontend timezone request header and UTC leakage guard in Route lifecycle view adapter.
- Added cross-timezone API/UI contract coverage for Story 2.6.
- Hardened route system-timezone fallback to trusted server configuration (`ROUTESHYFT_SYSTEM_TIMEZONE`/`SYSTEM_TIMEZONE`/`TZ`) with UTC default; `x-system-timezone` request overrides are no longer honored in route APIs.
- Updated lifecycle payload sanitization fallback to render UTC strings using API-resolved timezone context when available.
- Expanded timezone regression coverage for DST boundary conversion and half-hour offset timezone rendering.
- Validation commands:
  - `cd src && npm test -- src/src/routes/api/v1/__tests__/route.timezone.test.ts` (pass: 6 tests)
  - `cd src && npm test -- src/src/routes/api/v1/__tests__/route.test.ts src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts src/src/routes/api/v1/__tests__/route.commitments.test.ts` (pass: 22 tests)
  - `cd src && npm test` (pass: 56 suites, 310 tests)
  - `cd src && npm run build` (pass)
  - `cd frontend && npm run build` (pass)

### Completion Notes List

- Implemented deterministic timezone context resolution for route intake/scheduling (`user -> tenant -> system`) with safe system default fallback.
- Enforced localized API presentation adapter for operational route responses; UTC fields are converted to `*Local` and guarded against raw UTC pass-through.
- Preserved UTC-at-rest persistence paths; added tests that verify stored canonical timestamps remain UTC while read responses are localized.
- Added API contract coverage for timezone fallback + UTC suppression and UI journey assertions that operational details do not show raw UTC ISO strings.
- Removed client control of route-level system timezone fallback by sourcing system timezone from trusted server environment defaults.
- Corrected frontend UTC sanitization fallback to align with API-resolved timezone context instead of browser-local timezone.
- Added deterministic DST boundary and offset-edge tests (`America/Los_Angeles` DST jump, `Asia/Kolkata` half-hour offset) for localized rendering guarantees.
- Story status advanced to `review`; sprint status updated to `review`.

### File List

- _bmad-output/implementation-artifacts/2-6-canonical-timezone-processing-across-intake-and-scheduling.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/src/modules/route/api/timezoneAdapter.ts
- src/src/routes/api/v1/route.ts
- src/src/routes/api/v1/__tests__/route.timezone.test.ts
- frontend/src/services/api.ts
- frontend/src/views/RouteShyft/RouteRequestLifecycleView.vue
- tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.api.spec.ts
- tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.spec.ts

## Change Log

- 2026-02-27: Implemented canonical timezone processing across route intake/scheduling serializers and UI adapters; added deterministic timezone fallback + UTC leakage contract tests; updated sprint/story status to `review`.
- 2026-02-27: Addressed review remediation by removing request-header control of system fallback timezone, aligning UI fallback formatting with API timezone context, and adding DST/offset regression tests.
