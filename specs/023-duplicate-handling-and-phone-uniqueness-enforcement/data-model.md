# Data Model: ConnectShyft Duplicate Phone Uniqueness Enforcement

## Overview

This feature closes the write-time corruption gap for ConnectShyft neighbor phones by enforcing canonical duplicate checks on current non-deleted neighbors while still tolerating legacy duplicate data that already exists. The design adds a narrow grandfathering state for the DB safety net, but identity resolution continues to see legacy duplicates and must keep refusing them as ambiguous.

## Entity: Neighbor Record

**Purpose**

Represents the ConnectShyft person identity that owns one or more phone assignments and can be current or soft-deleted.

**Fields**

- `neighborId`: unique neighbor identity
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `firstName`: profile value
- `lastName`: profile value
- `prefersTexting`: `UNKNOWN`, `YES`, or `NO`
- `isDeleted`: current lifecycle flag
- `deletedAtUtc`: optional deletion timestamp
- `phones`: associated phone assignments

**Validation rules**

- Duplicate-prevention checks include the neighbor only when `isDeleted = false`.
- Soft-deleted neighbors never qualify as reusable owners for uniqueness or identity resolution.
- The feature must not resurrect a deleted neighbor to solve a duplicate collision.

**Relationships**

- Owns one or more `Neighbor Phone Assignment` records.
- Participates in `Legacy Duplicate Set` membership when more than one current neighbor shares a canonical phone.

## Entity: Neighbor Phone Assignment

**Purpose**

Represents one persisted canonical phone value attached to a neighbor and evaluated for current ownership, duplicate prevention, and identity lookup.

**Fields**

- `phoneId`: unique phone assignment identity
- `tenantId`: tenant scope
- `neighborId`: owning neighbor
- `normalizedE164`: canonical comparison value
- `rawInput`: user-entered source value
- `displayNational`: formatted display value
- `isActive`: current assignment flag
- `isPrimary`: primary-phone flag
- `isShared`: shared-phone indicator
- `verificationStatus`: `verified` or `unverified`
- `uniquenessEnforcementState`: `ENFORCED` or `LEGACY_EXEMPT`

**Validation rules**

- `normalizedE164` is the only value allowed for duplicate comparison and identity lookup.
- A phone assignment participates in current-owner checks only when `isActive = true` and the parent neighbor is not deleted.
- `ENFORCED` current phone assignments must be unique per tenant and canonical phone value.
- `LEGACY_EXEMPT` exists only to grandfather already-stored duplicate rows until cleanup; it must not be used to create new duplicate ownership.

**Relationships**

- Belongs to one `Neighbor Record`.
- May belong to one `Legacy Duplicate Set` when its canonical phone is already shared across current neighbors.
- Feeds both `Duplicate Phone Check` and `Identity Resolution Outcome`.

## Entity: Legacy Duplicate Set

**Purpose**

Represents an already-stored canonical phone value shared by multiple current non-deleted neighbors that must remain unresolved until cleanup.

**Fields**

- `tenantId`: tenant scope
- `normalizedE164`: duplicated canonical phone
- `currentNeighborIds`: current non-deleted neighbors sharing the phone
- `currentPhoneIds`: current phone assignments sharing the phone
- `deletedNeighborIds`: deleted neighbors sharing the phone but excluded from current ambiguity
- `containsGrandfatheredRows`: whether one or more rows are marked `LEGACY_EXEMPT`

**Validation rules**

- The feature must not merge, delete, or silently reassign rows in the duplicate set.
- New writes attempting to use `normalizedE164` must be refused while any current non-deleted owner remains in the set.
- Identity resolution against a duplicate set with more than one current non-deleted owner must return ambiguity.

**Relationships**

- Aggregates multiple `Neighbor Phone Assignment` rows.
- Produces an `Identity Resolution Outcome` of `multiple_matches` when more than one current owner remains.

## Entity: Duplicate Phone Check

**Purpose**

Represents the business-rule evaluation run before a phone write is allowed to persist.

**Fields**

- `operation`: `create`, `update`, or `inbound_create`
- `tenantId`: tenant scope
- `excludeNeighborId`: optional current neighbor excluded during self-retaining update
- `candidateNormalizedPhones`: canonical phones proposed by the write
- `conflictingNeighborIds`: current owners that block the write
- `outcome`: `allow` or `duplicate_refusal`

**Validation rules**

- The check must run after phone normalization and before persistence mutates rows.
- `excludeNeighborId` allows the same neighbor to retain the same canonical phone without triggering a duplicate refusal.
- Any conflict with another current non-deleted owner forces `duplicate_refusal`.

**Relationships**

- Reads from `Neighbor Phone Assignment` and `Neighbor Record`.
- Produces `Duplicate Phone Refusal` on failure.

## Entity: Duplicate Phone Refusal

**Purpose**

Represents the deterministic refusal returned when a write attempts to claim another neighbor's current phone.

**Fields**

- `code`: `CONNECTSHYFT_PHONE_DUPLICATE`
- `reason`: `duplicate_phone`
- `fieldErrors`: refusal details attached to the `phones` field
- `normalizedPhones`: canonical phones that triggered the refusal
- `operation`: originating write operation

**Validation rules**

- The refusal must be returned identically for preflight duplicate detection and DB race-condition enforcement.
- The refusal must not commit any ownership change, merge, or overwrite behavior.
- Caller-visible refusal data must remain business-safe and deterministic.

**Relationships**

- Produced by `Duplicate Phone Check`.
- Returned by neighbor create, update, or replacement flows.

## Entity: Identity Resolution Outcome

**Purpose**

Represents the deterministic phone-lookup result consumed by ConnectShyft identity-driven workflows.

**Fields**

- `outcome`: `single_match`, `no_match`, or `multiple_matches`
- `normalizedContactPoint`: canonical lookup value
- `neighborId`: single owner when `single_match`
- `candidateNeighborIds`: current owners when `multiple_matches`
- `deletedOwnersExcluded`: whether deleted-neighbor filtering removed non-current rows from consideration

**Validation rules**

- `single_match` requires exactly one current non-deleted owner.
- `multiple_matches` requires more than one current non-deleted owner and must remain a hard refusal.
- `no_match` applies when no current non-deleted owners remain after deleted neighbors are excluded.

**Relationships**

- Consumes `Neighbor Phone Assignment` and `Neighbor Record`.
- Reflects `Legacy Duplicate Set` membership when ambiguity exists.

## State Transitions

### Phone Uniqueness Enforcement

- `new clean current assignment -> ENFORCED`
- `existing duplicate current assignment -> LEGACY_EXEMPT`
- `LEGACY_EXEMPT -> ENFORCED` only when later cleanup or a phone rewrite removes the duplicate condition
- `current assignment -> excluded from current-owner checks` when the phone becomes inactive or the parent neighbor becomes deleted

### Duplicate Write Outcome

- `candidate phones -> allow` when no other current non-deleted owner exists
- `candidate phones -> duplicate_refusal` when another current non-deleted owner exists
- `candidate phones -> duplicate_refusal` even when the conflicting owner is a grandfathered legacy duplicate

### Identity Resolution

- `canonical phone -> single_match` when exactly one current non-deleted owner exists
- `canonical phone -> multiple_matches` when multiple current non-deleted owners exist
- `canonical phone -> no_match` when only deleted or inactive rows remain
