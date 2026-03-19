# Tasks: ConnectShyft Message Timeline Persistence and Projection

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/contracts/message-timeline-projection.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/quickstart.md`

**Tests**: Included because the spec, quickstart, and user input explicitly require verification for ordering correctness, inbound and outbound mix, bounded retrieval through `limit`, empty-timeline behavior, tenant scoping, thread existence validation, soft-deleted neighbor visibility, and forward-compatible voice or voicemail contracts.

**Organization**: Tasks are grouped into setup, foundational prerequisites, then one phase per user story in priority order so each story remains independently executable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new projection and route test surfaces before shared implementation begins.

- [X] T001 Create projection and route test scaffolds in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`
- [X] T002 [P] Create timeline projection module and serializer scaffolds in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared projection types, canonical payload seams, and deleted-neighbor metadata hooks that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Define shared internal camelCase timeline item types, future `type` discriminators, and service result contracts in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- [X] T004 [P] Extend projection-ready canonical SMS payload seams and event-name constants in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T005 [P] Expose the minimum deleted-neighbor metadata needed for timeline responses in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T006 [P] Add reusable request parsing and authorization helpers for `GET /api/v1/connectshyft/threads/:threadId/timeline` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: Shared projection contracts, canonical payload seams, deleted-neighbor metadata, and route helper scaffolding are ready for story-specific work.

---

## Phase 3: User Story 1 - Review a Complete SMS Thread in Order (Priority: P1) 🎯 MVP

**Goal**: Deliver a unified read-only thread timeline API that returns inbound and outbound SMS as first-class items in stable oldest-to-newest order.

**Independent Test**: Call `GET /api/v1/connectshyft/threads/:threadId/timeline` for a thread with mixed inbound and outbound SMS canonical events and verify ordered first-class items, correct inbound and outbound mapping, stable tie-breaking, optional `limit` windows, and empty results for threads with no eligible canonical events.

### Tests for User Story 1

- [X] T007 [P] [US1] Add unit coverage for inbound SMS mapping, outbound SMS mapping, stable sorting, and empty timeline behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`
- [X] T008 [P] [US1] Add route coverage for ordered mixed SMS timeline retrieval and empty timeline responses in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`
- [X] T009 [US1] Extend canonical-event regression coverage for projection-ready outbound SMS payload completeness in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/canonicalEvents.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- [X] T010 [P] [US1] Add unit and route coverage for optional `limit`-bounded timeline windows in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Enrich canonical inbound and outbound SMS payload builders with projection-ready event names, actor fields, message bodies, and sender-target metadata in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T012 [US1] Implement `getThreadTimeline({ tenantId, orgUnitId, threadId, limit })`, canonical event mapping, stable ascending sorting, and bounded most-recent windowing in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- [X] T013 [US1] Implement timeline item serialization that converts internal camelCase projection results into external snake_case SMS DTO fields in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- [X] T014 [US1] Add `GET /api/v1/connectshyft/threads/:threadId/timeline` with optional `limit` parsing and projected SMS item responses in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T015 [P] [US1] Document `limit` behavior and external snake_case response expectations in `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/contracts/message-timeline-projection.md` and `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/quickstart.md`
- [X] T016 [US1] Run focused US1 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/canonicalEvents.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Checkpoint**: User Story 1 is complete when a timeline endpoint returns first-class inbound and outbound SMS items in deterministic oldest-to-newest order, bounded retrieval through `limit` preserves ordering within the returned window, and empty threads produce an empty item array.

---

## Phase 4: User Story 2 - Review Deleted-Neighbor History Without Reintroducing It to Operations (Priority: P2)

**Goal**: Keep deleted-neighbor thread timelines visible only to authorized admin/debug review while preserving tenant scoping and hiding deleted threads from standard operational access.

**Independent Test**: Request the timeline endpoint for active and soft-deleted-neighbor threads in both normal and `includeDeleted=true` admin/debug contexts and verify `neighbor_deleted` metadata is present only in authorized timeline responses, standard operational flows stay hidden, and cross-tenant or inaccessible thread requests reveal nothing useful.

### Tests for User Story 2

- [X] T017 [P] [US2] Add read-contract coverage for deleted-neighbor metadata and standard hidden behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
- [X] T018 [P] [US2] Add route coverage for tenant scoping, thread existence validation, and admin-only deleted-neighbor timeline access in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Extend thread detail or read-contract lookup to supply `neighborDeleted` and `neighborDeletedAtUtc` for timeline reads in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T020 [US2] Enforce tenant-scoped thread existence validation and `includeDeleted=true` admin-debug authorization for the timeline route in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T021 [US2] Surface snake_case `neighbor_deleted`, `neighbor_deleted_at_utc`, and `limit_applied` in the timeline response envelope in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T022 [US2] Run focused US2 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

**Checkpoint**: User Story 2 is complete when deleted-neighbor timelines are admin/debug-only, standard operational callers cannot access them, thread existence validation is deterministic, and the timeline envelope includes deleted-neighbor flags.

---

## Phase 5: User Story 3 - Extend the Same Timeline Contract to Voice and Voicemail Later (Priority: P3)

**Goal**: Keep the new timeline contract forward-compatible with explicit voice lifecycle items and voicemail placeholders without breaking current SMS behavior.

**Independent Test**: Feed sample future voice-started, voice-connected, voice-ended, and voicemail canonical events into the projection service and verify they fit the reserved contract, preserve ordering, and do not disturb current SMS item mapping.

### Tests for User Story 3

- [X] T023 [P] [US3] Add unit coverage for explicit voice-event and voicemail placeholder mapping in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`
- [X] T024 [P] [US3] Add route-level contract coverage that future-safe voice or voicemail placeholders do not regress SMS ordering semantics in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

### Implementation for User Story 3

- [X] T025 [US3] Replace substring-based voice or voicemail inference with an explicit event-to-item mapping registry in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts`
- [X] T026 [US3] Add reserved voicemail placeholder serialization fields and future `type` or `channel` handling in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threadTimelineDto.ts`
- [X] T027 [US3] Preserve raw canonical event retrieval as the rollback path while isolating the new projected route behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T028 [US3] Run focused US3 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

**Checkpoint**: User Story 3 is complete when the projection uses explicit voice or voicemail mapping rules, voicemail placeholders serialize correctly, and raw canonical event retrieval remains available for rollback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize validation surfaces and reconfirm unchanged platform contracts after all story work is complete.

- [X] T029 [P] Update final validation notes and rollout evidence in `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/05-testing.md`, `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/06-pr-template.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/025-message-timeline-persistence-and-projection/quickstart.md`
- [X] T030 [P] Validate unchanged Admin, MoneyShyft, and ConnectShyft routing or deployment contracts using `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T031 Run final build and timeline regression verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/canonicalEvents.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and creates the new projection and test surfaces.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user story work.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and delivers the MVP projected SMS timeline.
- **User Story 2 (Phase 4)**: Depends on Phase 3 because the new timeline route and projection service must already exist before deleted-neighbor access rules can be validated on them.
- **User Story 3 (Phase 5)**: Depends on Phase 3 because the forward-compatible voice or voicemail contract extends the same timeline projection and route introduced in US1.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after the foundational phase; this is the recommended MVP.
- **US2 (P2)**: Builds on US1’s route, DTO, and projection surfaces, then remains independently testable through deleted-neighbor fixtures.
- **US3 (P3)**: Builds on US1’s route, DTO, and projection surfaces, then remains independently testable with future voice or voicemail fixture events.

### Within Each User Story

- Tests should be written and fail before implementation tasks are considered complete.
- Canonical payload completeness should land before projection mapping relies on it.
- Projection logic should land before route response shaping.
- Route behavior should land before focused story verification.

## Parallel Opportunities

- **Setup**: T001 and T002 can run in parallel because they create different test and implementation files.
- **Foundational**: T004, T005, and T006 can run in parallel because they touch separate canonical payload, read-contract, and route-helper surfaces.
- **US1**: T007, T008, and T010 can run in parallel because they touch different test surfaces.
- **US2**: T017 and T018 can run in parallel because they touch different test files.
- **US3**: T023 and T024 can run in parallel because they touch different test files.
- **Polish**: T029 and T030 can run in parallel because documentation updates are separate from deployment or routing verification.

---

## Parallel Example: User Story 1

```bash
Task: "T007 Add unit coverage for inbound SMS mapping, outbound SMS mapping, stable sorting, and empty timeline behavior in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts"
Task: "T008 Add route coverage for ordered mixed SMS timeline retrieval and empty timeline responses in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts"
Task: "T010 Add unit and route coverage for optional limit-bounded timeline windows in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "T017 Add read-contract coverage for deleted-neighbor metadata and standard hidden behavior in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts"
Task: "T018 Add route coverage for tenant scoping, thread existence validation, and admin-only deleted-neighbor timeline access in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T023 Add unit coverage for explicit voice-event and voicemail placeholder mapping in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts"
Task: "T024 Add route-level contract coverage that future-safe voice or voicemail placeholders do not regress SMS ordering semantics in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.timeline.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational shared seams.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Confirm the timeline endpoint returns first-class inbound and outbound SMS items in stable ascending order before taking on deleted-neighbor or future-channel work.

### Incremental Delivery

1. Finish Setup + Foundational to lock canonical payload seams, projection contracts, and route helper scaffolding.
2. Deliver User Story 1 and validate the SMS timeline as the first usable increment.
3. Deliver User Story 2 and validate deleted-neighbor admin/debug review plus tenant-scoped access control.
4. Deliver User Story 3 and validate future-safe voice or voicemail mapping contracts.
5. Finish with Phase 6 full regression and platform-contract verification.

### Suggested MVP Scope

- **Recommended MVP**: Phase 1 + Phase 2 + Phase 3.
- **Second increment**: Phase 4 for deleted-neighbor visibility rules and thread existence validation.
- **Third increment**: Phase 5 for voice or voicemail contract hardening.

### Notes

- Keep canonical events as the only source of truth in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts` and do not add timeline storage anywhere in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/`.
- Preserve raw canonical event retrieval as the rollback option while the new projected route is introduced in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Preserve the existing deleted-neighbor admin/debug contract in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
