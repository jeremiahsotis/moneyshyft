# ConnectShyft Router Refactor Plan

## Purpose

This plan tracks the controlled reduction of `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` into a thin router with route-family handlers.

The goal is not stylistic churn. The goal is to lower architectural risk while preserving current ConnectShyft behavior.

## Current status

### Completed

#### Slice 4 completed
- `/settings/navigation`
- `/availability`
- `/context`
- `/inbox`

Outcome:
- the first low-risk route family moved behind handler boundaries
- shared access and orgUnit context resolution now live behind the handler-facing HTTP helper boundary
- characterization coverage pinned the extracted behavior before moving routes

#### Slice 5 thread read surface extracted
- `/threads/:threadId`
- `/threads/:threadId/timeline`

Outcome:
- the thread read surface now delegates through thin-router handlers
- thread read access and prerequisite loading are centralized behind the thread read helper boundary
- current thread detail and timeline response shapes were preserved on purpose
- characterization coverage pins the current read-surface behavior

## Why the current response shape was preserved

Slice 5 deliberately preserves the current thread detail and timeline payloads even though they are not the long-term ideal.

This slice is about:
- thinner router ownership
- explicit handler boundaries
- safer regression detection

It is not about redesigning the thread DTOs yet.

## Next extraction target

The next planned extraction target is lifecycle actions:

- claim
- takeover
- close

Lifecycle actions are next because they stay close to inbox and thread read behavior while avoiding the higher orchestration complexity of outbound and webhook flows.

## Intentionally deferred

The following areas remain intentionally deferred after Slice 5:

- outbound call and message actions
- inbound SMS and inbound voice flows
- webhook/provider-correlation handling
- telephony and bridge orchestration refactors
- broader payload redesign toward a single canonical thread detail contract

Outbound and webhooks remain deferred on purpose. They should not be pulled ahead of lifecycle extraction.

## Updated extraction order

1. Slice 4: settings, availability, context, inbox
2. Slice 5: thread read surface
3. Next: lifecycle actions
4. After lifecycle: neighbors / identity bridge
5. Later: outbound actions
6. Last: inbound, webhooks, and telephony-heavy flows

## Practical rule for future slices

Every router extraction slice should answer:

1. what route family moved
2. what behavior was pinned before moving it
3. what handler/helper boundary now owns it
4. what remains explicitly deferred
