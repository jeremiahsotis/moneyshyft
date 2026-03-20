# ConnectShyft Router Refactor Plan — Add-on Update for Slice 5

## Current status

### Completed
- Slice 4 extracted the first low-risk route family:
  - `/settings/navigation`
  - `/availability`
  - `/context`
  - `/inbox`

### Next extraction target
- Slice 5 extracts the thread read surface:
  - `/threads/:threadId`
  - `/threads/:threadId/timeline`

## Why thread read is next

Thread read is the next correct cut because it is:

- product-critical
- foundational to the conversation experience
- safer than outbound or webhook extraction
- a prerequisite for later lifecycle and PeopleCore convergence work

## Response-shape rule for Slice 5

Slice 5 preserves the current thread detail and timeline response shapes as much as possible, even if they are not the long-term ideal.

This is deliberate.

The refactor goal is:
- thinner router
- safer boundaries
- preserved behavior

not premature payload redesign.

## Long-term payload direction

The long-term direction remains a single canonical thread detail payload for the UI.

That direction should be pursued later, after:
- thread read routes are cleanly extracted
- lifecycle actions are separated
- neighbor/PeopleCore convergence is clearer

## Updated extraction order

1. settings/context/inbox/availability
2. thread read surface
3. lifecycle actions
4. neighbors / identity bridge
5. outbound actions
6. inbound/webhooks/telephony

## Practical rule

Every route-family extraction must answer:

1. what behavior is pinned by characterization tests
2. what handler boundary is introduced
3. what response shape is preserved
4. what is explicitly deferred
