# Contract: PeopleCore ContactPoint

## Purpose

A `ContactPoint` represents the communication/identity signal itself, not permanent person ownership.

## Current ContactPoint shape

See code in `libs/contracts/src/people/contact-point.ts`.

Core ideas:
- a ContactPoint can be a phone, email, or other contact signal
- it has lifecycle state
- it tracks recency
- it may be shared or suspected reassigned

## Current states

- `active_personal`
- `active_shared_possible`
- `active_shared_confirmed`
- `stale`
- `reassignment_suspected`
- `archived`

## ContactPointLink purpose

A `ContactPointLink` records the relationship between a ContactPoint and either:
- a Person
- a Household

## Important rule

A ContactPoint is not permanent identity truth.

It may:
- move over time
- be shared
- become stale
- require resolver intervention

## Why this matters

This is what prevents the platform from collapsing into:
- phone number = person
- email = person
- shared address = same household forever

That simplification would corrupt the data model.
