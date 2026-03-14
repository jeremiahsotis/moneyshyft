# Spec - ConnectShyft Neighbor Texting Preference Persistence and Display

Status: Ready for SpecKit

## Governing contracts

- `architecture/connectshyft/runtime-host-reality-contract.md`
- `architecture/connectshyft/neighbor-texting-preference-contract.md`

## Supporting files required

These supporting files remain shared reference artifacts outside the numbered feature folder:

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

- new-neighbor create behavior defaults `prefers_texting` to `YES`
- create/update persistence stores the intended enum
- API responses return the correct enum
- UI renders the correct label
- `YES` does not degrade to `UNKNOWN`

## Naming conventions

- Database column name: `prefers_texting`
- API response field: `prefersTexting`
- UI state field: `prefersTexting`
- Current route bodies may accept either `prefersTexting` or `prefers_texting`, but the canonical response field remains `prefersTexting`

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
New-neighbor create behavior defaults to `YES` when no explicit texting preference is provided.
This requirement does not require changing historical records or database-column defaults unless separately specified.

### FR-3 Persistence integrity
Create/update paths must persist the intended enum and must not silently coerce `YES` to `UNKNOWN`.

### FR-4 API response integrity
API responses must return the persisted canonical enum.

### FR-5 UI mapping integrity
The UI must display labels from canonical enum values only and must not display `Texting Preference Unknown` when the stored value is `YES`.

### FR-6 Route field compatibility
The current runtime surface must preserve the canonical API/UI field `prefersTexting` and may accept `prefers_texting` as a compatibility alias at the route boundary.

### FR-7 Create omission behavior
When a create request omits texting preference, the runtime must persist `YES`.

### FR-8 Update omission behavior
When an update request omits texting preference, the runtime must preserve the existing stored canonical value.

### FR-9 Invalid incoming value behavior
Invalid incoming texting preference values must be treated as omitted by the current runtime surface.
This means create behavior defaults to `YES`, update behavior preserves the existing stored canonical value, and only stored absent or invalid data may fall back to `UNKNOWN` on read.

## User stories

### US1 - Persist the selected texting preference (Priority: P1)
As a ConnectShyft operator
I want neighbor create/update flows to persist the intended texting preference
So that API responses reflect the actual stored canonical enum.

Acceptance notes:
- Create without an explicit preference returns `YES`
- Create with `YES`, `NO`, or `UNKNOWN` returns the same canonical enum
- Update preserves or changes the stored canonical enum as requested
- `YES` must not degrade to `UNKNOWN`

### US2 - Display the correct texting preference label (Priority: P2)
As a ConnectShyft operator
I want the UI to display the correct texting preference label
So that saved neighbor preferences are visible and understandable.

Acceptance notes:
- `YES` displays `Prefers Texting`
- `NO` displays `Prefers Calls Only`
- `UNKNOWN` displays `Texting Preference Unknown`
- Inbox and thread-detail snapshot surfaces use the canonical enum only

## Acceptance scenarios

### AS-1 Routing ownership unchanged
Given the current ConnectShyft runtime host under `apps/moneyshyft-api`
When this issue is implemented
Then `/api/v1/connectshyft/*` behavior remains owned by the existing lane runtime surface
And no auth or platform-admin route delegation behavior changes

### AS-2 Shared Postgres compatibility preserved
Given the shared PostgreSQL deployment model
When neighbor texting preference create/update paths are exercised
Then the feature persists canonical values using the existing shared schema
And no lane-specific migration authority or schema split is introduced

### AS-3 No deployment-topology regression
Given the current host Nginx and Dockerized API topology
When this feature is deployed
Then no port, ingress, or binding behavior changes are required for the fix

## Acceptance criteria

- a new neighbor saved without explicit override persists `YES`
- a neighbor saved as `YES` returns `YES` in API response
- update without explicit override preserves the existing stored canonical value
- invalid incoming request values behave like omission for the current runtime surface
- UI displays the expected label for `YES`
- no runtime path in current ConnectShyft host degrades `YES` to `UNKNOWN`
