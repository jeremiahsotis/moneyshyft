# Story b.2: Shared Tenant Identity and Shared-Phone Indicators

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator working across orgUnits in one tenant,
I want neighbor identity updates and shared-phone markers to be consistently visible,
so that contact context remains aligned across operational teams.

## Acceptance Criteria

1. Given neighbor identity or phone metadata is updated in one orgUnit context, when another authorized orgUnit in the same tenant loads that profile, then shared tenant identity updates are immediately visible.
2. Given a phone entry is marked as shared or non-shared, when profile data is rendered via API/UI, then persisted shared-phone indicators are returned and displayed consistently.
3. Given users from another tenant attempt access, when read APIs execute, then cross-tenant identity visibility is refused with no data leakage.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Shared-identity updates must be immediate and explicit in UI copy so operators understand tenant-wide impact before saving changes.
- Real-User Validation Evidence: 2026-02-24 `npm run test:e2e -- tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.spec.ts` passed (4/4). Validated same-tenant cross-orgUnit visibility, shared-phone indicator persistence/rendering, and cross-tenant refusal state.
- Real-User Validation Result: pass
- Role-Admin UI Path: Tenant/orgUnit role administration is required for test matrix coverage (orgUnit-scoped vs tenant-privileged visibility).
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement tenant-shared identity read/write semantics (AC: 1, 3)
  - [x] Ensure neighbor identity storage is tenant-scoped and not duplicated per orgUnit.
  - [x] Ensure read APIs enforce tenant boundary while allowing authorized cross-orgUnit visibility inside tenant.
- [x] Implement shared-phone metadata persistence and serialization (AC: 2)
  - [x] Add/confirm explicit shared-phone field semantics in neighbor phone records.
  - [x] Include shared-phone indicators in list/detail response DTOs with deterministic ordering.
- [x] Deliver UI parity for shared identity visibility (AC: 1, 2)
  - [x] Display shared-phone badges/labels in Neighbor Profile and relevant thread/inbox surfaces.
  - [x] Add explicit save impact copy: tenant-wide identity update visibility.
- [x] Add automated coverage (AC: 1, 2, 3)
  - [x] API tests: orgUnit A update visible to orgUnit B in same tenant; cross-tenant refusal.
  - [x] E2E tests: shared-phone indicator rendering and persistence behavior.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-004a, FR-CS-010.
- Depends on story `b.1` data model and base neighbor create contract.
- Preserve deterministic response envelopes and refusal semantics.

### Architecture Compliance

- AD-04 requires neighbor identity to be tenant-scoped and shared across orgUnits with governance controls.
- Maintain strict tenant isolation even when supporting in-tenant shared visibility.
- Keep module boundary isolation: ConnectShyft logic remains in ConnectShyft module paths.

### Library / Framework Requirements

- Reuse platform capability and context enforcement helpers; avoid duplicate authorization stacks.
- Reuse existing ConnectShyft route + service patterns already established for `numbers` and `escalation` routes.
- Keep migration + persistence changes additive-first in current Knex conventions.

### File Structure Requirements

- Primary route/API changes: `src/src/routes/api/v1/connectshyft.ts`.
- Add/extend neighbor module files under `src/src/modules/connectshyft/`.
- Add/extend frontend ConnectShyft views/components under `frontend/src/views/ConnectShyft/` and `frontend/src/features/connectshyft/`.
- Add API/E2E tests under `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- API contract tests for:
  - same-tenant cross-orgUnit read-through of updated identity
  - shared-phone indicator persistence and read consistency
  - cross-tenant refusal behavior
- E2E tests for shared indicator rendering and immediate visibility after update.
- Regression checks for `a-2` and `a-5` capability/context behavior on changed routes.

### Previous Story Intelligence

- `b.1` establishes base neighbor + phone persistence; `b.2` extends read/write semantics and UI indicators.
- `a.3` solved deterministic ordering for number mappings; reuse deterministic sorting principles for shared-phone list rendering.

### Git Intelligence Summary

- Recent platform commits emphasized envelope normalization and deterministic contract behavior. Use shared envelope helpers for all new neighbor identity response paths.
- Keep policy-guard compatibility and avoid introducing skipped tests for story suites.

### Latest Technical Information

- Follow repository-pinned platform stack and coding conventions documented in project context to minimize drift risk.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep identity-sharing behavior explicit and testable at API contract boundaries.
- Avoid introducing cross-module coupling with RouteShyft.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story b-2-shared-tenant-identity-and-shared-phone-indicators`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic b, Story b.2)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-04, Data and API architecture)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Flow 5, Screen C)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-004a, FR-CS-010)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story b-2-shared-tenant-identity-and-shared-phone-indicators`
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/neighbors.test.ts src/src/modules/connectshyft/__tests__/contextAccess.test.ts src/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts src/src/migrations/__tests__/connectShyftNeighborSharedPhoneMetadataMigration.test.ts`
- `cd src && npm run build`
- `cd frontend && npm run build`
- `npm run test:e2e -- tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.api.spec.ts`
- `npm run test:e2e -- tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.spec.ts`
- Regression spot checks: `npm run test:e2e -- tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.api.spec.ts`, `npm run test:e2e -- tests/api/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.api.spec.ts`, `npm run test:e2e -- tests/e2e/platform/b-1-tenant-scoped-neighbor-creation-with-required-phone.spec.ts`

### Completion Notes List

- Added tenant-scoped neighbor read/update/list APIs: `GET /connectshyft/neighbors`, `GET /connectshyft/neighbors/:neighborId`, `PUT /connectshyft/neighbors/:neighborId`.
- Implemented shared-phone metadata (`isShared`, `verificationStatus`) normalization, persistence, serialization, and deterministic response ordering.
- Added additive migration `20260224143000_add_shared_phone_metadata_to_connectshyft_neighbor_phones.ts` with migration unit coverage.
- Added new ConnectShyft Neighbor Profile UI route/view with explicit tenant-wide impact save copy, shared toggles/indicators, and refusal-state rendering.
- Added inbox shared-identity indicator rendering to keep phone-share semantics visible in operator surfaces.
- Activated b.2 API and E2E coverage with deterministic neighbor seeding and verified all b.2 tests passing.

### File List

- src/src/modules/connectshyft/neighbors.ts
- src/src/modules/connectshyft/contextAccess.ts
- src/src/modules/connectshyft/__tests__/neighbors.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/migrations/20260224143000_add_shared_phone_metadata_to_connectshyft_neighbor_phones.ts
- src/src/migrations/__tests__/connectShyftNeighborSharedPhoneMetadataMigration.test.ts
- frontend/src/features/connectshyft/neighbors.ts
- frontend/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue
- frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue
- frontend/src/router/index.ts
- tests/api/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.api.spec.ts
- tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.spec.ts
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- _bmad-output/implementation-artifacts/b-2-shared-tenant-identity-and-shared-phone-indicators.md

## Change Log

- 2026-02-24: Created Story b.2 ready-for-dev context document.
- 2026-02-24: Implemented tenant-shared neighbor identity read/update/list semantics with shared-phone indicators and deterministic contracts.
- 2026-02-24: Added shared-phone metadata migration and tests; added neighbor profile UI + inbox indicator parity updates.
- 2026-02-24: Activated and passed b.2 API and E2E automation coverage; story advanced to `review`.
