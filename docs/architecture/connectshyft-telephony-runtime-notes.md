# ConnectShyft Telephony Runtime Notes

## Purpose

This note records the actual ConnectShyft telephony runtime boundary after Slice 16.

It is a stabilization note, not a redesign plan. The goal is to make future work start from the current repository ownership instead of assuming telephony extraction is already complete or that PeopleCore has replaced the ConnectShyft runtime.

## Slice 16 Lock

Slice 16 is telephony runtime stabilization, not telephony expansion.

It preserves:

- current route contracts
- current refusal envelopes
- current replay-safe and idempotent behavior
- current provider-neutral architecture
- current PeopleCore and ConnectShyft seam boundaries

It does not:

- redesign provider selection
- add new transport modes
- change ambiguity policy
- claim that PeopleCore already replaces the ConnectShyft neighbor runtime

## Telephony Runtime Still In `connectshyft.ts`

`apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` still owns a narrow but real telephony runtime surface.

That remaining surface is:

- route registration for `POST /threads/:threadId/call`, `POST /threads/:threadId/messages`, `POST /webhooks/inbound`, and `POST /webhooks/sms`
- the registered inbound webhook core executor (`performInboundWebhook`) that preserves the current webhook envelope, correlation, replay-safe, and refusal behavior
- route-local inbound neighbor reuse helpers that preserve explicit-neighbor reuse, correlated-thread reuse, retryable persistence refusal behavior, and ambiguity blocking without moving those envelopes into deep modules
- the synthetic lifecycle thread-detail fallback for `GET /threads/:threadId`, including the completed-bridge-session guard and canonical timeline fallback used to keep fresh reads coherent

This means telephony entry points are not fully absent from the route file. They are stabilized where they currently live, with delegation preserved where it already exists.

## Module-Owned Telephony Runtime

The following behaviors remain intentionally owned by existing domain and infrastructure modules:

- `http/inboundWebhookContext.ts`: inbound webhook access context, core-executor registration, and route-entry HTTP prerequisite handling
- `senderNumberResolver.ts`: outbound sender-number resolution and its characterized refusal semantics
- `providerRegistry.ts`: deterministic provider adapter selection, dispatch policy enforcement, and provider-verification mapping
- `bridgeSessions.ts`: bridge-session start, persistence, webhook progression, and aggregate loading
- `smsPreferenceOverrides.ts`: SMS override validation and persistence
- `identityResolver.ts`: PeopleCore-aware subject lookup by contact point
- `neighbors.ts`: active-neighbor reuse, inbound neighbor creation, and inbound texting-preference application
- existing canonical-event, provider-correlation, communication-reliability, and audit-log modules: persistence, replay safety, and event recording

Slice 16 does not move those responsibilities back into the router, and it does not introduce a substitute telephony application layer.

## Ambiguity And PeopleCore Boundary

Ambiguity rules remain governed by Slices 13 through 15.

That means Slice 16 does not change the following rules:

- PeopleCore can invalidate certainty but does not assert person-to-neighbor equivalence
- unavailable PeopleCore and no current PeopleCore link preserve legacy behavior
- multiple current links or a single conflicting link remain ambiguous
- ambiguous inbound identity outcomes remain blocking where already characterized
- true resolver operations remain deferred to Slice 15 or later semantics, not pulled into telephony stabilization

PeopleCore remains an identity seam in this slice. It is not a replacement for ConnectShyft neighbor runtime ownership.

## Deferred For Future Telephony Audit Or Launch Readiness

The following work remains deferred after Slice 16:

- auditing whether any remaining telephony helpers in `connectshyft.ts` can move without changing current envelopes
- launch-readiness review of the current replay-safe persistence, bridge progression, and webhook-operational seams
- documentation or test expansion around telephony ownership only if it preserves the current provider-neutral and ambiguity-policy boundaries

The following are explicitly not implied by this note:

- provider redesign
- PeopleCore-driven neighbor replacement
- reconciliation or cross-system equivalence solving
- automatic winner selection for ambiguous identity outcomes
