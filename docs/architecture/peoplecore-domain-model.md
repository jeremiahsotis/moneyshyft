# PeopleCore Domain Model

## Status

Authoritative for PeopleCore-owned identity concepts and the Slice 12 persistence-backed foundation.

---

## 1. Slice 12 Foundation Status

Persistence-backed in Slice 12:

- Person
- Household
- HouseholdMembership
- ContactPoint
- ContactPointLink
- ContactPointEvent
- ResolverReview

Conceptual but still deferred from persistence in Slice 12:

- Address
- Relationship

ConnectShyft still owns the current neighbor model and communication objects while it consults PeopleCore through the identity seam.

---

## 2. Core Entities

### Person

Represents a human subject.

States:

- active_confirmed
- active_provisional
- archived
- suppressed
- merged

Rules:

- may begin as provisional
- may be merged into another Person
- never hard-deleted in normal operation
- persisted in `people.persons`

---

### Household

Represents a shared living or relational grouping.

Properties:

- has members
- has roles (optional)
- may have shared ContactPoints

Rules:

- NOT inferred from address
- must be explicitly defined
- persisted in `people.households`

---

### HouseholdMembership

Associates Person → Household.

Properties:

- role (optional)
- start/end validity
- persisted in `people.household_memberships`

---

### Address

Represents a physical location.

Rules:

- NOT identity-defining
- may be shared across multiple households
- may change frequently
- still deferred from persistence in Slice 12

---

### Relationship

Defines relationships between Persons.

Examples:

- parent/child
- partner
- roommate

Status:

- still deferred from persistence in Slice 12

---

### ContactPoint

Represents a communication endpoint:

- phone number
- email

Rules:

- NOT owned by Person
- may be shared
- may be reassigned
- persisted in `people.contact_points`

---

### ContactPointLink

Associates ContactPoint to:

- Person
- Household

Properties:

- confidence
- validity
- history

Rules:

- must support multiple links over time
- must support reassignment
- persisted in `people.contact_point_links`

---

### ContactPointEvent

Tracks events affecting a ContactPoint.

Examples:

- inbound/outbound activity
- state change
- reassignment suspicion
- manual confirmation
- persisted in `people.contact_point_events`

---

### ResolverReview

Represents an identity ambiguity, duplicate, reassignment, or review task for resolver action.

Rules:

- persisted in `people.resolver_reviews`
- may reference provisional people and contact points
- is first-class persistence now, even though the resolver UI is still deferred

---

## 3. ContactPoint States

- active_personal
- active_shared_possible
- active_shared_confirmed
- stale
- reassignment_suspected
- archived

These states influence identity confidence.

---

## 4. Identity Operations

### Merge

Used when two Person records represent the same human.

Rules:

- one surviving record
- one marked as merged
- full audit preserved

---

### Link

Used when:

- possible duplicate
- known relationship
- but identities remain separate

---

### Household Assignment

Used for:

- shared living context
- relational grouping

---

## 5. Subject Lifecycle

No casual deletion.

States:

- active
- archived
- suppressed
- merged

Rules:

- restore must be possible
- suppression hides but preserves
- merged retains audit trail
- hard delete is exceptional only

---

## 6. Historical Integrity

Rules:

- history must not be rewritten
- links may change
- events are immutable
- merges must be auditable

---

## 7. Key Constraints

- ContactPoint != Person
- identity is reversible
- identity is probabilistic
- relationships are explicit, not inferred

---

## 8. Non-Ownership

PeopleCore does NOT own:

- messaging
- calls
- timeline
- delivery tracking
- provider integrations

These belong to ConnectShyft.

---

## 9. Slice 12 Boundary Note

Slice 12 introduces a ConnectShyft-to-PeopleCore identity seam so ConnectShyft can consult PeopleCore-owned contact-point and resolver-review persistence without changing current ConnectShyft route envelopes.

PeopleCore is now the persistence source of truth for person/contact-point/household/resolver-review concepts.

ConnectShyft still owns:

- neighbor APIs
- conversation continuity
- message and call orchestration
- current external communication-facing contracts
