# Implementation Plan: CS-004b Bridge Test Fixture Normalization

**Branch**: `004-bridge-test-fixture-normalization` | **Date**: 2026-03-12 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/spec.md)  
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/004-bridge-test-fixture-normalization/spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-004b_Bridge_Test_Fixture_Normalization_Guardrailed_Spec.md`

## Summary

Normalize the remaining bridge-related test fixtures to provider-neutral names and correlation shapes so ConnectShyft bridge tests reinforce the CS-003a/CS-004 architecture boundary without changing runtime behavior. The implementation is limited to targeted Jest files, bridge-adjacent test-support assets if needed, and documentation proving that provider-native payloads remain confined to infrastructure translation tests.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Jest, ts-jest, Express route test harnesses, shared communication domain modules under `domains/communication`, ConnectShyft module tests under `apps/connectshyft-api`, and repository boundary enforcement via `node scripts/enforce-workspace-boundaries.js`  
**Storage**: N/A for new behavior; existing shared PostgreSQL-backed bridge, correlation, and webhook models remain unchanged because CS-004b is test-only cleanup  
**Testing**: Targeted Jest suites for bridge routes, bridge sessions, and bridge-adjacent provider correlation tests; targeted repository scans for vendor-labeled fixtures; boundary enforcement validation  
**Target Platform**: Linux-hosted Shyft Nx monorepo with ConnectShyft API tests executing inside the existing repository toolchain  
**Project Type**: Monolithic Nx web application with shared domain/infrastructure code and lane-specific API test suites  
**Performance Goals**: Zero runtime behavior delta; no production code-path changes; no reduction in existing bridge test coverage  
**Constraints**: Test-only cleanup. Direct edit targets are limited to the four bridge-facing Jest files and `specs/004-bridge-test-fixture-normalization/*`. Allowed support-surface edits are limited to `tests/support/helpers/connectShyftWebhookTestHelpers.ts` and any test-support file directly imported by the four target Jest files. Runtime production files are out of scope except for a minimal type-only alignment change that does not alter runtime branching, persistence, routing, provider behavior, UI behavior, or deployment behavior. No bridge redesign, provider adapter redesign, UI changes, schema changes, or retry subsystem work are allowed.  
**Runtime Exception Rule**: If a non-test runtime file must change, the change must be limited to type-only alignment or exported test-facing typings. Any logic change requires replanning because CS-004b is not authorized to change runtime behavior.  
**Scale/Scope**: One normalized feature directory, four targeted bridge-related Jest files, one allowed infrastructure-edge helper exception surface, one internal test-fixture contract, and planning evidence only  
**Explicit Out-of-Scope Support Surfaces**: Provider registry tests and broader story fixture families (`F1`, `F2`, `F3`, `E4`, `G6`) remain out of scope unless a direct import dependency from the four in-scope bridge-facing Jest files requires adjustment.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Gate Review**

- Platform shell authority preserved: PASS. CS-004b changes only tests, test-support assets, and planning docs; `admin-web` and `admin-api` remain untouched as shell/auth authorities.
- Lane isolation preserved: PASS. No runtime lane coupling or cross-lane service calls are introduced.
- Routing delegation preserved: PASS. No route ownership, Nginx delegation, or `/api/v1/auth/*` / `/api/v1/platform/admin/*` behavior changes are proposed.
- Deployment topology preserved: PASS. No deployment, port, Docker, or static-build topology changes are in scope.
- Database ownership preserved: PASS. No migrations or schema ownership changes are proposed.
- Security boundaries preserved: PASS. No ingress, cookie, secret, or public-port behavior changes are proposed.
- Workflow compliance: PASS. The normalized feature spec, plan, research, data model, contract, and quickstart remain traceable to the CS-004b guardrailed issue spec.
- Acceptance criteria present: PASS. This plan includes verifiable no-runtime-change checks, targeted bridge suite validation, boundary enforcement, and touched-file checks proving Admin, MoneyShyft, and ConnectShyft routing/deploy/database behavior remains unchanged.

**Post-Design Re-check**

- Platform shell authority preserved: PASS. Design remains docs/tests only.
- Lane isolation preserved: PASS. Design keeps all runtime boundaries unchanged.
- Routing delegation preserved: PASS. Quickstart explicitly verifies no routing or lane runtime files are modified.
- Deployment topology preserved: PASS. Quickstart explicitly verifies no deploy topology files are modified.
- Database ownership preserved: PASS. Quickstart explicitly verifies no migration or schema files are modified.
- Security boundaries preserved: PASS. No runtime security surfaces are altered.
- Workflow compliance: PASS. Planning artifacts are complete and remain spec-driven.
- Acceptance criteria present: PASS. The design defines measurable scan, test, boundary, and touched-file validation steps.

## Project Structure

### Documentation (this feature)

```text
specs/004-bridge-test-fixture-normalization/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── bridge-test-fixture-contract.md
```

### Source Code (repository root)

```text
apps/
└── connectshyft-api/
    └── src/
        ├── routes/
        │   └── api/
        │       └── v1/
        │           └── __tests__/
        │               ├── connectshyft.bridge-flow.test.ts
        │               └── connectshyft.outbound-dispatch.test.ts
        └── modules/
            └── connectshyft/
                └── __tests__/
                    ├── bridgeSessions.test.ts
                    └── providerCorrelationMappings.test.ts

domains/
└── communication/
    └── bridge/
        └── __tests__/
            ├── bridgeStateMachine.test.ts
            └── handleProviderBridgeEvent.test.ts

tests/
└── support/
    └── helpers/
        └── connectShyftWebhookTestHelpers.ts
```

**Structure Decision**: Keep CS-004b confined to bridge-facing test files under `apps/connectshyft-api` plus any strictly necessary test-support assets. Bridge domain tests that are already provider-neutral remain unchanged, and infrastructure translation helpers remain provider-native only where translation behavior is the subject under test.

## Complexity Tracking

No constitution violations are required for CS-004b. This section is intentionally empty.
