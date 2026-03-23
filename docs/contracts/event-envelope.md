# Contract: EventEnvelope

## Purpose
EventEnvelope is the shared transport wrapper for domain events that cross service or subsystem boundaries.

## Canonical shape
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
Required:
- id
- type
- orgUnitId
- subject.orgUnitId

## Locked rule
EventEnvelope is the only approved cross-boundary transport shape for domain events.

This means:
- ContactPointEvent is a domain payload
- ResolverReview-triggering events are domain payloads
- future PeopleCore and ConnectShyft domain events must also use this wrapper when crossing boundaries

Canonical pattern:
```ts
EventEnvelope<ContactPointEvent>
```

## Operational meaning
This contract provides:
- consistent event identity
- consistent tenant / orgUnit context
- consistent subject context
- replay-safe transport normalization
- one event pipeline, not multiple competing shapes

## Anti-drift rule
Do not create raw one-off event formats for cross-boundary delivery.
The code contract is the source of truth for exact fields.
