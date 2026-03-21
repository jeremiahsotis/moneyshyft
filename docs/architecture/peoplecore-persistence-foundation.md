# PeopleCore Persistence Foundation

## Status

Authoritative for the Slice 12 PeopleCore persistence foundation.

## Scope

Slice 12 establishes the first persistence-backed PeopleCore identity substrate.

Canonical migration authority:

- `shared/database/migrations/20260321100000_create_peoplecore_identity_foundation.ts`

Application-facing access layer:

- `apps/connectshyft-api/src/modules/peoplecore/store.ts`
- `apps/connectshyft-api/src/modules/peoplecore/service.ts`

## Persisted Tables

PeopleCore now has persistence-backed tables for:

- `people.persons`
- `people.households`
- `people.household_memberships`
- `people.contact_points`
- `people.contact_point_links`
- `people.contact_point_events`
- `people.resolver_reviews`

## What PeopleCore Now Owns In Persistence

PeopleCore persistence now owns:

- person lifecycle state, including provisional and merged states
- household and household-membership identity context
- normalized contact-point records and current/historical links
- contact-point event history
- resolver-review objects for ambiguity and correction workflows

Contracts aligned for this foundation live under:

- `libs/contracts/src/people`

## Current Access Pattern

Slice 12 intentionally keeps the foundation narrow:

- minimal store/service operations only
- tenant scoping everywhere
- org-unit scoping where applicable
- no full CRUD expansion
- no public API replacement of ConnectShyft neighbor flows

## What This Foundation Does Not Do Yet

Slice 12 does not yet:

- replace ConnectShyft neighbor persistence
- own ConnectShyft conversations, timelines, or provider activity
- persist Address or Relationship tables
- expose a full PeopleCore application surface
- perform full rebinding or migration of communication history

## Deferred After Slice 12

Next work should build on this substrate instead of bypassing it:

- broader identity authority behind the seam
- explicit convergence between ConnectShyft neighbors and PeopleCore persons
- resolver workflows beyond internal hook scaffolding
- later PeopleCore UI or Shell work in separate slices
