# Contract: ConnectShyft Message Timeline Projection

## Objective

Provide a unified ordered thread timeline derived only from canonical events, promote inbound and outbound SMS to first-class timeline items, and reserve a stable contract for future voice call events and voicemail artifacts.

## Naming convention

- Internal service and projection objects use camelCase.
- External HTTP DTO fields use snake_case.
- `threadTimelineDto.ts` is responsible for translating internal service results into the public route contract.

## Allowed runtime surface

- `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts`
  - canonical event persistence and deterministic listing
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
  - inbound SMS canonical payload shape
- `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
  - projection service and event-to-item mapping
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
  - route-facing response shaping
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - deleted-neighbor metadata for the response envelope
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - timeline retrieval route and access control
- Related tests only:
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/canonicalEvents.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

## Service contract

### `getThreadTimeline(input)`

**Input**

- `tenantId`
- `orgUnitId`
- `threadId`
- `limit` (optional, maximum `200`)

**Output**

- `threadId`
- `neighborDeleted`
- `neighborDeletedAtUtc`
- `deterministic = true`
- `limitApplied`
- `items[]`

**Behavior**

1. Load canonical events for the requested thread using tenant and org-unit scope.
2. Map supported canonical events into first-class timeline items.
3. Apply the optional `limit` as a bounded most-recent window with a maximum effective value of `200`.
4. Sort returned items ascending by `occurred_at_utc`, then canonical event identifier.
5. Return an empty `items` array when the thread has no timeline-eligible canonical events.
6. Never write or mutate any timeline storage.

## Timeline item contract

### Required fields

- `id`
- `thread_id`
- `direction`
- `channel`
- `occurred_at_utc`
- `actor`

### SMS-required fields

- `body`

### Optional fields

- `provider_metadata`
- `delivery_status`

### Future-compatible fields

- `type`
  - `message` for SMS items
  - future `voice_event`
  - future `voicemail`
- `recording_url`
- `duration_seconds`
- `transcript`

## Event-to-item mapping rules

1. `connectshyft.inbound.sms_appended`
   - `type = message`
   - `direction = inbound`
   - `channel = sms`
   - `body` comes from canonical inbound message artifact
   - `actor = neighbor`
2. `connectshyft.outbound.sms_appended`
   - `type = message`
   - `direction = outbound`
   - `channel = sms`
   - `body` comes from canonical outbound message artifact
   - `actor = user` when user initiated, otherwise `system`
3. Future voice lifecycle events
   - `channel = voice`
   - `type = voice_event`
   - same ordering and identity contract
4. Future voicemail artifacts
   - `channel = voicemail`
   - `type = voicemail`
   - reserve `recording_url`, `duration_seconds`, and optional `transcript`

## Route contract

### `GET /api/v1/connectshyft/threads/:threadId/timeline`

**Request rules**

- Uses the existing ConnectShyft inbox capability and org-unit context enforcement.
- Uses the existing deleted-neighbor admin/debug gate when `includeDeleted=true`.
- Requires `threadId`.
- Accepts optional `limit`, defaults omitted `limit` to `200`, and caps the effective value at `200`.
- Must remain tenant-scoped.
- Returns the effective request window in `limit_applied`.

**Success response shape**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_THREAD_TIMELINE_LOADED",
  "message": "ConnectShyft thread timeline loaded",
  "data": {
    "thread_id": "thread-123",
    "neighbor_deleted": false,
    "neighbor_deleted_at_utc": null,
    "deterministic": true,
    "limit_applied": 50,
    "items": [
      {
        "id": "event-001",
        "thread_id": "thread-123",
        "type": "message",
        "direction": "inbound",
        "channel": "sms",
        "body": "Need help with delivery window",
        "occurred_at_utc": "2026-03-19T12:00:00.000Z",
        "actor": "neighbor",
        "provider_metadata": null,
        "delivery_status": null
      }
    ]
  }
}
```

**Refusal rules**

- Missing `threadId` remains a client refusal.
- Inaccessible or cross-tenant thread reads must not reveal timeline contents.
- Deleted-neighbor timeline review without tenant-privileged admin/debug access must refuse using the existing deleted-neighbor authorization semantics.

## Must hold constant

- Canonical events remain the only timeline source of truth.
- `/api/v1/auth/*` and `/api/v1/platform/admin/*` stay `admin-api` owned.
- Host Nginx, localhost-only API binding, and shared Postgres topology remain unchanged.
- Raw canonical event retrieval remains available for rollback and debugging.
- No direct DB logic may be added to the route for timeline assembly.
- A client that renders the returned `items` array top-to-bottom will display the newest returned item last without additional resorting.
