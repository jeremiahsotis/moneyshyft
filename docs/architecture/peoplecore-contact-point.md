# Contract: PeopleCore ContactPoint

## Purpose
A ContactPoint represents the communication / identity signal itself, not permanent person ownership.

## Core ideas
- a ContactPoint can be a phone, email, or other contact signal
- it has lifecycle state
- it tracks recency
- it may be shared
- it may be stale
- it may require resolver intervention
- ambiguity belongs in ContactPointLink, not in ContactPoint itself

## Current states
- active_personal
- active_shared_possible
- active_shared_confirmed
- stale
- reassignment_suspected
- archived

## Locked rule: lifecycle truth
ContactPoint.status is the lifecycle source of truth.

Do not duplicate lifecycle meaning with parallel booleans on ContactPoint such as:
- suspected_shared
- confirmed_shared
- reassignment_suspected

If the system needs more nuance, derive it from:
- ContactPointEvent history
- ContactPointLink patterns
- resolver outcomes

## Confidence scoring impact
Lifecycle state participates in deterministic scoring:

- active_shared_possible: -20
- active_shared_confirmed: -45
- stale: -25
- reassignment_suspected: -70 and cap max band at MEDIUM

## ContactPointLink purpose
A ContactPointLink records the relationship between a ContactPoint and either:
- a Person
- a Household

It carries:
- ownership ambiguity
- history
- confidence at time of link
- explicit unlinking and reassignment evidence

## Important rule
A ContactPoint is not permanent identity truth.

It may:
- move over time
- be shared
- become stale
- require resolver intervention

## Why this matters
This prevents the platform from collapsing into:
- phone number = person
- email = person
- shared address = same household forever

That simplification would corrupt the data model.
