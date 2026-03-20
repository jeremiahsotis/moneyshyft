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

### Next extraction target
- Slice 6 extracts lifecycle actions:
  - `/threads/:threadId/claim`
  - `/threads/:threadId/takeover`
  - `/threads/:threadId/close`

## Why lifecycle is next

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

1. settings/context/inbox/availability
2. thread read surface
3. lifecycle actions
4. neighbors / identity bridge
5. outbound actions
6. inbound/webhooks/telephony

## Practical rule

Every lifecycle extraction must answer:

1. what success/refusal behavior is pinned by characterization tests
2. what handler boundary is introduced
3. what response shape is preserved exactly
4. what remains explicitly deferred
