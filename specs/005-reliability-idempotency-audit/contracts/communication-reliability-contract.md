# Contract: CS-005 Communication Reliability

## Purpose

Define the external and internal contract changes required for ConnectShyft reliability hardening without introducing new feature surfaces or provider-specific leakage.

## External HTTP Surfaces

### Outbound mutation routes

The existing lane-owned ConnectShyft mutation routes remain the relevant external surfaces:

- `POST /api/v1/connectshyft/threads/:threadId/messages`
- `POST /api/v1/connectshyft/threads/:threadId/call`

Contract requirements:

- Each route accepts `Idempotency-Key` in the request header.
- An equivalent body-level `idempotencyKey` may still be normalized for backward compatibility where already supported, but the authoritative transport contract is the header.
- The route must persist idempotency scope before invoking `sendSms`, `startOutboundCall`, or `startBridgeSession`.

Duplicate behavior:

- Same idempotency scope + same materially relevant fingerprint: return the original or current authoritative result, marked as replay-safe or existing.
- Same idempotency scope + different materially relevant fingerprint: reject with conflict semantics and no new provider side effect.

### Webhook ingress routes

The existing ConnectShyft webhook ingress routes remain the relevant external provider-entry surfaces:

- `POST /api/v1/connectshyft/webhooks/inbound`
- `POST /api/v1/connectshyft/webhooks/sms`

Contract requirements:

- Verify provider signature before processing.
- Persist or checkpoint receipt before event application when practical.
- Perform duplicate detection before bridge/message domain application.
- Translate raw provider payloads into provider-neutral internal events exactly once at the infrastructure edge.

Duplicate behavior:

- First valid receipt: process normally and mark processed.
- Replay/duplicate receipt: suppress duplicate side effects, append duplicate audit evidence, and return a replay-safe success response.

## Internal Contract Surfaces

### Idempotency

Shared domain contract under `domains/communication/reliability` must expose:

- typed operation names
- durable record status
- `beginOperation(...)`
- `completeOperation(...)`
- conflict vs return-existing decisions

Required semantics:

- idempotency begins before side effects
- conflict is based on request fingerprint mismatch
- authoritative response snapshots may be stored for replay-safe return behavior

Materially relevant request fingerprint inputs for CS-005 are:

- `send_sms`: `threadId`, normalized destination contact point or phone, normalized message body, channel, actor scope
- `start_outbound_call`: `threadId`, target participant or contact point, selected outbound number, channel, actor scope
- `start_bridge_session`: `threadId`, operator participant, target participant or contact point, selected outbound number, channel, actor scope
- `apply_provider_event`: `providerName`, normalized internal event type, provider event identity, and correlated internal bridge or message resource when already resolved

### Retry

Shared domain retry policy under `domains/communication/reliability/retryPolicy.ts` must remain:

- bounded
- classification-driven
- incapable of bypassing domain state ownership

Initial implementation contract:

- only retryable classified failures may schedule retry intent
- retry persistence records `attempt_count`, `next_retry_at`, and exhausted state
- no standalone retry subsystem or provider-side workflow redesign is introduced
- CS-005 persists retry intent only; execution of a future retry attempt is out of scope for this feature

### Audit

Shared domain audit contract under `domains/communication/audit` must remain append-only and capture:

- `correlation_id`
- actor identity
- operation name
- target entity
- channel
- result state
- idempotency key
- provider references when present

Required audit result states:

- `succeeded`
- `failed`
- `ignored_duplicate`
- `retrying`
- `exhausted`

## Provider Boundary Rules

- Provider adapters continue to expose only normalized provider-neutral results above infrastructure.
- Provider-specific webhook shapes, signature semantics, and error payloads remain infrastructure-owned.
- Reliability hardening may consume normalized provider failure classification, but must not introduce new raw provider coupling in routes, domain logic, or audit contracts.
- Unverified webhook requests must be rejected before receipt persistence, translation, and downstream domain side effects.

## Non-Goals

- No new public reliability endpoints
- No bridge orchestration redesign
- No provider adapter redesign
- No UI contract changes

## Implementation Notes

- Durable outbound idempotency is implemented in `apps/connectshyft-api/src/modules/connectshyft/communicationReliability.ts` and is invoked before provider side effects in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Append-only audit recording is implemented in `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts` and records command success/failure/duplicate plus webhook applied/retrying/exhausted outcomes.
- Webhook receipt persistence continues to use `cs_webhook_receipts`; CS-005 adds only minimal retry metadata (`next_retry_at_utc`, `last_failure_classification`) and does not introduce a worker or scheduler.
