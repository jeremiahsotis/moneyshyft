# PeopleCore Domain Model

## Status

Authoritative – system of record for all people and identity-related data.

---

## 1. Core Entities

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

---

### HouseholdMembership

Associates Person → Household.

Properties:

- role (optional)
- start/end validity

---

### Address

Represents a physical location.

Rules:

- NOT identity-defining
- may be shared across multiple households
- may change frequently

---

### Relationship

Defines relationships between Persons.

Examples:

- parent/child
- partner
- roommate

---

### ContactPoint

Represents a communication endpoint:

- phone number
- email

Rules:

- NOT owned by Person
- may be shared
- may be reassigned

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

---

### ContactPointEvent

Tracks events affecting a ContactPoint.

Examples:

- inbound/outbound activity
- state change
- reassignment suspicion
- manual confirmation

---

## 2. ContactPoint States

- active_personal
- active_shared_possible
- active_shared_confirmed
- stale
- reassignment_suspected
- archived

These states influence identity confidence.

---

## 3. Identity Operations

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

## 4. Subject Lifecycle

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

## 5. Historical Integrity

Rules:

- history must not be rewritten
- links may change
- events are immutable
- merges must be auditable

---

## 6. Key Constraints

- ContactPoint != Person
- identity is reversible
- identity is probabilistic
- relationships are explicit, not inferred

---

## 7. Non-Ownership

PeopleCore does NOT own:

- messaging
- calls
- timeline
- delivery tracking
- provider integrations

These belong to ConnectShyft.
