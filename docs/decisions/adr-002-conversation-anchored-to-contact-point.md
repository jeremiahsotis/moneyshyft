# ADR-002: Conversations are anchored to ContactPoint and orgUnit

## Status
Accepted

## Decision

A conversation is anchored to:
- ContactPoint
- orgUnit

A conversation is not permanently anchored to a Person.

## Why

Identity may change later.
Communication history must remain durable even when identity is corrected.

## Consequences

- a conversation may exist without a resolved person
- identity rebinding can happen later
- communication history remains truthful and durable
