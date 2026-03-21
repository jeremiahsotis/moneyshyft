# PeopleCore Identity Seam

## Status

Authoritative for the Slice 13 ConnectShyft-to-PeopleCore identity seam.

## Purpose

The seam lets ConnectShyft consult PeopleCore-owned identity persistence without changing current ConnectShyft route envelopes or immediately replacing ConnectShyft neighbor ownership.

In Slice 13, the seam follows this rule:

- PeopleCore can block certainty
- PeopleCore cannot assert person-to-neighbor identity equivalence
- disagreement becomes ambiguity instead of a silent winner selection

Current implementation lives in:

- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityAdapter.ts`
- `apps/connectshyft-api/src/modules/connectshyft/peoplecoreIdentityHooks.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`

## What The Seam Does

The seam currently supports:

- resolving subject candidates by normalized contact point
- loading PeopleCore contact points and current links first
- preserving deterministic ConnectShyft outcomes for:
  - auto-merge allowed when a single aligned winner still exists
  - no match
  - no-auto-merge for shared or unverified contact points
  - ambiguous/manual-resolution outcomes
  - deleted-only exclusion where already characterized
- exposing the normalized contact-point value back to ConnectShyft callers
- running best-effort internal hook writes for provisional identity and resolver review creation where enabled

Slice 13 explicitly recognizes these ambiguity categories:

- legacy multi-neighbor ambiguity
- PeopleCore multi-person ambiguity
- cross-system disagreement ambiguity

## Current Flow

1. ConnectShyft normalizes the inbound phone value.
2. The seam loads PeopleCore `ContactPoint` and current `ContactPointLink` records for that normalized value.
3. If PeopleCore is unavailable, the seam preserves legacy ConnectShyft behavior.
4. If PeopleCore is available but has no current person link, the seam preserves legacy ConnectShyft behavior.
5. If PeopleCore has multiple current person links, the seam returns ambiguity.
6. If PeopleCore has one current person link, the seam also loads the current ConnectShyft neighbor candidates needed to preserve existing route/module behavior:
   - legacy multiple -> ambiguity
   - legacy single aligned winner -> preserve current exact-match behavior
   - legacy single disagreement -> ambiguity
   - legacy no winner -> no-match unchanged in Slice 13
7. The existing ConnectShyft identity boundary still produces the outward decision shape and refusal semantics.
8. If hook context is enabled, the seam may best-effort:
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
- add reconciliation or crosswalk infrastructure
- auto-link PeopleCore persons to ConnectShyft neighbors
- add a merge engine or scoring engine for cross-system identity

## Deferred Work

Still deferred beyond Slice 13:

- explicit operational handling for ambiguity and resolver workflows
- explicit neighbor-to-person convergence strategy
- conversation rebinding mechanics
- resolver UI and broader PeopleCore operational workflows

## Slice 14 Handoff

The next logical slice after Slice 13 is operationalization of ambiguity and resolver handling behind this seam.

It should not default to reconciliation, crosswalk implementation, or Application Shell work.
