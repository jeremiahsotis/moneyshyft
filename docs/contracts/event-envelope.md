# Contract: EventEnvelope

## Purpose

`EventEnvelope` is the shared event shape used for domain events that need a consistent wrapper.

## Current shape

```ts
type EventEnvelope<T = unknown> = {
  id: string
  type: string
  source: string
  tenantId: string
  orgUnitId: string
  subject: SubjectContext
  payload: T
  createdAt: string
}
```

## Validation rules

Current validation requires:

- `id`
- `type`
- `orgUnitId`
- `subject.orgUnitId`

## Intent

This contract provides:
- consistent event identity
- consistent orgUnit context
- consistent subject context
- a stable wrapper for future PeopleCore and ConnectShyft events

## Rule

The code contract is the source of truth for exact fields. This doc explains the operational meaning.
