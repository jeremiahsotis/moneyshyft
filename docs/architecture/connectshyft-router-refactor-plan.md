# ConnectShyft Router Refactor Plan

## Purpose
This document tracks the staged extraction of the ConnectShyft API router from `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` into thin-router handlers and focused helper boundaries, while preserving current behavior.

## Non-negotiable rules
1. Preserve exact current response shapes during extraction slices.
2. Preserve current behavioral semantics unless a later explicit decision changes them.
3. Prefer characterization first, extraction second.
4. Move route-family orchestration into handler/helper seams.
5. Leave domain logic in existing domain/service modules until a later slice explicitly changes that.
6. Do not mix outbound extraction with inbound/webhook extraction.

## Completed slices

### Slice 4
Extracted first thin-router family:
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
Extracted thread read surface:
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
- current single canonical thread detail payload direction for UI

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
Extracted neighbor and identity bridge surface:
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
Extracted outbound action surface:
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

## Next slice

### Slice 9
Inbound/webhooks/telephony extraction:
- webhook entry routes
- inbound SMS
- inbound voice
- voicemail handling
- transcription callback
- webhook correlation and receipt orchestration

This is intentionally deferred until after outbound extraction because it is the most operationally tangled route family.

## Extraction sequence
1. Settings/context/inbox
2. Thread read
3. Lifecycle
4. Neighbor/identity bridge
5. Outbound actions
6. Inbound/webhooks/telephony

## Operating rule for future updates
This file is canonical.
Each new slice should overwrite this file with the updated current plan, not append parallel copies under the same path.
