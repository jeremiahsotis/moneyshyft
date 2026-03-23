# Contract: SubjectContext

## Purpose
SubjectContext carries the currently relevant subject and navigation context across the shell and related surfaces.

## Current shape
```ts
type SubjectContext = {
  orgUnitId: string
  personId?: string
  provisionalPersonId?: string
  conversationId?: string
  contactPointId?: string
}
```

## Meaning of fields
- orgUnitId: required operational context
- personId: confirmed person context when available
- provisionalPersonId: provisional identity context when a person is still provisional
- conversationId: current conversation context
- contactPointId: current ContactPoint context

## Locked invariant
Exactly one of the following may be present:
- personId
- provisionalPersonId

Never both at the same time.

## Rules
- orgUnitId is required
- SubjectContext may exist without a final confirmed person
- provisionalPersonId and personId must not both be populated
- this contract is shell-wide and should remain small

## Why this lock exists
This prevents:
- UI and backend using different identity anchors
- ambiguous navigation context
- split identity truth during provisional flows
