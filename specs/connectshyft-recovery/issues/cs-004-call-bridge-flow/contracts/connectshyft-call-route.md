# Contract: ConnectShyft Call Route

## Purpose

Document the ConnectShyft application-facing contract for starting and observing bridge-session orchestration.

## Route Ownership

- `connectshyft-api` owns `POST /api/v1/connectshyft/threads/:threadId/call`
- `connectshyft-api` also owns `GET /api/v1/connectshyft/threads/:threadId` for authoritative bridge-state readback
- `admin-api` continues to own `/api/v1/auth/*` and `/api/v1/platform/admin/*`

## Request Expectations

- `threadId` comes from the route path
- existing ConnectShyft request context still provides:
  - `tenantId`
  - `orgUnitId`
  - actor/user context
  - optional `providerKey`
  - optional `Idempotency-Key`
- the route accepts an operator callback contact point through `operatorPhoneId`, `operatorContactPointId`, `operatorPhone`, or `operatorCallbackPhone`
- the route may continue to accept existing call-policy inputs, but the application normalizes them into bridge-session orchestration rather than direct provider dispatch
- the route still accepts a neighbor callback through `targetPhone`

## Response Expectations

- success uses the canonical shared response envelope
- success returns provider-neutral bridge session information at `data.bridgeSession` with the canonical shape:

```json
{
  "bridgeSessionId": "bridge-session-1001",
  "status": "neighbor_dialing",
  "sessionState": "neighbor_dialing",
  "failureCode": null,
  "failureMessage": null,
  "operatorLegState": "answered",
  "neighborLegState": "ringing",
  "operatorLeg": {
    "legId": "bridge-leg-operator-1001",
    "status": "answered",
    "failureCode": null,
    "failureMessage": null
  },
  "neighborLeg": {
    "legId": "bridge-leg-neighbor-1001",
    "status": "ringing",
    "failureCode": null,
    "failureMessage": null
  }
}
```

- `sessionState`, `operatorLegState`, `neighborLegState`, `failureCode`, and `failureMessage` are the authoritative UI-facing fields
- `status` remains present for backward-compatible server consumers, but the UI must treat the provider-neutral aliases above as canonical
- success still includes deterministic provider resolution metadata and replay-safe metadata when applicable
- success still includes `dispatch.providerKey` and operator-leg `providerLegId` for existing backend reconciliation behavior
- success must not expose raw Telnyx request or response payloads
- provider identifiers may be persisted server-side for reconciliation, but they must not be required by the UI to drive bridge state

## Thread Detail Read Expectations

- `GET /api/v1/connectshyft/threads/:threadId` returns the same provider-neutral `data.bridgeSession` summary when a bridge session exists for the thread
- the thread detail route must read persisted bridge state so refresh and re-entry do not depend on frontend memory

## Behavioral Guarantees

- the route starts persisted bridge orchestration rather than a one-off direct call-leg dispatch
- bridge session state is authoritative outside frontend state
- operator leg initiation happens through the provider-neutral telephony interface
- route handlers do not perform Telnyx-specific branching

## Failure Expectations

- refusal paths remain truthful about whether provider dispatch was attempted
- persistence failures prevent the route from claiming a bridge session exists when it does not
- provider dispatch failures surface as route-level failures without moving bridge orchestration into the UI
- if no operator callback number is available, the route returns a truthful business refusal instead of pretending a one-leg call was started

## Webhook Integration Expectations

- provider webhook events still enter through the existing ConnectShyft webhook ingress
- webhook verification and translation occur before bridge orchestration
- webhook replay suppression occurs before duplicate bridge progression side effects are applied
- bridge-capable webhook handling loads persisted bridge aggregates by provider leg id and returns the updated provider-neutral bridge state in the response body
