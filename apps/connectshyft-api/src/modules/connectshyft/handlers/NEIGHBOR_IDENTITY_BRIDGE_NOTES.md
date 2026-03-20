# ConnectShyft Neighbor Identity Bridge Notes

## Current ownership

The ConnectShyft neighbor / identity bridge surface is currently split across these files:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns only route registration for:
    - `POST /neighbors`
    - `GET /neighbors`
    - `GET /neighbors/:neighborId`
    - `PUT /neighbors/:neighborId`
    - `DELETE /neighbors/:neighborId`
    - `POST /neighbors/identity-match`
    - `POST /neighbors/merge`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborCreate.ts`
  - owns neighbor-create request handoff, refusal mapping, and preserved create response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectNeighbors.ts`
  - owns neighbor-list request handoff and preserved list response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectNeighborDetail.ts`
  - owns neighbor-detail request handoff and preserved detail response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/putConnectNeighbor.ts`
  - owns neighbor-update request handoff, edit-policy payload assembly, and preserved update response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/deleteConnectNeighbor.ts`
  - owns neighbor soft-delete request handoff and preserved delete response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborIdentityMatch.ts`
  - owns identity-match request handoff, identity bridge refusal mapping, and preserved identity-match response assembly
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectNeighborMerge.ts`
  - owns merge request handoff, merge refusal mapping, and preserved merge response assembly
- `apps/connectshyft-api/src/modules/connectshyft/http/neighborIdentityContext.ts`
  - owns shared neighbor / identity prerequisite resolution, orgUnit context loading, `neighborId` parsing, include-deleted gating, relationship-gated edit policy resolution, identity-match side-effect persistence, merge side-effect orchestration, and future seam notes for PeopleCore convergence

## Response shape preservation rule

Slice 7 intentionally preserves the exact current response shapes for the full neighbor / identity bridge family.

That means the handlers still return the existing envelope structures for:

- neighbor create
- neighbor list
- neighbor detail
- neighbor update
- neighbor soft delete
- identity match
- merge

This was deliberate. The goal of this slice was thin-router extraction and a cleaner bridge boundary, not payload redesign.

## Merge behavior preservation rule

Slice 7 also intentionally preserves the exact current merge behavior.

That includes:

- the current merge confirmation requirements
- the current invalid-request and business-refusal mapping
- the current side-effect persistence behavior and fallback handling
- the current success payload shape and merge metadata fields

Follow-up cleanup should treat merge semantics as locked unless characterization coverage is intentionally updated in a later slice.

## What remains ConnectShyft-local

The following behavior remains ConnectShyft-local after Slice 7:

- local neighbor CRUD orchestration
- identity-match request handling and refusal mapping
- merge execution and current side-effect orchestration
- current relationship-gated edit policy behavior
- current scope payload assembly and refusal envelope behavior

Slice 7 did not migrate any of this behavior into PeopleCore contracts or storage.

## Future PeopleCore seam preparation

Slice 7 only prepared a light future seam toward PeopleCore.

That preparation currently means:

- the neighbor / identity route family now has explicit handler ownership
- shared neighbor / identity prerequisites now live behind `neighborIdentityContext.ts`
- the bridge boundary is documented as the seam where future PeopleCore convergence can swap internals without re-thickening the router

It does not mean PeopleCore convergence is complete. No PeopleCore migration, contract replacement, or merge redesign was attempted here.

## Deferred scope

The following work remains deferred beyond the neighbor / identity bridge family:

- outbound call extraction
- outbound message extraction
- inbound SMS extraction
- inbound voice extraction
- webhook and provider-correlation extraction
- PeopleCore-backed neighbor model convergence
- response redesign or merge semantic changes

## Guardrails for future work

When editing neighbor / identity handlers in later slices:

1. Keep route registration thin in `connectshyft.ts`.
2. Keep shared neighbor / identity prerequisites and refusal mapping in `neighborIdentityContext.ts`.
3. Preserve the current response shapes unless characterization coverage is intentionally updated.
4. Preserve the current merge behavior unless a later slice explicitly changes and re-characterizes it.
5. Do not fold outbound dispatch logic into the neighbor / identity handler family.
6. Do not pull inbound or webhook orchestration into the neighbor / identity helper boundary.
7. Treat PeopleCore convergence as a future seam change, not opportunistic cleanup inside handler edits.

## Explicit separation note

Neighbor / identity extraction is now separate from outbound and webhook extraction.

That separation should stay explicit. Follow-up cleanup should not use the neighbor / identity handler family as a place to absorb outbound action rules, provider dispatch concerns, inbound correlation work, or webhook processing. The next extraction target after Slice 7 is outbound actions, while inbound and webhook surfaces remain intentionally deferred.
