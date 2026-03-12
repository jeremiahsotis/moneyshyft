# Contract: Provider-Neutral Telephony Interface

## Purpose

Define the shared telephony boundary used by app code and implemented by provider-specific infrastructure adapters.

## Ownership

- Domain contract owner: `domains/communication/telephony`
- Provider implementation owner: `infrastructure/communications/telnyx`
- App consumers: lane APIs such as `apps/connectshyft-api`

## Rules

- App code may depend on this contract, but not on Telnyx request/response shapes.
- Provider adapters may translate provider payloads once at the infrastructure edge.
- Bridge orchestration is out of scope for CS-003, but the interface must remain compatible with future bridge work.
- Shared idempotency and audit orchestration stay in the communication domain or app-level orchestration that consumes domain helpers, not in provider adapters.

## Interface Surface

### Shared exports

- `TelephonyProviderAdapter`
- `TelephonyDispatchResult`
- `TelephonyEndCallCommand`
- `TelephonyEndCallResult`
- `TelephonyProviderEventCorrelation`
- `TelephonyProviderFailureClassification`
- `TelephonyProviderFailure`
- `TelephonySendSmsCommand`
- `TelephonyStartOutboundCallCommand`
- `TelephonyWebhookVerificationInput`
- `TelephonyProviderEvent`
- `buildTelephonyDispatchReplayKey(...)`
- `InMemoryTelephonyDispatchLedger`

### `sendSms(command)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `idempotencyKey`
- `targetPhone`
- `body`
- `providerKey`

**Output**

- `providerKey`
- `channel = "message"`
- `providerMessageId`
- `adapterInvoked = true`
- `providerBranchingInDomain = false`

### `startOutboundCall(command)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `idempotencyKey`
- `targetPhone`
- `providerKey`
- `callPolicy`

**Output**

- `providerKey`
- `channel = "call"`
- `providerLegId`
- `adapterInvoked = true`
- `providerBranchingInDomain = false`

### `endCall(command)`

**Input**

- `providerKey`
- `providerLegId`
- optional `idempotencyKey`

**Output**

- `providerKey`
- `providerLegId`
- `ended = true`
- `adapterInvoked = true`
- `providerBranchingInDomain = false`

### `verifyWebhook(input)`

**Input**

- `headers`
- `rawBody`
- `providerKey`
- request metadata needed for signature verification

**Output**

- `ok = true` on valid signature
- refusal metadata on invalid/missing/unconfigured signature state using provider-neutral refusal codes:
  - `WEBHOOK_SIGNATURE_NOT_CONFIGURED`
  - `WEBHOOK_SIGNATURE_MISSING`
  - `WEBHOOK_SIGNATURE_INVALID`

### `translateProviderEvent(input)`

**Input**

- provider raw event type
- raw provider payload

**Output**

- canonical event type
- sanitized provider-neutral payload
- normalized correlation metadata:
  - `providerLegId`
  - `providerMessageId`
  - `providerEventId`
  - `providerNumber`
- `providerNeutral = true`
- `providerSpecificFieldsStripped = true`
- `providerBranchingInDomain = false`

### Provider failure classification

Provider-backed dispatch failures must surface normalized classifications rather than raw vendor errors.

- `auth_configuration`
- `temporary_provider_failure`
- `invalid_request`
- `unknown_provider_failure`
- `retryable`

## Deferred Surface

The contract may still expose `startBridgeSession(command)` as a future-compatible method, but `endCall(command)` is now part of the concrete shared adapter surface.
