# Spec - ConnectShyft Neighbor Texting Preference Persistence and Display

Status: Ready for SpecKit

## Governing contracts

- `architecture/connectshyft/runtime-host-reality-contract.md`
- `architecture/connectshyft/neighbor-texting-preference-contract.md`

## Supporting files required

- `specs/connectshyft-texting-preference/bootstrap-prompts.md`
- `specs/connectshyft-texting-preference/implementation-checklist.md`
- `.github/pull_request_template/connectshyft-texting-preference.md`

## Problem statement

When a neighbor is saved with texting preference set to Yes, the interface still displays `Texting Preference Unknown`.

This indicates a mismatch somewhere in:
- persistence
- API serialization
- response mapping
- UI display mapping

## Runtime host reality

The current runtime host is:

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/...`

This issue must patch the current runtime host surgically.

## Outcome

Ensure the system behaves consistently so that:

- default `prefers_texting` is `YES`
- create/update persistence stores the intended enum
- API responses return the correct enum
- UI renders the correct label
- `YES` does not degrade to `UNKNOWN`

## Scope

In scope:
- current ConnectShyft runtime under `apps/moneyshyft-api`
- DB/API/UI enum mapping path
- create/update behavior
- response serialization
- display mapping
- tests
- PR guardrails

Out of scope:
- lane-convergence refactor
- moving runtime into `apps/connectshyft-api`
- SMS target resolution logic
- provider adapter redesign
- unrelated UI redesign

## Functional requirements

### FR-1 Canonical enum
`prefers_texting` must remain one of:
- `YES`
- `NO`
- `UNKNOWN`

### FR-2 Default behavior
New neighbors default to `YES`.

### FR-3 Persistence integrity
Create/update paths must persist the intended enum and must not silently coerce `YES` to `UNKNOWN`.

### FR-4 API response integrity
API responses must return the persisted canonical enum.

### FR-5 UI mapping integrity
The UI must display labels from canonical enum values only.

### FR-6 No false unknowns
The UI must not display `Texting Preference Unknown` when the stored value is `YES`.

## Acceptance criteria

- a new neighbor saved without explicit override persists `YES`
- a neighbor saved as `YES` returns `YES` in API response
- UI displays the expected label for `YES`
- no runtime path in current ConnectShyft host degrades `YES` to `UNKNOWN`
