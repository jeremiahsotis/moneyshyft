# Contract: ConnectShyft Outbound Dispatch Integration

## Purpose

Document the existing ConnectShyft HTTP contracts that CS-003 makes truthful by replacing synthetic provider behavior with a real Telnyx adapter.

## Route Ownership

- `connectshyft-api` owns:
  - `POST /api/v1/connectshyft/threads/:threadId/messages`
  - `POST /api/v1/connectshyft/threads/:threadId/call`
- `admin-api` continues to own:
  - `/api/v1/auth/*`
  - `/api/v1/platform/admin/*`

## Message Dispatch Route

### Request

- `orgUnitId`
- `providerKey`
  - optional if default provider resolution is used
- `body`
- `targetPhone`
  - optional
- `idempotencyKey`
  - header or body as supported by existing ConnectShyft request handling

### Response Expectations

- canonical response envelope remains unchanged
- `data.providerResolution` reports requested/resolved provider deterministically
- `data.dispatch.providerMessageId` contains the real Telnyx message identifier on success
- `data.correlationMapping.messageMapping` reports whether the provider identifier mapping was created, duplicated, or skipped
- `data.replaySafe.duplicate` reports whether the response came from the idempotent replay ledger
- refusal paths remain business/client/system-safe and must not claim a dispatch occurred when Telnyx was not called

## Call Dispatch Route

### Request

- `orgUnitId`
- `providerKey`
  - optional if default provider resolution is used
- optional `targetPhone`
- optional call-policy metadata already guarded by ConnectShyft
- `idempotencyKey`

### Response Expectations

- canonical response envelope remains unchanged
- `data.providerResolution` reports requested/resolved provider deterministically
- `data.dispatch.providerLegId` contains the real Telnyx call/leg identifier on success
- `data.correlationMapping.callLegMapping` reports whether the call-leg mapping was created, duplicated, or skipped
- `data.replaySafe.duplicate` reports whether the response came from the idempotent replay ledger
- CS-003 does not expose bridge-session state in this route

## Persistence Expectations

- Successful SMS dispatch persists a thread-visible outbound message and a provider correlation mapping.
- Successful call initiation persists provider correlation data needed for later webhook reconciliation.
- Duplicate requests with the same effective idempotency key do not redispatch Telnyx side effects and reuse the original provider IDs.
