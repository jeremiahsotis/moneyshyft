# Contract: Telephony Bridge Provider Interface

## Purpose

Define the provider-neutral telephony surface required for CS-004 bridge orchestration.

## Ownership

- Contract owner: `domains/communication/telephony`
- Provider implementation owner: `infrastructure/communications/telnyx`
- App/domain consumers: `domains/communication/bridge`, `apps/connectshyft-api`

## Rules

- App and domain code may depend on this contract, but not on Telnyx call-control payload shapes.
- Provider payload translation happens once at the infrastructure edge.
- Provider identifiers may be persisted for reconciliation, but provider semantics do not leak into the bridge domain API.

## Required Interface Surface

### `startOutboundCall(command)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `bridgeSessionId`
- `legId`
- `legRole`
  - `operator` or `neighbor`
- `toContactPointId`
- `fromContactPointId`
  - optional

**Output**

- `providerCallId`

### `startBridgeSession(command)`

**Input**

- `bridgeSessionId`
- `operatorProviderCallId`
- `neighborProviderCallId`

**Output**

- bridge-control completion with no raw provider payload required by the caller

### `verifyWebhook(input)`

**Input**

- provider-neutral webhook verification input already used by ConnectShyft

**Output**

- `ok = true` on valid signature
- provider-neutral refusal metadata on invalid or missing signature state

### `translateProviderEvent(input)`

**Input**

- raw event type
- raw provider payload

**Output**

- provider-neutral event type plus sanitized payload suitable for bridge-event mapping

## Required Provider-Neutral Bridge Events

Translated bridge orchestration must be able to produce:

- `operator_call_created`
- `neighbor_call_created`
- `operator_answered`
- `neighbor_answered`
- `bridge_connected`
- `operator_failed`
- `neighbor_failed`
- `bridge_failed`
- `completed`

## Current CS-004 Telnyx Binding

- Telnyx implements `startBridgeOutboundCall` for operator and neighbor dialing.
- Telnyx implements `startBridgeSession` by calling `POST /calls/{operatorCallControlId}/actions/bridge`.
- The infrastructure adapter normalizes outbound call results so the bridge domain receives a single `providerCallId` field regardless of provider response shape.

## Deferred Surface

- full provider lookup/status polling remains optional
- full end-call and call-cancel orchestration can stay minimal unless directly required by CS-004 acceptance
- full communication-domain audit and idempotency ledger integration remains deferred to CS-005
