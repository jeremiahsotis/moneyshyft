# Implementation Plan: ConnectShyft Message Timeline Persistence and Projection

**Branch**: `025-message-timeline-persistence-and-projection` | **Date**: 2026-03-19 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/spec.md)
**Input**: Feature specification from `/specs/025-message-timeline-persistence-and-projection/spec.md`

## Summary

Implement feature `025` as a backend-only ConnectShyft API slice by keeping canonical events as the only source of truth, enriching canonical SMS event payloads so projected timeline items can carry the required body and actor fields, introducing a dedicated ConnectShyft thread-timeline projection service plus DTO serializer, and exposing `GET /api/v1/connectshyft/threads/:threadId/timeline` as a tenant-scoped read-only route with optional bounded retrieval. The current codebase already loads canonical thread events directly into thread detail, but those events are still raw canonical records, outbound SMS payloads do not yet contain projection-ready message bodies, and the current voice classification heuristic collapses all voice activity into voicemail, so the implementation focus is canonical payload completeness, explicit event-to-item mapping, deleted-neighbor aware response shaping, a small testable `limit` contract, and a rollback-safe endpoint that can coexist with raw canonical event retrieval while consumer UI adoption remains deferred.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, `pg`, Jest/ts-jest, existing ConnectShyft `canonicalEvents`, `readContracts`, `threads`, and provider-dispatch modules, shared `libs/platform` mutation helpers, shared telephony contracts under `domains/communication`  
**Storage**: Shared PostgreSQL using `platform.events` for canonical event persistence plus existing `connectshyft` thread and neighbor read tables; no dedicated timeline table or timeline write model  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites for canonical event persistence, new timeline projection logic, deleted-neighbor route behavior, and ConnectShyft route contracts  
**Target Platform**: ConnectShyft API lane behind host-managed Nginx, Dockerized Node runtime with localhost-only binding, shared host-managed PostgreSQL, no public API exposure  
**Project Type**: Monorepo backend lane feature with a new read-only API contract and no new deployable service  
**Performance Goals**: Keep timeline reads within existing ConnectShyft request-time expectations, preserve deterministic ordering for up to 200 returned records per thread read, and avoid additional database writes or cross-lane calls on timeline retrieval  
**Constraints**: Canonical events remain the only source of truth; no direct timeline writes; no timeline mutation outside the canonical event pipeline; ordering must be oldest-to-newest with `(occurred_at_utc, canonical_event_id)` tie-breaking; timeline reads must be tenant-scoped; deleted-neighbor threads remain admin/debug-readable only; `/api/v1/auth/*` and `/api/v1/platform/admin/*` stay `admin-api` owned; `admin-api` remains the only production migration executor  
**Scale/Scope**: One canonical payload enrichment path for outbound SMS, one dedicated projection module, one DTO/serializer, one new GET route with optional `limit`, deleted-neighbor flags in the timeline response envelope, SMS-first mapping now, and forward-compatible voice and voicemail item contracts without implementing cursor pagination, filtering, attachments, or read receipts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes affect `admin-web`, `admin-api`, or shared auth ownership.
- **Lane isolation preserved**: Pass. Runtime behavior stays within ConnectShyft lane modules and existing shared platform helpers; no cross-lane API coupling is introduced.
- **Routing delegation preserved**: Pass. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned; the new timeline route remains under the ConnectShyft lane route surface.
- **Deployment topology preserved**: Pass. No Nginx, container binding, public ingress, or frontend hosting changes are introduced, and validation will explicitly reconfirm host Nginx delegation, ConnectShyft API localhost-only binding, and shared Postgres connectivity remain unchanged.
- **Database ownership preserved**: Pass. Shared Postgres remains the storage model, canonical events continue to live in `platform.events`, and no lane-owned production migration path or timeline table is introduced.
- **Security boundaries preserved**: Pass. Timeline reads remain tenant-scoped, deleted-neighbor review keeps the existing admin/debug gate, and no new public endpoint exposure is added.
- **Workflow compliance**: Pass. The plan traces directly to the approved `025` spec and the user-supplied technical approach.
- **Acceptance criteria present**: Pass. The plan includes verifiable checks for ConnectShyft route behavior, unchanged Admin and MoneyShyft routing or deployment contracts, shared database compatibility, tenant isolation, and rollback safety through raw canonical event retrieval.

## Project Structure

### Documentation (this feature)

```text
specs/025-message-timeline-persistence-and-projection/
├── 01-specify.md
├── 02-plan.md
├── 03-tasks.md
├── 04-implement.md
├── 05-testing.md
├── 06-pr-template.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── message-timeline-projection.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
apps/connectshyft-api/
├── src/
│   ├── modules/connectshyft/
│   │   ├── __tests__/
│   │   │   ├── canonicalEvents.test.ts
│   │   │   ├── readContracts.test.ts
│   │   │   ├── threadTimeline.test.ts
│   │   │   └── threads.test.ts
│   │   ├── canonicalEvents.ts
│   │   ├── inboundSms.ts
│   │   ├── readContracts.ts
│   │   ├── threadTimeline.ts
│   │   ├── threadTimelineDto.ts
│   │   └── threads.ts
│   └── routes/api/v1/
│       ├── __tests__/
│       │   ├── connectshyft.provider-registry.dispatch-events.test.ts
│       │   └── connectshyft.timeline.test.ts
│       └── connectshyft.ts
├── Dockerfile.production
└── knexfile.js

apps/admin-api/
└── knexfile.js

nginx/nginx.conf
docker-compose.example.yml
docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

**Structure Decision**: This is a backend-only ConnectShyft lane feature. The plan introduces a dedicated timeline projection module and DTO inside `apps/connectshyft-api`, reuses existing canonical event persistence and deleted-neighbor read contracts, and exposes a new lane-owned GET route without adding a new service, migration authority, or cross-lane dependency.

## Contract Naming Convention

- Internal module, service, and data-model fields use camelCase.
- External HTTP DTO fields use snake_case.
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts` is the only translation boundary between internal service results and the public route contract.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Current Context Holders

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` currently resolves thread detail and attaches a `timeline` made from raw canonical events via the route-local `listCanonicalThreadEvents(...)` helper.
- The route-local timeline helper already preserves deterministic ordering by using the canonical-event store order, but it returns canonical records rather than first-class projected timeline items.
- `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts` already sorts canonical events by `occurred_at_utc` then `event_id` and caps reads at `200`, but the stored record shape does not expose actor semantics and outbound SMS canonical payloads do not include message body text.
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts` already emits `connectshyft.inbound.sms_appended` plus `inboundMessageArtifact.body`, so inbound SMS projection data is nearly complete.
- Outbound message dispatch in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` currently records canonical events with direction, channel, lifecycle event, and thread state only; that is insufficient for a first-class outbound SMS timeline item because the spec requires `body` and `actor`.
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` already exposes `neighborDeleted` and `neighborDeletedAtUtc` and already honors `includeDeleted` for deleted-neighbor thread detail, making it the right existing metadata seam for the new timeline route.
- The current route-local voice classification treats any `voice.` event as voicemail, which is incompatible with the requested future distinction between voice lifecycle items and voicemail artifacts.

## Planned Contract Deltas

- Enrich canonical outbound SMS event payloads so they carry an explicit projection-ready SMS event name, actor semantics, and outbound message artifact data required for first-class timeline items.
- Introduce a dedicated `getThreadTimeline({ tenantId, orgUnitId, threadId, limit })` service in a new timeline projection module that loads canonical events, maps supported event types to timeline items, and preserves deterministic ascending ordering.
- Introduce a dedicated timeline DTO/serializer that returns the spec-required item shape and a top-level snake_case response envelope containing `neighbor_deleted`, `neighbor_deleted_at_utc`, and `limit_applied`.
- Add `GET /api/v1/connectshyft/threads/:threadId/timeline` as the new read-only retrieval route, accept optional bounded retrieval through `limit`, and reuse the existing deleted-neighbor admin/debug gate when `includeDeleted=true`.
- Keep raw canonical event retrieval available through existing canonical event listing and leave current raw thread-detail timeline behavior intact during rollout so rollback can fall back to raw event retrieval without reconstructing history.
- Replace substring-based voice or voicemail inference for the new endpoint with an explicit event-to-item mapping table so future voice-started, voice-connected, voice-ended, and voicemail items remain distinct.
- Reuse the existing canonical-event cap of `200` records per read as the default no-`limit` behavior, support a bounded most-recent window through `limit`, and defer cursor pagination or channel filtering to later slices.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/research.md](/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/data-model.md).
- Runtime and API contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/contracts/message-timeline-projection.md](/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/contracts/message-timeline-projection.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. The design leaves platform shell and auth ownership unchanged.
- **Lane isolation preserved**: Pass. The design stays inside ConnectShyft route, canonical event, read-contract, and new timeline projection modules only.
- **Routing delegation preserved**: Pass. No auth or platform-admin ownership changes are introduced; the new route remains ConnectShyft-lane owned.
- **Deployment topology preserved**: Pass. The design adds a read-only route and projection logic only, and post-implementation validation still confirms host Nginx delegation, ConnectShyft API localhost-only binding, shared Postgres connectivity, and unchanged deployment runbook behavior.
- **Database ownership preserved**: Pass. Existing shared Postgres and `platform.events` remain canonical; no timeline table or lane-owned migration path is introduced.
- **Security boundaries preserved**: Pass. Deleted-neighbor timeline review remains gated, tenant scoping remains mandatory, and no public ingress changes are added.
- **Workflow compliance**: Pass. The design slices map directly to the approved `025` spec and the planning input.
- **Acceptance criteria present**: Pass. The design includes validation for deterministic ordering, bounded retrieval through `limit`, canonical payload completeness, deleted-neighbor visibility rules, unchanged Admin, MoneyShyft, and ConnectShyft routing or deployment contracts, and rollback to raw canonical event retrieval.

## Implementation Slices

### Slice 1 - Canonical Event Completeness for SMS Timeline Projection

**Primary goal**: make canonical SMS events carry enough provider-neutral data to serve as the sole source of truth for first-class SMS timeline items.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/canonicalEvents.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundSms.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Required changes**

- Preserve existing inbound SMS canonical payload behavior and add an explicit actor field where needed for projection parity.
- Enrich outbound SMS canonical event persistence so the stored canonical payload includes a projection-ready SMS event name, outbound body text, actor semantics, and available sender or recipient metadata.
- Keep canonical payloads provider-neutral and continue sanitizing provider-specific raw payload fields.
- Preserve deterministic canonical ordering and the existing maximum read cap.

**Must hold constant**

- No timeline table or direct timeline writes.
- Existing canonical event list behavior remains deterministic and provider-neutral.
- Existing outbound dispatch side effects, audit, and idempotency behavior remain intact.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/canonicalEvents.test.ts src/modules/connectshyft/__tests__/inboundSms.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Commit checkpoint**

- Safe to commit once canonical inbound and outbound SMS events contain the minimum projection-ready fields required by the spec and no route writes directly to any timeline storage.

### Slice 2 - Thread Timeline Projection Service and DTO

**Primary goal**: introduce a dedicated read-only timeline projection layer that turns canonical events into first-class timeline items with explicit channel and future-type semantics.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`

**Required changes**

- Create `getThreadTimeline({ tenantId, orgUnitId, threadId, limit })` as the projection entrypoint.
- Load canonical thread events through the existing canonical event persistence layer.
- Map supported canonical events to first-class timeline items:
  - inbound SMS appended -> inbound SMS timeline item
  - outbound SMS appended or outbound message canonical alias -> outbound SMS timeline item
- Keep ordering oldest-to-newest with `(occurred_at_utc, canonical_event_id)` tie-breaking.
- Keep internal service result fields in camelCase so the DTO layer can convert them into the external snake_case contract.
- Use explicit event mapping so future voice lifecycle items remain separate from voicemail items.
- Reuse existing thread detail metadata so the response envelope can expose deleted-neighbor flags without duplicating deleted state.

**Must hold constant**

- The timeline remains read-only and derived entirely from canonical events.
- Existing thread lifecycle state persistence remains unchanged.
- Deleted-neighbor visibility rules remain controlled by existing read-contract and route gating semantics.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/threadTimeline.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts`

**Commit checkpoint**

- Safe to commit once `getThreadTimeline(...)` returns deterministic projected SMS timeline items, deleted-neighbor flags are present in the response envelope, and future voice or voicemail placeholders no longer depend on substring heuristics.

### Slice 3 - Timeline Retrieval Route, Access Controls, and Rollback Safety

**Primary goal**: expose the new timeline projection through a dedicated route while preserving current ConnectShyft routing, deleted-neighbor admin/debug behavior, bounded retrieval through `limit`, and raw canonical-event rollback options.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`
- verification-only platform contract files:
  - `nginx/nginx.conf`
  - `docker-compose.example.yml`
  - `apps/connectshyft-api/Dockerfile.production`
  - `apps/admin-api/knexfile.js`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Required changes**

- Add `GET /api/v1/connectshyft/threads/:threadId/timeline`.
- Enforce the same tenant and org-unit context rules as thread detail.
- Reuse the existing deleted-neighbor admin/debug gate when `includeDeleted=true`; otherwise keep normal thread-view capability enforcement.
- Return a response envelope that includes the thread identifier, `neighbor_deleted`, `neighbor_deleted_at_utc`, `limit_applied`, deterministic ordering metadata, and the projected timeline items.
- Preserve ConnectShyft business-refusal semantics for missing thread IDs, inaccessible threads, and deleted-neighbor review without admin/debug authorization.
- Keep existing raw canonical event retrieval and current thread-detail behavior available so rollback can disable the timeline endpoint and fall back to raw event retrieval.
- Reconfirm host Nginx delegation, ConnectShyft API localhost-only binding, shared Postgres connectivity, unchanged `admin-api` route ownership, and no incidental MoneyShyft routing or deployment drift.

**Must hold constant**

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` ownership boundaries.
- No cross-tenant timeline leakage.
- No new public ingress or migration authority changes.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.timeline.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Commit checkpoint**

- Safe to commit once the new timeline route is tenant-scoped, deleted-neighbor review behaves correctly, deterministic ordering is proven, and disabling the route cleanly reverts consumers to raw canonical event retrieval.
