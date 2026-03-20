# Contract: SubjectContext

## Purpose

`SubjectContext` carries the currently relevant subject and navigation context across the shell and related surfaces.

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

- `orgUnitId`: required operational context
- `personId`: confirmed person context when available
- `provisionalPersonId`: temporary identity context when a person is still provisional
- `conversationId`: current conversation context
- `contactPointId`: current ContactPoint context

## Rules

- `orgUnitId` is required
- `SubjectContext` may exist without a `personId`
- `provisionalPersonId` and `personId` should not both be treated as final truth
- this contract is shell-wide and should remain small
