# Data Model: ConnectShyft Inbound SMS Identity Resolution

## Overview

This feature tightens the ConnectShyft inbound SMS runtime around exact-request webhook verification, ordered subject resolution, inbound-specific neighbor creation, and guarded texting-preference updates. It introduces one new internal resolver boundary and may require a narrow lifecycle marker for deleted-neighbor exclusion if production persistence does not already expose that state.

## Entity: Inbound Webhook Request Envelope

**Purpose**

Represents the exact inbound webhook request that must be authenticated before any business side effects occur.

**Fields**

- `headers`: provider signature and request metadata
- `rawBody`: exact request bytes captured before JSON parsing
- `parsedBody`: parsed JSON payload used only after authenticity validation
- `providerKey`: resolved provider identity
- `tenantIdHint`: optional tenant hint from request context or payload
- `eventType`: provider-translated event type

**Validation rules**

- Signed webhook verification must use `rawBody`, not a reconstructed payload string.
- Requests that cannot be validated against the exact received body must be rejected before message, neighbor, or audit side effects.
- `parsedBody` may drive business logic only after authenticity validation passes.

**Relationships**

- Produced by the Express JSON parser and webhook route.
- Consumed by provider verification and inbound webhook handling.

## Entity: Inbound Neighbor Resolution Context

**Purpose**

Represents the full ConnectShyft state available when determining which neighbor an inbound SMS belongs to.

**Fields**

- `tenantId`: required tenant scope
- `orgUnitId`: required org-unit scope
- `threadId`: correlated thread identity when available
- `explicitNeighborId`: payload metadata neighbor reference when available
- `correlatedNeighborId`: thread-derived neighbor reference when available
- `senderPhoneE164`: normalized inbound sender phone used for phone resolution
- `providerIdentifiers`: provider event, message, and leg identifiers

**Validation rules**

- Resolution order is fixed: explicit metadata, thread correlation, phone subject resolution, new-neighbor creation.
- Later steps may run only when earlier steps do not produce a reusable active neighbor.
- No undocumented fallback source may be consulted.

**Relationships**

- Built in the inbound webhook route after provider verification and correlation.
- Consumed by the route-owned resolution chain.

## Entity: Subject Resolution Request

**Purpose**

Represents the replaceable phone-based identity lookup boundary for inbound SMS.

**Fields**

- `tenantId`: required tenant scope
- `orgUnitId`: org-unit scope preserved for future resolver implementations
- `contactPoint`: normalized E.164 sender phone
- `source`: `inbound_sms_sender_phone`

**Validation rules**

- `contactPoint` must already be normalized to E.164 before the resolver is called.
- The request remains tenant-scoped even when future implementations use broader identity infrastructure.
- The current local adapter may ignore `orgUnitId`, but the boundary contract must keep it.

**Relationships**

- Produced by the inbound webhook route.
- Consumed by `resolveSubjectByContactPoint(...)`.

## Entity: Subject Resolution Result

**Purpose**

Represents the stable output contract returned by the subject-resolution boundary.

**Fields**

- `outcome`: `single_match`, `no_match`, or `multiple_matches`
- `neighborId`: resolved active neighbor when `single_match`
- `candidateNeighborIds`: matched candidates when `multiple_matches`
- `normalizedContactPoint`: the E.164 phone used for the lookup
- `lifecycleFiltered`: whether deleted-neighbor filtering was applied

**Validation rules**

- `single_match` must represent exactly one reusable active neighbor.
- `multiple_matches` must refuse downstream processing and must not create a new neighbor.
- `no_match` may proceed to inbound neighbor creation.

**Relationships**

- Produced by `identityResolver.ts`.
- Consumed by the inbound webhook route.

## Entity: Neighbor Record

**Purpose**

Represents the reusable or newly created ConnectShyft neighbor identity for inbound SMS.

**Fields**

- `neighborId`: unique neighbor identity
- `tenantId`: tenant scope
- `orgUnitId`: org-unit scope
- `firstName`: optional profile value, blank allowed for inbound-created neighbors
- `lastName`: optional profile value, blank allowed for inbound-created neighbors
- `prefersTexting`: `UNKNOWN`, `YES`, or `NO`
- `lifecycleState`: `ACTIVE` or `SOFT_DELETED`
- `phones`: normalized phone records

**Validation rules**

- Inbound-created neighbors must start in `ACTIVE` lifecycle state.
- Inbound-created neighbors must have one primary active valid phone equal to the sender phone.
- Soft-deleted neighbors are never reusable for inbound matching.

**Relationships**

- Loaded and mutated by `neighbors.ts`.
- Referenced by the webhook route, thread ensure flow, and audit log.

## Entity: Inbound Neighbor Creation Audit Entry

**Purpose**

Represents the auditable record explaining that a new neighbor was created from inbound SMS because no active reusable match existed.

**Fields**

- `tenantId`: tenant scope
- `correlationId`: stable audit correlation key tied to the webhook processing path
- `operationName`: inbound-neighbor-create operation name
- `targetEntityType`: `neighbor`
- `targetEntityId`: created neighbor identity
- `channel`: `webhook` or `sms`
- `resultState`: success or failure
- `metadata`: resolution source, sender phone, and provider identifiers

**Validation rules**

- Exactly one audit entry must be written for each successful inbound-created neighbor.
- Audit persistence failures must not silently alter neighbor identity decisions.
- Audit metadata must describe that creation occurred because no active reusable match existed.

**Relationships**

- Produced through `communicationAuditLog.ts`.
- Linked to created neighbors and webhook processing.

## Entity: Texting Preference Transition

**Purpose**

Represents the inbound-SMS-driven state transition for a neighbor's texting preference.

**Fields**

- `previousValue`: `UNKNOWN`, `YES`, or `NO`
- `nextValue`: `YES` or unchanged prior value
- `trigger`: `accepted_inbound_sms`
- `neighborId`: affected neighbor identity

**Validation rules**

- `UNKNOWN` transitions to `YES` after accepted inbound SMS.
- `YES` remains `YES`.
- `NO` remains `NO`.

**Relationships**

- Produced by inbound webhook handling after final neighbor resolution.
- Applied through neighbor service methods.

## State Transitions

### Webhook Authenticity

- `received -> verified` when signature validation succeeds against `rawBody`
- `received -> rejected` when signature validation fails or cannot be performed against `rawBody`

### Inbound Neighbor Resolution

- `resolution context -> existing neighbor` when explicit metadata, thread correlation, or phone resolution yields one reusable active neighbor
- `resolution context -> new neighbor` when no reusable active match exists
- `resolution context -> refused ambiguous` when phone resolution yields multiple reusable active neighbors

### Texting Preference

- `UNKNOWN -> YES` on accepted inbound SMS
- `YES -> YES` on accepted inbound SMS
- `NO -> NO` on accepted inbound SMS

### Neighbor Lifecycle

- `ACTIVE -> SOFT_DELETED` through delete flows outside this feature
- `SOFT_DELETED -> not reusable for inbound resolution` always
- `SOFT_DELETED-only match set -> new neighbor created` when inbound SMS arrives
