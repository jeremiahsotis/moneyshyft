# ConnectShyft Remediation Contract

## Best-practice recommendation

Treat this as one bounded remediation program with five locked workstreams, executed in order, with explicit refusal of adjacent work.

The right move is not to "keep iterating ConnectShyft" loosely. The right move is to close the architectural gaps first, then rebuild the UI on the correct shell.

## Problem statement

ConnectShyft currently has five coupled failures:

1. no durable operator phone identity model
2. no real outbound Telnyx SMS/voice implementation behind the route surface
3. no true bridged call session orchestration
4. incomplete error handling, audit durability, and replay-safe idempotency for outbound comms
5. a UI that still renders generic admin-card pages instead of the approved communication-first product

These are not separate bugs. They are one broken vertical slice.

## Locked decisions

### Decision 1: operator phone numbers are first-class identity records

Do not store operator callback numbers as a one-off string on `users`.

Implement a dedicated user phone identity table and service that can later be absorbed into People Core with minimal churn.

### Decision 2: friendly input at the boundary, E.164 internally

Operators type normal phone numbers.

The system normalizes to canonical E.164 for storage and provider use.

E.164 is an internal representation, not a user responsibility.

### Decision 3: Telnyx is the real outbound provider for V1

Use `TELNYX_API_KEY` for outbound adapter calls.

Keep provider-neutral adapter boundaries in place, but stop pretending the current stubbed adapter is production-ready.

### Decision 4: outbound voice is operator-leg first, then neighbor-leg, then bridge

No neighbor leg is dialed until the operator leg answers.

No automatic retry or redial.

### Decision 5: outbound actions are durable workflows, not fire-and-forget side effects

SMS and call dispatch both require:

- idempotency key handling
- durable local attempt/session records
- audit persistence
- provider correlation mapping
- replay-safe webhook application

### Decision 6: UI rebuild follows the approved mobile-first prototype

Do not patch the current shells cosmetically.

Replace them with a ConnectShyft shell and shared component set aligned with the approved prototype and the broader reusable UI direction.

## Concrete repo diagnosis

The current repo already explains part of the failure:

- `/app/connectshyft/mine` is routed to `ConnectShyftInboxView.vue`
- `/app/connectshyft/settings` is routed to `ConnectShyftMoreView.vue`
- current ConnectShyft views still use generic centered shells like `max-w-4xl` and `max-w-3xl`
- current inbox and thread surfaces expose internal metadata and settings-style cards in the primary operator workflow
- provider registry enforces bridge-only/manual-retry policy, but the actual adapter dispatch still returns synthetic provider results instead of real Telnyx API behavior
- number mapping code still carries `twilio*` naming in types, columns, validation, and routes

That means the repo has policy scaffolding, but not a finished product slice.

## Scope in

This remediation includes only the following:

1. operator phone storage and normalization
2. outbound SMS through Telnyx adapter
3. outbound voice bridge flow through Telnyx adapter and call control
4. audit, idempotency, webhook replay, and provider correlation completion
5. ConnectShyft inbox/thread/more shell and component rebuild
6. provider-era naming cleanup required by the above work

## Scope out

This remediation does not include:

- full People Core extraction
- full CaseShyft implementation
- full ProgramShyft implementation
- broad monorepo shell redesign outside ConnectShyft touchpoints
- omnichannel provider support beyond current adapter-neutral contract
- SIP softphone, browser calling, or WebRTC calling
- broad analytics/dashboard work
- new escalation policy design beyond what is needed to preserve existing behavior

## Workstreams

## Workstream 1: operator phone identity + normalization

Deliver:

- user phone identity persistence
- shared normalization service
- operator-facing CRUD + primary selection + verification status surface
- outbound resolution rules for calls and SMS

Dependency: none

## Workstream 2: real Telnyx outbound adapter

Deliver:

- `TELNYX_API_KEY` outbound message call
- `TELNYX_API_KEY` outbound voice leg creation call
- real provider response mapping into canonical dispatch results
- real failure classification

Dependency: Workstream 1 complete

## Workstream 3: bridge session orchestration

Deliver:

- operator leg creation
- answer-driven neighbor leg creation
- call control bridge command
- completion/hangup state progression
- durable call session records

Dependency: Workstream 2 complete

## Workstream 4: audit + idempotency + replay safety

Deliver:

- request idempotency
- provider event idempotency
- monotonic transition guards
- durable audit + outbox persistence
- reconciliation path for partial post-dispatch persistence failures

Dependency: Workstreams 2 and 3 substantially complete

## Workstream 5: UX/UI rebuild

Deliver:

- ConnectShyft shell
- queue pane
- timeline pane
- neighbor snapshot rail
- mobile-first and desktop expansion behavior from the approved prototype
- removal of raw telecom/routing internals from primary operator surfaces

Dependency: data contracts for Workstreams 1 through 4 locked

## Architecture guardrails

### Guardrail 1: People-Core-ready, not People-Core-blocking

Use identity-style tables and services that can later move under People Core.

Do not hard-wire operator phones into ConnectShyft thread rows, thread state tables, or random user profile blobs.

### Guardrail 2: provider-neutral domain, provider-specific adapter

Allowed in domain:

- outbound message requested
- operator leg dialing
- neighbor leg answered
- session bridged
- dispatch failed

Allowed only in adapter/integration layer:

- Telnyx request/response shape
- Telnyx headers
- Telnyx webhook event mapping
- Telnyx call control identifiers

### Guardrail 3: reusable UI path stays open

ConnectShyft-specific components may exist, but shell primitives should be named and structured so they can later converge with shared Shyft shell/component work.

Examples:

- shell
- pane
- card
- pill
- action row
- snapshot rail

Not examples:

- giant monolithic `ConnectShyftEverythingView.vue`
- duplicated desktop-only design language that fights the mobile source layout

### Guardrail 4: no new Twilio language

All new code must use provider-neutral or current-provider-neutral naming.

Preferred examples:

- `providerNumberE164`
- `providerMessageId`
- `providerLegId`
- `outboundNumberE164`

Avoid in all new code:

- `twilioNumberE164`
- `twilioCallSid`
- provider-specific validation helpers outside adapter code

## Delivery phases

### Phase A: contract lock

Before implementation starts, freeze:

- table names
- route names
- idempotency contract
- UI information architecture
- acceptance test matrix

### Phase B: backend vertical slice

Complete one real outbound SMS flow and one real outbound voice call flow end to end.

### Phase C: UI rebuild on stable contracts

Once backend contracts are stable enough, rebuild inbox/thread/more against those contracts.

### Phase D: cleanup and migration

Remove stale route/view coupling, provider-era naming, and obsolete shells.

## Done means

This remediation is done only when all of the following are true:

- operator can store a callback phone without dealing with E.164
- operator can initiate outbound SMS through real Telnyx dispatch
- operator can initiate outbound voice where operator leg answers first, neighbor leg answers second, and bridge occurs through call control
- duplicate client requests do not create duplicate outbound dispatches
- duplicate webhook events do not double-apply transitions
- audit trail shows who initiated the action, what number was used, what provider IDs were involved, and what happened
- inbox/thread/more visually and structurally match the approved direction
- raw telecom/routing identifiers no longer dominate operator-facing UI

## Counterpoint

It would be faster to patch just the UI first.

That is the wrong order.

If the data contracts stay wrong, the UI rebuild will either drift immediately or hard-code workarounds that block People Core and reusable UI convergence later.
