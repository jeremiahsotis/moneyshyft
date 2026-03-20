# Contract: ResolverReview

## Purpose

A `ResolverReview` is a first-class identity ambiguity or override review object.

It exists so identity ambiguity is handled by designated resolvers instead of being forced onto every user.

## Current responsibilities

A ResolverReview may cover:
- duplicate suspicion
- high-confidence override attempts
- shared contact ambiguity
- contact point reassignment
- subject reassignment review
- merge review

## Current fields

See code in `libs/contracts/src/people/resolver-review.ts`.

Core concepts include:
- review type
- review status
- priority
- confidence band
- confidence reasons
- risk flags
- candidate people
- trigger source
- resolution details

## Operational rule

A ResolverReview is not just a queue row.
It is a durable review object with enough context to support:
- clear resolver action
- auditability
- later tuning and analytics
