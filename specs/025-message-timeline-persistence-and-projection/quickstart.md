# Quickstart: ConnectShyft Message Timeline Persistence and Projection

## Goal

Add a backend-only read-only timeline projection derived from canonical events, make inbound and outbound SMS first-class timeline items, expose `GET /api/v1/connectshyft/threads/:threadId/timeline` with optional bounded retrieval, preserve deleted-neighbor admin/debug review, and keep raw canonical event retrieval available for rollback while consumer UI adoption remains deferred.

## Slice Order

1. Make canonical SMS events projection-ready
2. Add the timeline projection service and DTO
3. Expose the new route, optional `limit` handling, and verify deleted-neighbor plus tenant-scoping behavior

## Preflight

**Verify the current raw timeline behavior and canonical-event cap**

```sh
rg -n "CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT|listCanonicalThreadEvents|router.get\\('/threads/:threadId'" \
  /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts
```

Expected findings:

- Canonical reads are already ordered and capped at `200`
- Thread detail currently builds timeline data from raw canonical events
- No dedicated timeline projection module exists yet

## Slice 1: Projection-Ready Canonical SMS Events

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

**Work**

1. Preserve inbound SMS canonical payload completeness.
2. Enrich outbound SMS canonical payloads with a projection-ready event name, message body, actor semantics, and available sender or target metadata.
3. Keep canonical payloads provider-neutral.
4. Do not add any timeline persistence.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/canonicalEvents.test.ts src/modules/connectshyft/__tests__/inboundSms.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

## Slice 2: Timeline Projection Module and DTO

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`

**Work**

1. Add `getThreadTimeline({ tenantId, orgUnitId, threadId, limit })`.
2. Load canonical events from the existing canonical event store.
3. Map inbound and outbound SMS canonical events into first-class timeline items.
4. Keep sorting oldest to newest with canonical event ID tie-breaking.
5. Populate deleted-neighbor metadata from existing thread detail and read-contract state.
6. Reserve explicit mapping slots for future voice lifecycle items and voicemail items.
7. Keep internal projection results in camelCase so the DTO can translate them into the external snake_case contract.

**Verification focus**

- Mixed inbound and outbound SMS events render in deterministic order.
- Same-timestamp events remain stable.
- Empty threads return an empty item array.
- Voice lifecycle placeholders no longer depend on “contains `voice.`” heuristics.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/threadTimeline.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts`

## Slice 3: Timeline Retrieval Route and Access Control

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

**Work**

1. Add `GET /api/v1/connectshyft/threads/:threadId/timeline`.
2. Reuse the existing org-unit context and thread-view capability checks.
3. Reuse the existing `includeDeleted=true` admin/debug authorization path for deleted-neighbor review.
4. Accept optional `limit` and preserve oldest-to-newest ordering within the returned window.
5. Return the projected timeline envelope with deleted-neighbor flags and `limit_applied`.
6. Keep existing raw canonical event retrieval available for debugging and rollback.

**Manual verification example**

```http
GET /api/v1/connectshyft/threads/thread-f2-unclaimed-1001/timeline
```

Expected result:

- `ok = true`
- `code = CONNECTSHYFT_THREAD_TIMELINE_LOADED`
- `items` ordered oldest to newest
- `neighbor_deleted` and `neighbor_deleted_at_utc` present in the envelope
- `limit_applied` present in the envelope
- omitted `limit` resolves to `limit_applied = 200`

**Bounded retrieval example**

```http
GET /api/v1/connectshyft/threads/thread-f2-unclaimed-1001/timeline?limit=50
```

Expected result:

- Exactly the 50 most recent eligible timeline items are returned
- Returned items remain ordered oldest to newest within that 50-item window
- `limit_applied = 50`

**Deleted-neighbor review example**

```http
GET /api/v1/connectshyft/threads/thread-soft-delete-detail-1005/timeline?includeDeleted=true
```

Expected result:

- Authorized admin/debug callers receive the timeline
- Standard operational callers do not

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.timeline.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

## Rollback Levers

1. Disable `GET /threads/:threadId/timeline`.
2. Revert timeline projection and DTO changes.
3. Fall back to raw canonical event retrieval while preserving canonical event storage unchanged.
4. Leave deleted-neighbor access rules and canonical event persistence intact during rollback.

## Focused Validation Command

```sh
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && \
  npx jest --runInBand \
    src/modules/connectshyft/__tests__/inboundSms.test.ts \
    src/modules/connectshyft/__tests__/canonicalEvents.test.ts \
    src/modules/connectshyft/__tests__/readContracts.test.ts \
    src/modules/connectshyft/__tests__/threadTimeline.test.ts \
    src/routes/api/v1/__tests__/connectshyft.timeline.test.ts
```

Notes:

- These suites verify the projection module, serializer, route contract, deleted-neighbor behavior, and stable ordering.
- Broader provider-registry integration coverage may additionally require a locally valid Postgres role or `DATABASE_URL` override.
