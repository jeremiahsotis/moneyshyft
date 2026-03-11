# Contract: Bridge Domain Service

## Purpose

Define the provider-neutral domain boundary for persisted bridge-session orchestration.

## Ownership

- Domain owner: `domains/communication/bridge`
- Infrastructure consumer: `infrastructure/communications/*`
- App-layer consumer: `apps/connectshyft-api`

## Rules

- The bridge domain owns session and leg state transitions.
- The bridge domain must not import Telnyx payload types or route-layer request types.
- The UI is not the source of truth for bridge progression.
- Bridge-side effects are described in provider-neutral terms and executed by app or infrastructure collaborators.

## Service Surface

### `startBridgeSession(command)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `operatorParticipantId`
- `neighborParticipantId`
- `operatorContactPointId`
- `neighborContactPointId`
- `selectedOutboundContactPointId`
  - optional
- `idempotencyKey`
  - optional
- `auditCorrelationId`
  - optional

**Behavior**

- create one bridge session aggregate
- create operator and neighbor bridge legs
- persist initial `created` state before dispatch side effects
- transition session to `operator_dialing`
- transition operator leg to `dialing`, then `ringing` after provider call creation
- request provider-neutral operator outbound call side effect through `BridgeTelephonyProvider.startOutboundCall`
- persist the authoritative aggregate after provider call creation

**Output**

- provider-neutral bridge aggregate snapshot with persisted operator and neighbor legs

### `handleProviderBridgeEvent(event)`

**Input**

- `ProviderBridgeEvent`
- repository and provider side-effect collaborators supplied by the application layer

**Behavior**

- load authoritative aggregate from persistence
- apply replay-tolerant transition rules
- persist aggregate updates
- when `operator_answered` arrives for the first time:
  - persist `operator_answered`
  - transition to `neighbor_dialing`
  - start the neighbor leg outbound call
  - persist `neighbor_call_created`
- when `neighbor_answered` arrives for the first time:
  - persist `neighbor_answered`
  - invoke bridge control through `BridgeTelephonyProvider.startBridgeSession`
  - persist `bridge_connected`
- when terminal events arrive:
  - persist `completed` or `failed` session state
  - preserve terminal outcomes on replay
- suppress duplicate already-applied work

**Output**

- updated bridge aggregate or `null` when no matching aggregate exists

## Repository Contract

The bridge domain requires a repository that can:

- create a session
- create both legs
- load an aggregate by session ID
- load an aggregate by provider leg ID
- persist the aggregate atomically after transitions

## State Guarantees

- one bridge session per call attempt
- one operator leg and one neighbor leg per session
- neighbor dialing does not occur before operator answer
- bridge control does not occur before both legs are answered
- duplicate provider events do not produce duplicate domain side effects
