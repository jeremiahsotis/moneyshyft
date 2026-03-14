# Data Model

## Entity: ConnectShyftNeighbor

**Source of truth**: `connectshyft.cs_neighbors`

**Fields**
- `neighborId`: canonical neighbor identifier
- `tenantId`: tenant scope
- `orgUnitId`: orgUnit scope
- `firstName`: normalized trimmed string
- `lastName`: normalized trimmed string
- `prefersTexting`: canonical enum exposed by runtime and UI
- `createdAtUtc`: persistence timestamp
- `updatedAtUtc`: persistence timestamp

**Validation rules**
- `prefersTexting` MUST be one of `YES`, `NO`, `UNKNOWN`
- Create defaults to `YES` when the request omits the field or provides an invalid value
- Update persists only canonical values; if omitted or invalid, the existing persisted value is preserved
- Read paths normalize any non-canonical stored value to `UNKNOWN` as a defensive fallback only

**Relationships**
- One neighbor has many `ConnectShyftNeighborPhone` records
- One neighbor may be referenced by current thread and SMS preference resolution flows

## Entity: ConnectShyftNeighborPhone

**Source of truth**: `connectshyft.cs_neighbor_phones`

**Fields**
- `phoneId`
- `neighborId`
- `label`
- `value`
- `sortOrder`
- `isPrimary`
- `isShared`
- `verificationStatus`

**Validation rules**
- At least one phone is required for create and update
- Phone values are normalized to E.164 before persistence

## Entity: ConnectShyftNeighborFormPayload

**Used by**
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- `apps/connectshyft-web/src/features/connectshyft/neighbors.ts`
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`

**Fields**
- `orgUnitId` on update/create route bodies where currently required
- `firstName`
- `lastName`
- `phones`
- `prefersTexting`

**Validation rules**
- `prefersTexting` must map to the canonical enum before reaching persistence
- The frontend selector must round-trip the canonical enum without introducing a label-derived value

## Derived Display Model: Texting Preference Chip

**Used by**
- Inbox snapshot
- Thread detail snapshot

**Mapping**
- `YES` -> `Prefers Texting`
- `NO` -> `Prefers Calls Only`
- `UNKNOWN` -> `Texting Preference Unknown`

**Invariant**
- Display uses only the canonical enum value returned from the API; it does not infer from null-like or ad hoc shapes.

## State Transitions

### Create
- Input omits preference -> persist `YES`
- Input explicitly sets `YES` -> persist `YES`
- Input explicitly sets `NO` -> persist `NO`
- Input explicitly sets `UNKNOWN` -> persist `UNKNOWN`

### Update
- Input explicitly changes preference -> persist new canonical value
- Input omits preference -> preserve existing stored canonical value
- Input provides invalid preference -> preserve existing stored canonical value

### Read
- Stored canonical value -> returned unchanged as `prefersTexting`
- Stored absent/invalid value -> returned as `UNKNOWN` only as a defensive fallback
