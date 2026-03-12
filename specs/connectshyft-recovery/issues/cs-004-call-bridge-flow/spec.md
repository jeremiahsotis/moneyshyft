# Feature Specification: CS-004 Call Bridge Flow

**Feature Branch**: `004-cs-004-call-bridge-flow`  
**Created**: 2026-03-11  
**Status**: Ready for Review  
**Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-004_Call_Bridge_Guardrailed_Spec.md`  
**Reference Flow**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/architecture/CS-004_bridge_flow_sequence_diagram.md`

## User Stories & Priorities

### User Story 1 - Start a Persisted Bridge Session (Priority: P1)

As a ConnectShyft operator, I can press Call on a thread and the system creates a durable bridge session with operator and neighbor legs before any bridge progression continues.

**Independent Test**: Invoke `POST /api/v1/connectshyft/threads/:threadId/call` and verify one persisted bridge session plus exactly two persisted bridge legs are created, with the session moved to `operator_dialing` and the operator leg moved to `dialing` or `ringing`.

**Acceptance Criteria**:
1. The call action creates one `bridge_session` equivalent record and one operator plus one neighbor `bridge_leg` equivalent record.
2. The UI receives provider-neutral bridge session state and does not become the source of truth for bridge progression.
3. The first telephony action is an operator leg outbound call initiated through the provider-neutral telephony boundary.
4. No Telnyx request or response shape is exposed above infrastructure.

### User Story 2 - Advance the Bridge via Provider-Neutral Events (Priority: P1)

As the system receives translated provider events, it can move the bridge session from operator dialing through neighbor dialing to bridged without UI-managed step chaining.

**Independent Test**: Rehydrate a persisted bridge aggregate, apply translated `operator_answered` and `neighbor_answered` events, and verify the operator answer triggers neighbor dialing and the neighbor answer triggers bridge control exactly once.

**Acceptance Criteria**:
1. Provider events are translated before they enter bridge orchestration.
2. `operator_answered` advances the session to `operator_answered`, then initiates the neighbor leg and advances the session to `neighbor_dialing`.
3. `neighbor_answered` advances the session to `neighbor_answered`, then invokes bridge control and advances the session to `bridged` after provider success.
4. Duplicate or out-of-order provider events must not create duplicate sessions, duplicate legs, or repeated bridge-control side effects.

### User Story 3 - Persist Terminal Bridge Outcomes (Priority: P2)

As an operator returning to a thread later, I can rely on persisted bridge completion or failure state rather than ephemeral frontend state.

**Independent Test**: Apply translated `completed`, `operator_failed`, `neighbor_failed`, and `bridge_failed` events to persisted aggregates and verify the authoritative session and leg states can be reloaded from storage after refresh or webhook retry.

**Acceptance Criteria**:
1. Operator, neighbor, and bridge failures roll up to the persisted session with a terminal failure code and message.
2. Completed bridge flows persist final session and leg terminal states.
3. Session state survives page refresh and webhook replay.

## Functional Requirements

- FR-001: `POST /api/v1/connectshyft/threads/:threadId/call` MUST create exactly one persisted bridge session and exactly two persisted bridge legs (`operator`, `neighbor`) before any bridge progression continues.
- FR-002: The call-start response and any thread refresh response that includes call state MUST expose only provider-neutral bridge fields: `bridgeSessionId`, `sessionState`, `operatorLegState`, `neighborLegState`, `failureCode`, `failureMessage`, and relevant timestamps.
- FR-003: Raw provider webhooks MUST be deduplicated by existing webhook-receipt handling before bridge orchestration; only translated provider-neutral events may enter `domains/communication/bridge`.
- FR-004: The first translated `operator_answered` event MUST initiate neighbor dialing exactly once and transition the session to `neighbor_dialing`.
- FR-005: The first translated `neighbor_answered` event MUST invoke bridge control exactly once and transition the session to `bridged` only after provider success.
- FR-006: Terminal outcomes MUST persist authoritative session and leg states. `failureCode` MUST be one of `operator_failed`, `neighbor_failed`, or `bridge_failed`; `failureMessage` MUST come from the translated event or provider-neutral error mapping.
- FR-007: Persisted bridge state MUST be recoverable after page refresh and duplicate webhook delivery without relying on frontend memory.

## Non-Functional Requirements

- NFR-001: Raw Telnyx payloads and types MUST remain confined to `infrastructure/communications/telnyx`.
- NFR-002: No provider-specific logic may be introduced under `apps/`.
- NFR-003: CS-004 reuses existing webhook-receipt deduplication and does not add audit history, retry scheduling, reconciliation jobs, or new cross-request idempotency workflows.
- NFR-004: Existing routing delegation and shared-Postgres production migration ownership MUST remain unchanged and be validated.

## Edge Cases

- Duplicate webhook delivery after the receipt has already been recorded.
- Out-of-order translated events, including `neighbor_answered` arriving before `operator_answered`.
- Thread refresh or re-entry between operator dial start and terminal completion.
- Bridge-control failure after neighbor answer but before `bridged` is persisted.

## Compatibility Acceptance Scenarios

1. `/api/v1/auth/*` and `/api/v1/platform/admin/*` continue to resolve through `admin-api`, while `/api/v1/connectshyft/*` remains lane-owned.
2. Bridge-session persistence uses shared Postgres and shared migration authority; `connectshyft-api` does not assume independent production migration execution.

## Non-Goals

- No UI redesign.
- No analytics or reporting work.
- No provider-specific logic under `apps/`.
- No relocation of communication, infrastructure, or UI/domain boundaries.
- No full CS-005 audit/idempotency implementation beyond what CS-004 already depends on.
- No CS-005 audit trail, retry scheduler, reconciliation job, or new idempotency workflow work in CS-004.
- No SMS feature work or unrelated thread UX changes.

## Testing Requirements

- Add communication-domain tests for bridge session transitions and replay-safe provider event handling.
- Add application persistence tests for bridge session and leg storage plus provider-leg lookup/correlation.
- Add route and webhook integration tests proving the call action creates a bridge session and translated provider events advance it correctly.
- Preserve existing boundary tests that ensure Telnyx remains behind infrastructure and bridge logic remains outside UI state.

## Boundary and Delegation Compatibility

1. `domains/communication/bridge` owns bridge-session orchestration and state transitions.
2. `infrastructure/communications/telnyx` owns Telnyx call-control and bridge-control integration.
3. `apps/connectshyft-api` may orchestrate thread actions and route/webhook integration, but it must call shared domain and provider-neutral interfaces only.
4. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`.
5. Session state must persist outside frontend state and remain replay-safe for repeated provider events.

## Evidence Expectations

1. State-machine test coverage for operator leg, neighbor leg, bridge success, completion, and failure paths.
2. Persistence evidence for one bridge session plus two bridge legs per call attempt.
3. Webhook-driven progression evidence showing operator answered -> neighbor dialing -> bridged.
4. Proof that the route and webhook layers do not import raw Telnyx payload types into the bridge domain.
