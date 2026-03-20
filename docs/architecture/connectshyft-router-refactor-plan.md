# ConnectShyft Router Refactor Plan — Add-on Update for Slice 6

## Current status

### Completed
- Slice 4 extracted the first low-risk route family:
  - `/settings/navigation`
  - `/availability`
  - `/context`
  - `/inbox`

- Slice 5 extracted the thread read surface:
  - `/threads/:threadId`
  - `/threads/:threadId/timeline`

- Slice 6 extracted lifecycle actions:
  - `/threads/:threadId/claim`
  - `/threads/:threadId/takeover`
  - `/threads/:threadId/close`

### Next extraction target
- neighbors / identity bridge

### Intentionally deferred after Slice 6
- outbound actions remain deferred on purpose
- inbound, webhooks, and telephony remain deferred on purpose

## Why lifecycle was the right next cut

Lifecycle is the next correct cut because it is directly tied to:
- Inbox behavior
- My Conversations behavior
- ownership transitions
- operator workflow
- thread state transitions

It is a safer and more coherent next move than outbound or webhook extraction.

## Lifecycle preservation rules for Slice 6

Slice 6 preserves:
- exact current lifecycle response shapes
- current claim/takeover/close behavior
- claim visibility semantics:
  - moves into My Conversations
  - may still appear in Inbox
  - remains visibly recognized as claimed

This is deliberate. The goal is route extraction and boundary cleanup, not behavior redesign.

## Updated extraction order

1. settings/context/inbox/availability (Slice 4 complete)
2. thread read surface (Slice 5 complete)
3. lifecycle actions (Slice 6 complete)
4. neighbors / identity bridge (next)
5. outbound actions (deferred)
6. inbound/webhooks/telephony (deferred)

## Practical rule

Every lifecycle extraction must answer:

1. what success/refusal behavior is pinned by characterization tests
2. what handler boundary is introduced
3. what response shape is preserved exactly
4. what remains explicitly deferred
