# Story a.3: OrgUnit Number Mapping Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit administrator,
I want to manage multiple provider numbers per orgUnit with tenant-safe uniqueness rules,
so that inbound routing is deterministic and operationally maintainable.

## Acceptance Criteria

1. Given an orgUnit admin creates or updates number mappings, when they save valid provider E.164 numbers, then multiple mappings per orgUnit are supported.
2. Given a duplicate `(tenant_id, provider_name, provider_number_e164)` mapping attempt, when validation runs, then the operation is blocked with actionable validation feedback.
3. Given number mappings are listed or returned after create/update, when read-back occurs, then order is deterministic using canonical sorting: `provider_number_e164` ascending with `mappingId` ascending as tie-breaker, and API/UI present this same order.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Admin UI and API validation rules must mirror each other for number uniqueness and formatting errors.
- Real-User Validation Evidence: `NODE_ENV=test npm run test:e2e -- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts` (6/6 pass) and `NODE_ENV=test npm run test:e2e -- tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts` (4/4 pass) covering add/update/duplicate/invalid plus deterministic ordering.
- Real-User Validation Result: pass
- Role-Admin UI Path: OrgUnit admin number-mapping screen and API path are both required.
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement number mapping create/update paths for multiple orgUnit numbers (AC: 1)
  - [x] Support multiple mapped numbers per orgUnit.
  - [x] Validate provider E.164 format before persistence.
- [x] Enforce tenant-safe uniqueness constraints (AC: 2)
  - [x] Enforce uniqueness for `(tenant_id, provider_name, provider_number_e164)` at persistence and service layers.
  - [x] Return deterministic validation/refusal payloads on duplicate collisions.
- [x] Deliver admin UX + API parity and tests (AC: 1, 2)
  - [x] Add API tests for valid create/update and duplicate failure paths.
  - [x] Add UI tests for error feedback and deterministic state after validation failures.

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
- Test-only headers (`x-test-*` tenant/orgUnit/role/membership overrides) must be ignored unless `ENABLE_TEST_CONNECTSHYFT_FLAGS` is enabled and `NODE_ENV === test`; if disabled, requests behave as if those headers are absent.

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

- `cd src && npm test -- src/modules/connectshyft/__tests__/numberMappings.test.ts` (pass, 7 tests)
- `cd src && npm run build` (pass)
- `cd frontend && npm run build` (pass)
- `npm run test:e2e -- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts` (pass, 5 tests)
- `npm run test:e2e -- tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts` (pass, 4 tests)
- `cd src && npm test` (pass, 30 suites / 139 tests passed, 2 skipped)
- `cd src && npm test -- src/modules/connectshyft/__tests__/numberMappings.test.ts` (pass, 8 tests)
- `cd src && npm run build` (pass)
- `NODE_ENV=test npm run test:e2e -- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts` (pass, 5 tests)
- `NODE_ENV=test npm run test:e2e -- tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts` (pass, 4 tests)
- `cd src && npm test -- src/modules/connectshyft/__tests__/numberMappings.test.ts` (pass, 13 tests)
- `cd src && npm run build` (pass)
- `NODE_ENV=test npm run test:e2e -- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts` (pass, 6 tests)
- `NODE_ENV=test npm run test:e2e -- tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts` (pass, 4 tests)

### Completion Notes List

- Implemented ConnectShyft number mapping create/update/list flows on `/api/v1/connectshyft/numbers` with shared envelope contracts.
- Added dedicated ConnectShyft number mapping service with E.164 validation and tenant-safe uniqueness checks at service and persistence layers.
- Added deterministic duplicate and invalid-number refusal payloads (`CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE`, `CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164`) with actionable `fieldErrors`.
- Added frontend Numbers & OrgUnit Config screen and route (`/app/connectshyft/settings/numbers`) with create/edit mapping workflow and deterministic validation feedback.
- Added frontend test-context header overrides (tenant/orgUnit/role/memberships) for ConnectShyft UI automation parity.
- Enabled and executed story `a.3` API and E2E Playwright coverage (create/update/duplicate/invalid journeys) with passing results.
- Hardened test-header security gates to honor `x-test-*` overrides only when `ENABLE_TEST_CONNECTSHYFT_FLAGS` is enabled and `NODE_ENV === test`.
- Removed unsafe PUT upsert fallback, added mapping-id collision guards, and enforced canonical mapping ordering (`provider_number_e164`, then `mappingId`) in service read-back.
- Strengthened API/E2E assertions to verify deterministic ordering instead of presence-only checks.
- Added explicit `test` Knex environment config to keep Playwright preflight migrations/runtime compatible with strict test-only `x-test-*` override gating.
- Updated Playwright preflight backend boot to default `NODE_ENV=test` so strict test-only override gating remains compatible with standard `npm run test:e2e` execution.
- Fixed `/api/v1/connectshyft/numbers` `isActive` parsing so explicit `"false"` values are preserved instead of being coerced to `true`.
- Added API regression coverage for string `"false"` `isActive` payload handling on number mapping create requests.
- Tightened a.3 UI deterministic-order assertions to verify row position order, not presence-only membership checks.
- Reconciled story File List against implementation/review git history to remove traceability gaps.

### File List

- _bmad-output/implementation-artifacts/a-3-orgunit-number-mapping-management.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- frontend/src/features/connectshyft/flags.ts
- frontend/src/features/connectshyft/numbers.ts
- frontend/src/router/index.ts
- frontend/src/views/ConnectShyft/ConnectShyftNumberMappingsView.vue
- scripts/run-playwright-with-preflight.sh
- src/src/knexfile.ts
- src/src/modules/connectshyft/__tests__/numberMappings.test.ts
- src/src/modules/connectshyft/contextAccess.ts
- src/src/modules/connectshyft/featureFlags.ts
- src/src/modules/connectshyft/numberMappings.ts
- src/src/platform/rbac/capabilities.ts
- src/src/routes/api/v1/connectshyft.ts
- tests/api/platform/a-3-orgunit-number-mapping-management.api.spec.ts
- tests/e2e/platform/a-3-orgunit-number-mapping-management.spec.ts

### Change Log

- 2026-02-22: Implemented story a.3 end-to-end (backend number mapping APIs, tenant-safe uniqueness/validation, admin UI path, and automated API/E2E coverage).
- 2026-02-22: Resolved review findings by hardening test-header gating, removing unsafe update upsert behavior, adding mapping-id collision protection, and tightening deterministic-order test assertions.
- 2026-02-22: Added test-environment Knex profile to support strict `x-test-*` gating during Playwright preflight/runtime.
- 2026-02-22: Updated Playwright preflight backend runtime to default `NODE_ENV=test` for test-only override compatibility.
- 2026-03-04: Closed review follow-ups by fixing `isActive` false-value parsing, adding API regression coverage, restoring deterministic-order UI assertions, and reconciling story File List history.

## Senior Developer Review (AI)

- Reviewer: Amelia (Developer Agent)
- Date: 2026-03-04
- Outcome: Approved after fixes
Resolved items:
- `parseMappingBody` now preserves explicit false `isActive` inputs.
- Story a.3 API suite now includes a regression test for string `"false"` `isActive` handling.
- Story a.3 E2E suite now verifies deterministic ordering by row position.
- Story metadata, guardrails evidence, and File List now align with implementation + review history.
