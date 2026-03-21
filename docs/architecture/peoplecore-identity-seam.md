# PeopleCore Identity Seam

## Status

Authoritative for the Slice 12 ConnectShyft-to-PeopleCore identity seam.

## Purpose

The seam lets ConnectShyft consult PeopleCore-owned identity persistence without changing current ConnectShyft route envelopes or immediately replacing ConnectShyft neighbor ownership.

Current implementation lives in:

- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`

## What The Seam Does

The seam currently supports:

- resolving subject candidates by normalized contact point
- loading PeopleCore contact points and current links first
- preserving deterministic ConnectShyft outcomes for:
  - auto-merge allowed
  - no match
  - no-auto-merge for shared or unverified contact points
  - ambiguous/manual-resolution outcomes
  - deleted-only exclusion where already characterized
- exposing the normalized contact-point value back to ConnectShyft callers
- running best-effort internal hook writes for provisional identity and resolver review creation where enabled

## Current Flow

1. ConnectShyft normalizes the inbound phone value.
2. The seam loads PeopleCore `ContactPoint` and current `ContactPointLink` records for that normalized value.
3. The seam also loads the current ConnectShyft neighbor candidates needed to preserve existing route/module behavior.
4. The existing ConnectShyft identity boundary still produces the outward decision shape and refusal semantics.
5. If hook context is enabled, the seam may best-effort:
   - create provisional PeopleCore person foundation on safe `no_match` flows
   - create resolver-review foundation on ambiguous flows

## Ownership Split In Slice 12

PeopleCore now owns:

- person identity records
- household identity records
- contact-point truth and history
- resolver-review persistence
- provisional person and resolver-review hook foundations behind the seam

ConnectShyft still owns:

- neighbor APIs and neighbor lifecycle
- conversation/thread continuity
- message, call, voicemail, provider, and timeline behavior
- inbound/outbound transport orchestration
- current external response envelopes

## Non-Goals

The seam does not:

- replace ConnectShyft neighbors with PeopleCore persons at the API boundary
- redesign route envelopes
- rebind conversations or timelines directly to PeopleCore persons
- move provider, webhook, bridge, or canonical-event ownership
- implement the Application Shell

## Deferred Work

Still deferred beyond Slice 12:

- controlled migration of more identity authority away from ConnectShyft neighbor lookup
- explicit neighbor-to-person convergence strategy
- conversation rebinding mechanics
- resolver UI and broader PeopleCore operational workflows

## Slice 13 Target

Slice 13 should focus on ConnectShyft identity refinement and a controlled migration of more identity authority behind this seam.

It should not default to Application Shell work.
