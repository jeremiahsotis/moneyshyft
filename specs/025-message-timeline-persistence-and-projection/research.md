# Research: ConnectShyft Message Timeline Persistence and Projection

The planning input and code review surfaced two material gaps that had to be resolved before design: outbound SMS canonical events do not yet carry projection-ready body or actor data, and the current raw thread timeline heuristic classifies all `voice.*` events as voicemail. The decisions below resolve those gaps and the related route-contract choices.

## Decision 1: Reuse canonical event persistence as the only timeline source and do not add timeline storage

- **Decision**: Keep `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts` as the sole persistence source for thread history and implement the timeline strictly as a read projection.
- **Rationale**: The spec prohibits direct writes to timeline storage and requires canonical events to remain the source of truth. The repository already persists provider-neutral canonical thread events into `platform.events` and already guarantees deterministic ordering.
- **Alternatives considered**:
  - Add a `thread_timeline` table populated during message send or webhook intake: rejected because it would introduce a second source of truth and direct timeline mutation.
  - Build timeline items from non-canonical side-effect tables: rejected because it would bypass the approved canonical event pipeline.

## Decision 2: Enrich outbound SMS canonical payloads before building the projection

- **Decision**: Expand outbound SMS canonical event payloads so they include a projection-ready event name such as `connectshyft.outbound.sms_appended`, actor semantics, outbound message body, and available sender or target metadata.
- **Rationale**: Current outbound message canonical events persist only direction, channel, lifecycle event, and thread state. That is insufficient because the spec requires first-class SMS items with `body` and `actor`, and the timeline must be derived only from canonical events.
- **Alternatives considered**:
  - Derive outbound message body from route response payloads or communication audit tables: rejected because those are not the canonical event source of truth.
  - Omit outbound message bodies from the first release: rejected because SMS items are required to include `body`.

## Decision 3: Store actor semantics in canonical payloads rather than relying on platform event envelope metadata

- **Decision**: Persist a provider-neutral actor classification in the canonical payload for projection purposes.
- **Rationale**: `recordConnectShyftCanonicalEvent(...)` records `actorId` in the platform mutation envelope, but `listConnectShyftCanonicalEvents(...)` returns only the stored canonical record payload and not the platform event envelope fields. In-memory fallback behavior also lacks envelope metadata, so actor information must travel with the canonical payload to keep DB and in-memory behavior aligned.
- **Alternatives considered**:
  - Extend canonical event list queries to read actor columns from `platform.events`: rejected because it would still leave in-memory fallback behavior incomplete and would couple projection behavior to envelope persistence details.
  - Infer actor only from direction: rejected because outbound actions may be user-initiated or system-initiated and the spec requires explicit `actor`.

## Decision 4: Introduce a dedicated timeline projection module and DTO instead of expanding the current route-local helper

- **Decision**: Replace the route-local raw timeline helper with a dedicated projection service in a new module plus a dedicated serializer or DTO layer.
- **Rationale**: The current route-local helper returns raw canonical records and uses a coarse `message/voicemail/lifecycle` inference. A separate projection module keeps mapping rules testable, avoids mixing route authorization with event translation, and provides a clean seam for future voice and voicemail expansion.
- **Alternatives considered**:
  - Continue expanding the existing route-local `listCanonicalThreadEvents(...)` helper: rejected because projection rules, DTO shaping, and route authorization would remain tightly coupled.
  - Add the new behavior into `threads.ts`: rejected because `threads.ts` is lifecycle and persistence oriented rather than read-projection oriented.

## Decision 5: Add a dedicated timeline route and keep raw canonical event retrieval available for backward compatibility and rollback

- **Decision**: Add `GET /api/v1/connectshyft/threads/:threadId/timeline` for projected timeline reads and leave existing raw canonical event retrieval available.
- **Rationale**: Existing thread detail already returns a raw canonical `timeline` array, and changing that shape in place would create avoidable consumer risk. A dedicated route lets the projection contract evolve without breaking current raw-event consumers and gives rollback a clean fallback path.
- **Alternatives considered**:
  - Replace the existing `timeline` field inside `GET /threads/:threadId` immediately: rejected because the current consumer expects raw canonical-event-shaped entries.
  - Require consumers to call `/events` and project client-side: rejected because the projection must be canonical, deterministic, tenant-scoped, and server-owned.

## Decision 6: Use explicit event-to-item mapping instead of substring heuristics for voice and voicemail

- **Decision**: Drive item channel and future type from an explicit mapping table rather than substring tests such as “anything containing `voice.` is voicemail.”
- **Rationale**: The requested contract must distinguish future voice lifecycle items from voicemail artifacts. The current substring heuristic would incorrectly classify `voice.connected` as voicemail and block forward-compatible evolution.
- **Alternatives considered**:
  - Keep current heuristic classification and patch new edge cases as they appear: rejected because it already conflicts with the required voice-event contract.
  - Treat every non-SMS event as lifecycle-only for now: rejected because voicemail remains a required first-class placeholder.

## Decision 7: Reuse existing deleted-neighbor read metadata and admin/debug gating for the new timeline route

- **Decision**: Reuse the current `includeDeleted=true` route gate and `readContracts.ts` deleted-neighbor metadata to populate `neighbor_deleted` and `neighbor_deleted_at_utc` in the new timeline response.
- **Rationale**: The repository already distinguishes standard operational thread reads from admin/debug deleted-neighbor review. Reusing that seam avoids duplicating lifecycle state or creating a second authorization path.
- **Alternatives considered**:
  - Copy deleted flags into the timeline item model: rejected because deleted state is thread-level context, not an attribute of every canonical event.
  - Add a separate admin-only timeline route: rejected because the existing route surface already supports deleted-aware review through `includeDeleted=true`.

## Decision 8: Support a bounded `limit` now and defer cursor pagination mechanics

- **Decision**: Reuse the existing maximum canonical-event cap of `200` records per read, add an optional `limit` parameter for bounded most-recent retrieval, and defer cursor or offset pagination to a later slice.
- **Rationale**: The spec needs a testable present-tense pagination-compatible behavior. A bounded `limit` resolves the coverage gap without introducing full pagination mechanics.
- **Alternatives considered**:
  - Implement full pagination now: rejected because it is explicitly out of scope for this feature slice.
  - Defer all limit behavior entirely: rejected because it leaves pagination compatibility underspecified and untestable.
  - Remove any read cap and load unbounded event history: rejected because large threads would raise unnecessary performance risk.
