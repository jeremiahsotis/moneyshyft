You are implementing **Checkpoint 1 — State Machine Lock** for ConnectShyft.

Read and follow the attached checkpoint spec exactly. Do not redesign architecture. Do not expand scope. This is a **completion and hardening slice**, not a refactor for style.

## Objective
Enforce BridgeSession as the single telephony runtime authority with monotonic, non-regressing state transitions.

## Required files
- apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
- apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
- apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts
- apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
- apps/connectshyft-api/src/routes/api/v1/connectshyft.ts

## Hard requirements
1. Define a single canonical BridgeSession state enum in `bridgeSessions.ts`.
2. Define an explicit allowed-transition map.
3. Add one central `transitionBridgeSessionState(...)` function and route all state changes through it.
4. Prevent terminal-state mutation and state regression.
5. Provider events must map into BridgeSession state only through the lifecycle layer.
6. Voicemail may only be entered from valid unanswered-flow states.
7. Add or update tests for:
   - valid transitions
   - invalid transitions ignored
   - terminal states immutable
   - duplicate transition idempotency
   - replayed webhook safety
   - out-of-order event safety
8. Do not introduce SIP logic, retry logic, schema changes, thread/timeline changes, rebind changes, or UI changes.

## Verification requirements
Before stopping, run and verify:
- `rg "status =" apps/connectshyft-api`
- `rg "transitionBridgeSessionState" apps/connectshyft-api`

## Stop condition
Stop only when:
- all BridgeSession state mutations route through the central transition function
- no direct BridgeSession status mutation remains
- replayed and out-of-order provider events cannot regress final state
- voicemail cannot be entered from invalid states

## Commit boundary
Use exactly this commit message:
`feat(connectshyft): lock bridge session state machine and enforce monotonic transitions`

Work surgically. Preserve existing architecture. Do not drift beyond the checkpoint spec.
