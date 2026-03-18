# Feature Specification: CS-001 Lane Convergence

**Feature Branch**: `001-cs-001-lane-convergence`  
**Created**: 2026-03-10  
**Status**: Draft  
**Input**: `/specs/connectshyft-recovery/issues/cs-001-lane-convergence/spec.md`  
**Source Input**: `/specs/connectshyft-recovery/issues/CS-001_Lane_Convergence_Guardrailed_Spec.md`

## User Stories & Priorities

### User Story 1 - Single ConnectShyft UI Ownership and Parity (Priority: P1)

As a ConnectShyft operator, I can use inbox/thread/settings flows rendered only from `apps/connectshyft-web` with parity to the intended prototype.

**Independent Test**: Launch ConnectShyft frontend and verify inbox + thread + right-rail desktop layout and settings flows without relying on money lane ConnectShyft views/components.

**Acceptance Criteria**:
1. ConnectShyft UI views/components/features required for parity are present in `apps/connectshyft-web`.
2. ConnectShyft UI duplicates are removed from `apps/moneyshyft-web` after migration.
3. Desktop inbox renders the three-column layout marker `connectshyft-layout-desktop-three-column`.
4. Thread surfaces render `connectshyft-thread-action-bar` in inbox and detail flows.
5. Inbox and mine navigation preserve queue search context and deterministic ordering across tab roundtrip and refresh.

### User Story 2 - Route Convergence to ConnectShyft Frontend (Priority: P1)

As a platform maintainer, I can route all `/app/connectshyft/*` frontend paths to `connectshyft-web` only.

**Independent Test**: Route scan confirms no `/app/connectshyft/*` route definitions in `apps/moneyshyft-web/src/router/index.ts` and canonical route set exists in `apps/connectshyft-web/src/router/index.ts`.

**Acceptance Criteria**:
1. ConnectShyft routes are defined only in connect lane router.
2. Money lane router has no ConnectShyft page registrations.
3. Directory/settings/inbox/thread routes resolve in connect lane.

### User Story 3 - Build/Test Target Convergence and Guardrails (Priority: P1)

As a CI owner, I can run ConnectShyft UI validation against `connectshyft-web`, and CI fails if ConnectShyft UI reappears in `moneyshyft-web`.

**Independent Test**: Playwright stack and CI workflow run against connect lane frontend, and policy guard fails on prohibited money lane ConnectShyft UI paths.

**Acceptance Criteria**:
1. ConnectShyft UI suites start `apps/connectshyft-web`.
2. CI references the correct frontend target.
3. Guardrail check blocks reintroduction of duplicate money lane ConnectShyft UI.

## Non-Goals

- No redesign of ConnectShyft UI.
- No framework migration.
- No ProgramShyft or CaseShyft changes.

## Testing Requirements

- Include automated verification tasks for route ownership, frontend target selection, and ConnectShyft UI parity.
- Include CI evidence tasks (Playwright + policy checks).
- Screenshot evidence MUST include the required matrix in this spec.

## Boundary and Delegation Compatibility

1. `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegation remains owned by `admin-api`.
2. Lane `/api` routing ownership remains lane-local, with no new cross-lane direct service coupling.
3. Shared Postgres compatibility remains unchanged by CS-001 frontend convergence work.
4. Compatibility evidence MUST be recorded in feature artifacts prior to closeout.

## Screenshot Evidence Matrix

1. Desktop inbox with three-column marker visible (`connectshyft-layout-desktop-three-column`).
2. Desktop thread detail with action bar visible (`connectshyft-thread-action-bar`).
3. Mobile inbox with bottom navigation visible.
4. Mobile thread detail showing full-screen thread behavior.
5. More/settings surface showing settings and directory entry points.
6. Each screenshot MUST include viewport metadata in filename and be placed under `artifacts/screenshots/`.
