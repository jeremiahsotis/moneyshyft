# ConnectShyft Router Refactor Plan — Add-on Update for Slice 7

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

- Slice 7 extracted the neighbor / identity bridge route family:
  - `POST /neighbors`
  - `GET /neighbors`
  - `GET /neighbors/:neighborId`
  - `PUT /neighbors/:neighborId`
  - `DELETE /neighbors/:neighborId`
  - `POST /neighbors/identity-match`
  - `POST /neighbors/merge`

### Next extraction target
- outbound actions

### Intentionally deferred
- inbound/webhooks remain deferred because they still carry the heaviest telephony and provider-coupled behavior.
- PeopleCore convergence remains future seam work; Slice 7 only extracted the ConnectShyft-local neighbor / identity bridge boundary.

## Why outbound is next

The next correct cut is outbound actions because the neighbor / identity seam is now explicit and pinned by characterization tests.

That keeps the extraction order low-risk:
- neighbor CRUD and identity bridge behavior stay stable behind thin handlers
- outbound routes can now depend on a clearer local boundary
- inbound/webhooks can remain deferred until the telephony-coupled surfaces are addressed directly

## What Slice 7 preserved

Slice 7 preserved:
- exact current response shapes
- exact current merge behavior

It only added:
- thinner router boundaries
- explicit handler ownership
- light documentation/seam prep for future PeopleCore convergence

This was deliberate. The goal was route extraction and seam cleanup, not model migration.

## Updated extraction order

1. settings/context/inbox/availability
2. thread read surface
3. lifecycle actions
4. neighbor / identity bridge (completed in Slice 7)
5. outbound actions (next)
6. inbound/webhooks/telephony (intentionally deferred)

## Practical rule

Every neighbor / identity extraction must answer:

1. what CRUD and identity behavior is pinned by characterization tests
2. what handler boundary is introduced
3. what response and merge behavior is preserved exactly
4. what remains ConnectShyft-local vs future PeopleCore seam work
