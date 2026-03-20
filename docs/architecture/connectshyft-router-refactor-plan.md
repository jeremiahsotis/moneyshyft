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

### Next extraction target
- Slice 7 extracts the neighbor / identity bridge route family:
  - neighbor CRUD
  - identity match
  - merge

## Why neighbor / identity is next

This is the next correct cut because it is the seam between:
- ConnectShyft-local neighbor operations
- identity matching and merge behavior
- future PeopleCore convergence

It is safer to clarify this seam before extracting outbound actions, which still rely on current neighbor and identity behavior.

## Preservation rules for Slice 7

Slice 7 preserves:
- exact current response shapes
- exact current merge behavior

It only adds:
- thinner router boundaries
- explicit handler ownership
- light documentation/seam prep for future PeopleCore convergence

This is deliberate. The goal is route extraction and seam cleanup, not model migration.

## Updated extraction order

1. settings/context/inbox/availability
2. thread read surface
3. lifecycle actions
4. neighbor / identity bridge
5. outbound actions
6. inbound/webhooks/telephony

## Practical rule

Every neighbor / identity extraction must answer:

1. what CRUD and identity behavior is pinned by characterization tests
2. what handler boundary is introduced
3. what response and merge behavior is preserved exactly
4. what remains ConnectShyft-local vs future PeopleCore seam work
