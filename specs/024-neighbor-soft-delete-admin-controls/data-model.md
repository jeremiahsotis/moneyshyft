# Data Model: ConnectShyft Neighbor Soft Delete Admin Controls

## Overview

Feature `024` adds an operational deletion lifecycle for ConnectShyft neighbors without removing historical data. The lifecycle state already exists on `cs_neighbors`; this feature formalizes how those fields are written, how phone ownership is released, how deleted state is projected into thread reads, and how admin-only inspection differs from standard operator flows.

## Entity: Neighbor Record

**Purpose**

Represents a ConnectShyft person record that can be operationally active or soft-deleted while preserving all historical profile and conversation relationships.

**Fields**

- `neighborId`: unique neighbor identifier
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `firstName`: profile value
- `lastName`: profile value
- `prefersTexting`: `UNKNOWN`, `YES`, or `NO`
- `isDeleted`: lifecycle flag mapped from `is_deleted`
- `deletedAtUtc`: deletion timestamp mapped from `deleted_at_utc`
- `deletedByUserId`: deletion actor mapped from `deleted_by_user_id`
- `phones`: associated phone assignments
- `createdAtUtc`: creation timestamp
- `updatedAtUtc`: last update timestamp

**Validation rules**

- An operationally active neighbor has `isDeleted = false`.
- A deleted neighbor must preserve all pre-existing profile and history data.
- A successful soft delete must set `isDeleted = true`, `deletedAtUtc`, and `deletedByUserId`.
- A deleted neighbor must not be eligible for standard operational list, search, messaging, calling, or inbound identity reuse.

**Relationships**

- Owns one or more `Neighbor Phone Assignment` records.
- May be referenced by zero or more `Neighbor Thread Projection` records.
- Produces one `Neighbor Soft Delete Audit Event` when it transitions from active to deleted.

## Entity: Neighbor Phone Assignment

**Purpose**

Represents a canonical phone identity attached to a neighbor and used for operational contact, uniqueness enforcement, and inbound identity resolution.

**Fields**

- `phoneId`: unique phone assignment identifier
- `tenantId`: tenant scope
- `neighborId`: owning neighbor
- `normalizedE164`: canonical contact value
- `rawInput`: operator-entered source value
- `displayNational`: display format
- `isActive`: whether the phone is current for operational use
- `isPrimary`: primary-phone marker
- `isShared`: shared-phone marker
- `verificationStatus`: `verified` or `unverified`
- `createdAtUtc`: creation timestamp
- `updatedAtUtc`: last update timestamp

**Validation rules**

- On neighbor soft delete, every associated phone assignment must become `isActive = false`.
- Inactive phone assignments remain preserved historically.
- Only active phone assignments on non-deleted neighbors participate in operational reuse blocking and active identity resolution.
- A phone released by soft delete may be reassigned to a new active neighbor without reactivating the deleted historical owner.

**Relationships**

- Belongs to one `Neighbor Record`.
- Influences `Inbound Deleted-Owner Resolution` by either remaining an active current owner or becoming historical-only after soft delete.

## Entity: Soft Delete Command

**Purpose**

Represents the admin-only request to transition a neighbor out of operational use.

**Fields**

- `tenantId`: tenant scope of the mutation
- `neighborId`: target neighbor
- `actorUserId`: authenticated deletion actor
- `irreversibleConfirmation`: explicit caller confirmation required to proceed
- `authorized`: whether the actor has the required elevated capability
- `outcome`: `deleted`, `already_deleted`, `confirmation_required`, `forbidden`, or `not_found`

**Validation rules**

- `irreversibleConfirmation` must be true before any mutation runs.
- Only tenant-privileged admin capability may perform the command.
- The mutation must be atomic across neighbor lifecycle fields and all associated phone `isActive` flags.
- A repeated delete request against an already-deleted neighbor must preserve the existing deleted state and existing audit trail.

**Relationships**

- Mutates one `Neighbor Record`.
- Mutates zero or more `Neighbor Phone Assignment` records.
- Emits zero or one `Neighbor Soft Delete Audit Event` depending on whether the request caused a first-time delete transition.

## Entity: Neighbor Thread Projection

**Purpose**

Represents the operator-facing or admin-facing thread summary/detail response associated with a neighbor.

**Fields**

- `threadId`: unique thread identifier
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `neighborId`: associated neighbor identifier
- `state`: `UNCLAIMED`, `CLAIMED`, or `CLOSED`
- `bucket`: `inbox` or `mine` for standard read flows
- `neighborDeleted`: boolean response flag
- `neighborDeletedAtUtc`: deletion timestamp shown when `neighborDeleted = true`
- `visibilityMode`: `standard` or `admin_debug`, where `admin_debug` is activated only when an authorized caller uses the existing ConnectShyft detail routes with `includeDeleted=true`

**Validation rules**

- Standard inbox and standard thread-detail flows must exclude projections whose neighbor is deleted.
- Deleted-neighbor thread review must remain available only when an authorized caller uses the existing ConnectShyft detail routes with `includeDeleted=true`.
- Any deleted-aware thread response for a deleted-neighbor thread must include `neighborDeleted = true` and `neighborDeletedAtUtc`.
- No thread row is physically deleted or cascade-deleted when the parent neighbor is soft-deleted.

**Relationships**

- References one `Neighbor Record`.
- Is derived from existing thread persistence plus current neighbor lifecycle state.

## Entity: Neighbor Soft Delete Audit Event

**Purpose**

Represents the authoritative audit record that a neighbor was removed from operational use.

**Fields**

- `eventName`: lifecycle event name for neighbor soft delete
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `neighborId`: deleted neighbor identifier
- `actorUserId`: deletion actor
- `timestamp`: audit timestamp
- `policyPath`: authorization path used for the delete

**Validation rules**

- A first-time successful soft delete must emit exactly one audit event.
- The event must include actor, timestamp, and neighbor identity.
- A repeated delete request that leaves the existing deleted state unchanged must not replace or destroy the original audit trail.

**Relationships**

- Produced by `Soft Delete Command`.
- References one `Neighbor Record`.

## Entity: Inbound Deleted-Owner Resolution

**Purpose**

Represents the inbound SMS outcome when a phone previously owned by a deleted neighbor is used again.

**Fields**

- `tenantId`: tenant scope
- `phoneValue`: canonical phone value
- `currentOwnerState`: `active_owner`, `deleted_only_history`, or `no_owner`
- `outcome`: `reuse_active_neighbor`, `create_new_neighbor`, or `refuse`

**Validation rules**

- `deleted_only_history` must produce `create_new_neighbor`.
- The feature must not resurrect a deleted neighbor to satisfy inbound SMS.
- Soft delete phone deactivation must allow `deleted_only_history` to stop blocking valid reuse.

**Relationships**

- Reads from `Neighbor Record` and `Neighbor Phone Assignment`.
- Produces a new active `Neighbor Record` only when no current active reusable owner exists.

## State Transitions

### Neighbor Lifecycle

- `active -> deleted` when an authorized admin submits `irreversibleConfirmation = true`
- `deleted -> deleted` when a repeated delete request is treated as an idempotent no-op
- No `deleted -> active` restore transition exists in this feature

### Phone Ownership Lifecycle

- `active current phone -> inactive historical phone` when the parent neighbor is soft-deleted
- `inactive historical phone -> remains historical` while the deleted neighbor remains preserved
- `released phone value -> active current phone on a new neighbor` when reassigned after soft delete

### Thread Visibility Lifecycle

- `standard-visible thread -> standard-hidden thread` when its neighbor becomes deleted
- `thread remains preserved -> admin/debug-visible with deleted flags` after the same neighbor delete

### Inbound Resolution Lifecycle

- `deleted-only phone history -> create new neighbor`
- `one current active owner plus deleted history -> reuse current active owner`
- `deleted neighbor -> never resurrected by this feature`
