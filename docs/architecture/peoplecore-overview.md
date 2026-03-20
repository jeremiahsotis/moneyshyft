# PeopleCore Overview

## Purpose

PeopleCore is the source of truth for person-related data across ShyftUnity.

It owns:

- Person
- Household
- Household membership
- ContactPoint
- ContactPointLink
- ContactPoint lifecycle state
- Resolver review scaffolding
- Identity confidence and decision foundations

It does not own:

- communication transport
- conversation timeline storage
- long-term case workflow
- program workflow
- finance workflow

## Core principles

### 1. Identity is messy
Phone numbers, emails, and addresses are identity signals, not identity truth.

### 2. Contact points are first-class
A phone number or email exists independently from any one person and may be shared, stale, or reassigned.

### 3. Identity can be provisional
A person may exist in a provisional state until a resolver confirms or corrects the identity.

### 4. Correction must preserve history
Identity correction must reconcile and rebind, not silently rewrite history.

## Current object model

### Person
Represents a person record in one of these states:

- `active_confirmed`
- `active_provisional`
- `archived`
- `suppressed`
- `merged`

### Household
Represents a real group container. It is not inferred automatically from shared address alone.

### HouseholdMembership
Tracks who belongs to a household, in what role, and whether that membership is current.

### ContactPoint
Represents the normalized communication/identity signal itself.

### ContactPointLink
Represents the relationship between a ContactPoint and either a Person or Household.

### ResolverReview
Represents an identity ambiguity, duplicate, reassignment, or review task that should be handled by a designated resolver.

## ContactPoint states

Current states:

- `active_personal`
- `active_shared_possible`
- `active_shared_confirmed`
- `stale`
- `reassignment_suspected`
- `archived`

These states affect confidence and UI behavior. They make ambiguity explainable rather than hidden.

## Identity decision foundations

Current identity decision logic uses:

- confidence bands
- deterministic score-to-band mapping
- explicit decision outputs

Current bands:

- `very_low`
- `low`
- `medium`
- `high`
- `very_high`

Current decision outputs:

- `create_new_default`
- `suggest_attach`
- `require_confirmation`
- `require_override`

## Current implementation status

As of Slice 3:

- shared contracts exist in `libs/contracts`
- PeopleCore domain scaffolding exists under `domains/people`
- API stubs exist in `connectshyft-api`
- `/app/people` now exercises minimal real PeopleCore scaffolding
- implementation is still in-memory and intentionally not DB-backed yet

## Near-term next steps

- persist PeopleCore data properly
- add person CRUD surface
- add link/merge/rebind mechanics
- add real resolver workflow UI
- connect PeopleCore to deeper ConnectShyft flows
