# ConnectShyft Inbound Webhook Notes

## Current ownership

The ConnectShyft inbound webhook surface is currently split across these files:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns only route registration for:
    - `POST /webhooks/inbound`
    - `POST /webhooks/sms`
  - owns the currently registered inbound webhook core execution path that preserves the existing inbound SMS, inbound voice, voicemail, transcription callback, and auto-claim behavior
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookInbound.ts`
  - owns inbound-webhook route handoff and delegates execution through the shared helper boundary with deterministic `inbound` route preparation
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookSms.ts`
  - owns SMS-webhook route handoff and delegates execution through the shared helper boundary with deterministic `sms` route preparation
- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
  - owns shared inbound route-entry prerequisite handling
  - owns capability enforcement for webhook access
  - owns provider selection and signature verification at the route-entry seam
  - owns canonical event translation needed to prepare the existing core
  - owns webhook correlation resolution and rollout-context validation
  - owns prerequisite refusal mapping and the shared execution wrapper that hands the request to the existing inbound core

## What remains outside the handler boundary

Slice 9 intentionally did not move inbound telephony or provider internals out of their existing homes.

That means the following concerns remain outside the thin handlers and outside `inboundWebhookContext.ts`:

- provider internals
  - still owned by the existing inbound core in `connectshyft.ts` and provider-facing modules such as `providerRegistry.ts`
- correlation persistence and webhook-receipt orchestration internals
  - still owned by the existing inbound core in `connectshyft.ts` and `providerCorrelationMappings.ts`
- canonical event persistence and canonical payload assembly
  - still owned by the existing inbound core in `connectshyft.ts` and `canonicalEvents.ts`
- bridge-session webhook progression and bridge alignment behavior
  - still owned by the existing inbound core in `connectshyft.ts` and `bridgeSessions.ts`
- inbound SMS domain mapping and neighbor-resolution behavior
  - still owned by the existing inbound core in `connectshyft.ts` and `inboundSms.ts`
- inbound voice, voicemail artifact, and transcription internals
  - still owned by the existing inbound core in `connectshyft.ts` and `inboundVoice.ts`

Provider, correlation, canonical, bridge, and transcription internals remain intentionally deferred from the route-family extraction sequence.

## Response shape preservation rule

Slice 9 intentionally preserves the exact current inbound webhook response shapes.

That means:

- `POST /webhooks/inbound` still returns the existing success and refusal envelopes
- `POST /webhooks/sms` still returns the existing success and refusal envelopes
- existing nested provider, correlation, canonical, bridge, voicemail, transcription, auto-claim, and side-effect payload structure remains unchanged

This was deliberate. The goal of this slice was thin-router extraction, helper-boundary coverage, and ownership notes, not payload cleanup or response redesign.

## Behavior lock

Slice 9 also intentionally locks the current operational inbound behavior.

That includes:

- current inbound SMS handling and neighbor-resolution semantics
- current inbound voice behavior
- current voice auto-claim behavior
- current voicemail behavior
- current transcription callback behavior

Follow-up cleanup should treat these behaviors as locked unless characterization coverage and helper-boundary expectations are intentionally updated in a later slice.

## Telephony and provider redesign note

This slice did not redesign telephony behavior or provider behavior.

It did not:

- re-architect webhook routing semantics
- redesign provider verification or translation behavior
- redesign correlation or dedupe behavior
- redesign bridge handling
- redesign voicemail or transcription processing

## Next step

Architecture consolidation for PeopleCore / Identity Resolution / ConnectShyft model lock-in is next.

That work should build on the current thin handlers and `inboundWebhookContext.ts` boundary rather than pulling deferred provider, correlation, canonical, bridge, or transcription internals into the route-family extraction seam.
