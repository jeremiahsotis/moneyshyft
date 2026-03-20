# ConnectShyft Thread Lifecycle Notes

## Current ownership

The ConnectShyft lifecycle action surface is currently split across these files:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns only route registration for:
    - `POST /threads/:threadId/claim`
    - `POST /threads/:threadId/takeover`
    - `POST /threads/:threadId/close`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadClaim.ts`
  - owns request handoff for claim and delegates lifecycle execution through the shared helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadTakeover.ts`
  - owns request handoff for takeover and delegates lifecycle execution through the shared helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadClose.ts`
  - owns request handoff for close and delegates lifecycle execution through the shared helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/http/threadLifecycleContext.ts`
  - owns lifecycle prerequisite resolution, capability and membership gating, `threadId` parsing, lifecycle-context loading, refusal mapping, side-effect orchestration, and preserved response assembly for claim/takeover/close

## Response shape preservation rule

Slice 6 intentionally preserves the exact current lifecycle response shapes.

That means claim, takeover, and close still return the existing envelope structure, including:

- `threadId`
- `context`
- `reason`
- `resolution`
- `thread`
- `lifecycleEvent`
- `sideEffectsPersisted`
- `escalation`
- `audit`
- `outbox`

This was deliberate. The goal of this slice was thin-router extraction and a cleaner lifecycle boundary, not payload redesign.

## Claim visibility rule

Claim semantics remain unchanged in this slice:

- a claimed thread moves into My Conversations
- the same thread may still appear in Inbox
- the thread should remain visibly recognized as claimed wherever it is rendered

This behavior is preserved by characterization coverage and should not be tightened casually in follow-up cleanup.

## Deferred scope

The following work remains deferred beyond the lifecycle family:

- outbound call extraction
- outbound message extraction
- inbound SMS extraction
- inbound voice extraction
- webhook and provider-correlation extraction
- PeopleCore neighbor or identity bridge convergence work
- lifecycle semantic redesign or response reshaping

## Guardrails for future work

When editing lifecycle handlers in later slices:

1. Keep route registration thin in `connectshyft.ts`.
2. Keep shared lifecycle prerequisite and refusal behavior in `threadLifecycleContext.ts`.
3. Preserve the current response shapes unless characterization coverage is intentionally updated.
4. Do not fold outbound dispatch logic into the lifecycle handlers.
5. Do not pull webhook or inbound orchestration into the lifecycle helper boundary.
6. Treat claim visibility semantics as locked until a later slice explicitly changes them.

## Explicit separation note

Lifecycle extraction is now separate from outbound and webhook extraction.

That separation should remain explicit. Follow-up cleanup should not use the lifecycle helper boundary as a place to absorb outbound reopen rules, provider dispatch concerns, inbound correlation work, or webhook processing. The next extraction target after Slice 6 is neighbors / identity bridge, while outbound and webhook surfaces remain intentionally deferred.
