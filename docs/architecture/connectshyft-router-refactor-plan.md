# ConnectShyft Router Refactor Plan

## Status

- Slices 4 through 11 complete.
- ConnectShyft route-family extraction sequence complete.
- Frontend build/test surface separation completed in Slice 11.
- Slice 12 PeopleCore persistence foundation and identity seam complete.

## Purpose

This document records the completed extraction of `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` into a thin route-registration shell with module-owned handlers and helper boundaries.

It also captures the post-Slice 12 stop point so future work does not treat the extraction sequence as still in progress.

## Non-negotiable rules

1. Preserve exact current response shapes unless a later explicit slice redesigns them.
2. Preserve current behavioral semantics unless a later explicit decision changes them.
3. Keep route-family orchestration in handlers, not in `connectshyft.ts`.
4. Keep HTTP prerequisite parsing and refusal mapping in helper boundaries, not in the router or deep domain modules.
5. Keep provider, bridge, canonical-event, and correlation internals in their existing domain/infrastructure modules unless a later intentional slice changes ownership.
6. Treat Slice 11 as stabilization and architecture lock, not behavior redesign.
7. Treat Slice 12 seam work as identity foundation behind the extracted handlers, not as a reason to re-thicken `connectshyft.ts`.

## Completed sequence

The broader slice program through Slice 11 is complete. The list below captures the router-focused milestones that materially changed ConnectShyft route ownership and the frontend build boundary.

### Slice 4

Extracted the first thin-router family:

- settings/navigation
- availability
- context
- inbox

Added:

- handler files for that route family
- `http/accessContext.ts`
- focused helper tests
- handler ownership notes

### Slice 5

Extracted the thread read surface:

- thread detail
- thread timeline

Added:

- thread read handlers
- `http/threadReadContext.ts`
- thread read helper tests
- thread read notes

Preserved:

- current thread detail shape
- current timeline DTO shape
- current single canonical thread-detail payload direction for UI

### Slice 6

Extracted lifecycle actions:

- claim
- takeover
- close

Added:

- lifecycle handlers
- `http/threadLifecycleContext.ts`
- lifecycle helper tests
- lifecycle notes

Preserved:

- exact current lifecycle response shapes
- current claim behavior where claimed threads move into My Conversations while remaining visible in Inbox and recognizable as claimed
- current takeover and close behavior exactly

### Slice 7

Extracted the neighbor and identity bridge surface:

- neighbor create
- neighbor list
- neighbor detail
- neighbor update
- neighbor soft delete
- identity match
- merge

Added:

- neighbor/identity handlers
- `http/neighborIdentityContext.ts`
- neighbor/identity helper tests
- neighbor identity bridge notes

Preserved:

- exact current response shapes
- exact current merge behavior
- ConnectShyft-local merge semantics until future PeopleCore seam work is clearer

Light seam prep only:

- cleaner extraction boundary for future PeopleCore convergence
- no convergence rewrite yet

### Slice 8

Extracted the outbound action surface:

- `POST /threads/:threadId/call`
- `POST /threads/:threadId/messages`

Added:

- outbound handlers
- `http/threadOutboundContext.ts`
- outbound characterization tests
- outbound helper-boundary tests

Preserved:

- exact current outbound response shapes
- exact current reopen behavior

Guardrails preserved:

- helper boundary stays limited to route-family context enforcement, thread id parsing, shared prerequisite loading, and shared outbound execution delegation
- provider adapter, bridge session, reliability, audit, SMS override, and inbound/webhook internals remain outside the helper boundary

### Slice 9

Extracted inbound webhook route-family seams:

- `POST /webhooks/inbound`
- `POST /webhooks/sms`
- route-entry prerequisite handling for provider selection, signature verification, canonical translation, correlation resolution, and execution delegation

Added:

- inbound webhook handlers
- `http/inboundWebhookContext.ts`
- inbound webhook characterization locks
- inbound webhook helper-boundary tests

Preserved:

- exact current inbound webhook response shapes
- exact current inbound SMS, inbound voice, voicemail, and transcription callback behavior

Deferred intentionally:

- provider / correlation / canonical / bridge internals remain intentionally deferred from the route-family extraction sequence
- the operational inbound webhook core remains in `connectshyft.ts` pending the next consolidation step

### Slice 11

Closed the remaining router-owned route families and frontend build boundary:

- `GET /numbers`
- `POST /numbers`
- `PUT /numbers/:mappingId`
- `GET /admin/webhook-receipts/metrics`
- `POST /admin/webhook-receipts/cleanup`
- `GET /escalation/recipients`
- `GET /escalation/config`
- `PUT /escalation/config`

Added:

- number-mapping, escalation-config, and webhook-receipt-admin helper boundaries
- named handlers for the remaining route families
- characterization locks and helper-boundary tests for the final extracted families
- frontend build/test surface separation via production `tsconfig.json`, `tsconfig.vitest.json`, and Vitest dependency wiring

Preserved:

- exact current response shapes and refusal envelopes
- current webhook metrics and cleanup behavior
- current provider, bridge, canonical-event, and correlation ownership

Completed:

- thin-router delegation for all in-scope ConnectShyft route families
- production frontend build independence from test-only TypeScript surface

### Slice 12

Introduced the PeopleCore identity foundation beneath the already-extracted ConnectShyft route family:

- PeopleCore persistence-backed identity tables and contracts
- app-facing PeopleCore stores and services
- ConnectShyft-to-PeopleCore identity seam adapter
- best-effort provisional identity and resolver-review hooks behind the seam
- architecture documentation locking current ownership and deferred work

Preserved:

- exact current ConnectShyft route envelopes
- current identity-match semantics
- current inbound subject-resolution semantics
- current router/handler/helper ownership boundaries

Completed:

- identity convergence foundation without undoing the thin-router extraction
- a future-safe seam for later identity authority migration

## Route-family extraction result

The ConnectShyft route-family extraction sequence is complete:

1. Settings/context/inbox complete.
2. Thread read complete.
3. Lifecycle complete.
4. Neighbor/identity bridge complete.
5. Outbound complete.
6. Inbound/webhooks/telephony complete.
7. Remaining admin/configuration routes complete.

## Explicit preservation

The extraction sequence intentionally preserved:

- provider internals
- bridge internals
- canonical-event internals
- correlation internals
- existing ConnectShyft domain ownership boundaries

Slice 11 was stabilization and architecture lock, not a behavior redesign slice.

Slice 12 adds the identity convergence foundation behind that extracted surface, not a router redesign.

## Next intentional work

Next work after Slice 12 should be:

- ConnectShyft identity refinement behind the PeopleCore seam
- controlled migration of more identity authority away from ConnectShyft-local neighbor lookup
- continued model-alignment work without changing current route envelopes lightly
- not Application Shell by default

## Operating rule for future updates

This file is canonical for the completed extraction sequence.

Future updates should revise this file in place rather than creating parallel router-refactor status files under the same path.
