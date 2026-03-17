# Research: ConnectShyft Master Debugging

No open clarification markers remained after loading the locked spec and inspecting the live ConnectShyft runtime. The decisions below resolve the planning inputs needed for implementation.

## Decision 1: Treat the dedicated ConnectShyft lane as the only live runtime boundary

- **Decision**: Plan all implementation inside the ConnectShyft router and `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, with narrow shared-helper edits only when those helpers are already on the active runtime path.
- **Rationale**: The current runtime reality is ConnectShyft-specific, and the user explicitly locked scope away from `apps/moneyshyft-*` and lane-convergence work.
- **Alternatives considered**:
  - Reconcile the outdated runtime-host contract by moving behavior across lanes: rejected because it violates the locked scope.
  - Broaden planning to platform routing or ownership cleanup: rejected because it is unrelated to the debugging sequence.

## Decision 2: Patch 1 starts at the API boundary and persistence layer

- **Decision**: The first implementation slice is backend-only neighbor preference capture and persistence, and it includes required `smsPreferenceOverrides` alignment so SMS gating uses the same authoritative durable source of truth.
- **Rationale**: The concrete defect is that `prefersTexting` is dropped in request parsing and hardcoded to `UNKNOWN` in persistence. Existing create and profile views already submit canonical values.
- **Alternatives considered**:
  - Start with frontend display adjustments: rejected because display is downstream of the persistence defect.
  - Fold SMS target logic into Patch 1: rejected because it breaks the locked phase order.

## Decision 3: Patch 2 fixes the frontend wrapper and inbox path, not the envelope

- **Decision**: Preserve the backend refusal envelope and patch the frontend thread action and result contract plus inbox rendering path so business refusals remain distinct from transport failures.
- **Rationale**: Thread detail already interprets HTTP 200 plus `ok: false` correctly. The flattening defect is concentrated in the shared frontend action wrapper and inbox rendering path.
- **Alternatives considered**:
  - Redesign the backend envelope to make refusals easier to detect: rejected because the envelope contract is explicitly locked.
  - Skip Patch 2 and rely on thread detail behavior alone: rejected because Patch 3 introduces refusals that must be visible in inbox actions too.

## Decision 4: Patch 3 adds a route-local deterministic SMS resolver

- **Decision**: Add the deterministic SMS target resolver behind `performOutboundAction`, with the contract order of explicit outbound request target, then primary active valid phone, then only active valid phone if exactly one, else refusal.
- **Rationale**: The current route logic picks request `targetPhone` or the first active phone, which violates the locked target-resolution rules and can silently pick the wrong target.
- **Alternatives considered**:
  - Redesign provider adapters to infer target selection: rejected because provider design is locked.
  - Move resolution into a new shared cross-lane utility: rejected because it widens scope and creates new shared ownership.

## Decision 5: Cross-phase coupling is limited to two named bridges

- **Decision**: Treat `smsPreferenceOverrides` as the only allowed bridge from Patch 1 to Patch 3 and the thread action and result shape in `threads.ts` as the only allowed bridge from Patch 2 to Patch 3.
- **Rationale**: These are the only identified seams where later work legitimately depends on earlier fixes. Locking them prevents incidental cross-phase cleanup.
- **Alternatives considered**:
  - Allow general serializer and helper cleanup across phases: rejected because that creates hidden scope growth.
  - Merge refusal rendering and target resolution into one patch: rejected because it defeats reviewable patch boundaries.

## Decision 6: Verification should expand existing ConnectShyft tests before creating new lanes or harnesses

- **Decision**: Extend existing ConnectShyft backend module and outbound-dispatch tests, use `npm run build` for the web app, and rely on focused manual UI verification for inbox, thread detail, and neighbor flows.
- **Rationale**: The repository already has relevant ConnectShyft API tests and does not have a configured frontend test runner.
- **Alternatives considered**:
  - Introduce a new frontend test framework as part of this work: rejected because it is outside the debugging scope.
  - Validate only by manual testing: rejected because backend regression coverage already exists and should be extended.
