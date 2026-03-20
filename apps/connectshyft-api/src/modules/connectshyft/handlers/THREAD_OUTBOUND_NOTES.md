# ConnectShyft Thread Outbound Notes

## Current ownership

The ConnectShyft outbound thread surface is currently split across these files:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns only route registration for:
    - `POST /threads/:threadId/call`
    - `POST /threads/:threadId/messages`
  - owns the currently registered outbound core execution path that preserves the existing call and message behavior
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
  - owns call-route request handoff and delegates outbound execution through the shared helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadMessage.ts`
  - owns message-route request handoff and delegates outbound execution through the shared helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`
  - owns shared outbound route-family context enforcement, `threadId` parsing, shared lifecycle prerequisite loading, capability and orgUnit-membership gating, prerequisite refusal mapping, and the shared execution wrapper that hands the request to the existing outbound core

## What remains outside the handler boundary

Slice 8 intentionally did not move outbound business internals out of their existing homes.

That means the following concerns remain outside the thin handlers and outside `threadOutboundContext.ts`:

- provider selection and provider dispatch policy behavior
  - still owned by the existing outbound core in `connectshyft.ts` and provider-facing modules such as `providerRegistry.ts`
- bridge session startup and bridge-session state orchestration
  - still owned by the existing outbound core in `connectshyft.ts` and `bridgeSessions.ts`
- durable idempotency and replay handling
  - still owned by the existing outbound core in `connectshyft.ts` and `communicationReliability.ts`
- communication audit persistence
  - still owned by the existing outbound core in `connectshyft.ts` and `communicationAuditLog.ts`
- SMS preference override validation and persistence
  - still owned by the existing outbound core in `connectshyft.ts` and `smsPreferenceOverrides.ts`

Slice 8 was an extraction slice, not a provider, bridge, reliability, or audit redesign.

## Response shape preservation rule

Slice 8 intentionally preserves the exact current outbound response shapes for both routes.

That means:

- `POST /threads/:threadId/call` still returns the existing success and refusal envelopes
- `POST /threads/:threadId/messages` still returns the existing success and refusal envelopes
- existing nested provider, bridge-session, idempotency, audit, override, and side-effect payload structure remains unchanged

This was deliberate. The goal of this slice was thin-router extraction and an explicit outbound helper boundary, not payload cleanup or response redesign.

## Reopen behavior preservation rule

Slice 8 also intentionally preserves the exact current reopen behavior for closed-thread outbound flows.

That includes:

- the current same-thread reopen behavior for outbound calls
- the current same-thread reopen behavior for outbound messages
- the current response assembly that reflects reopened-thread execution exactly as characterized

Follow-up cleanup should treat reopen semantics as locked unless characterization coverage is intentionally updated in a later slice.

## Deferred scope

The following work remains deferred beyond the outbound thread family:

- inbound SMS extraction
- inbound voice extraction
- voicemail handling extraction
- transcription callback extraction
- webhook entry extraction
- webhook correlation and receipt orchestration extraction
- provider or bridge architecture redesign
- idempotency, audit, sender-resolution, or SMS-override redesign

## Guardrails for future work

When editing outbound handlers in later slices:

1. Keep route registration thin in `connectshyft.ts`.
2. Keep shared outbound prerequisites and refusal mapping in `threadOutboundContext.ts`.
3. Preserve the current response shapes unless characterization coverage is intentionally updated.
4. Preserve the current reopen behavior unless a later slice explicitly changes and re-characterizes it.
5. Do not fold provider, bridge, reliability, audit, or SMS-override internals into the thin handlers or helper boundary.
6. Do not pull inbound, webhook, or telephony callback orchestration into the outbound handler family.

## Explicit separation note

Outbound extraction is now separate from inbound, webhook, and telephony extraction.

That separation should stay explicit. Follow-up cleanup should not use the outbound handlers or `threadOutboundContext.ts` as a place to absorb inbound message intake, webhook correlation, provider signature handling, bridge webhook progression, voicemail processing, or transcription callbacks. Those surfaces remain intentionally deferred to the next slice after Slice 8.
