# Tasks: ConnectShyft Neighbor Soft Delete Admin Controls

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/contracts/neighbor-soft-delete-admin-controls.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/quickstart.md`

**Tests**: Included because the spec, quickstart, and user input explicitly require delete confirmation enforcement, admin-only access, phone deactivation, deleted-record filtering, deleted-thread annotations, and inbound SMS regression coverage.

**Organization**: Tasks are grouped into setup, foundational prerequisites, then one phase per user story in spec priority order so each story stays independently executable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the pre-existing lifecycle schema assumption and align the feature verification surfaces before runtime changes begin.

- [X] T001 Verify and document the existing `is_deleted`, `deleted_at_utc`, and `deleted_by_user_id` preflight plus delete inspection queries in `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/quickstart.md`
- [X] T002 [P] Extend lifecycle-column and rollback regression coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`
- [X] T003 [P] Align the soft-delete validation and rollout checklist in `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/05-testing.md` and `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/06-pr-template.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared soft-delete runtime seams that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T004 Add shared soft-delete command types, success/refusal result shapes, and refusal builders in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T005 [P] Add in-memory deleted-state mutation helpers and active-only list/detail branching primitives in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T006 [P] Add deleted-neighbor projection fields to the thread read-contract types in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T007 Add delete-route request parsing, irreversible-confirmation parsing, and reusable tenant-privileged admin guard helpers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

**Checkpoint**: Soft-delete command types, read-contract projection fields, and delete-route guard seams are ready for story-specific implementation.

---

## Phase 3: User Story 1 - Safely Remove a Neighbor from Operations (Priority: P1) 🎯 MVP

**Goal**: Let an authorized administrator soft-delete a neighbor with explicit irreversible confirmation, deactivate all phones, hide the deleted neighbor from standard operational flows, and create an auditable delete event.

**Independent Test**: Submit an authorized delete request with `irreversibleConfirmation = true`, then confirm the neighbor is marked deleted, all phones are inactive, standard list/search/messaging/calling flows exclude the neighbor, and a first-time soft-delete audit event exists; also verify that missing confirmation, missing capability, and repeated-delete cases behave correctly without creating a duplicate soft-delete audit event.

### Tests for User Story 1

- [X] T008 [P] [US1] Add store/service coverage for first-time delete, missing confirmation, missing capability, phone deactivation, and idempotent repeated delete without a duplicate soft-delete audit event in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T009 [P] [US1] Add route coverage for admin-only delete success, confirmation failure, capability failure, not-found handling, and deleted-neighbor exclusion from standard list/search, messaging-selection, and calling-selection flows in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Implement transactional `softDeleteNeighbor({ tenantId, neighborId, actorUserId, irreversibleConfirmation })` for the Knex and in-memory stores in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T011 [US1] Implement active-only filtering for standard neighbor listing, search, and the messaging/calling selector read paths in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T012 [US1] Implement `DELETE /api/v1/connectshyft/neighbors/:neighborId` with irreversible-confirmation enforcement and tenant-privileged admin capability checks in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T013 [US1] Wire first-time successful soft delete through `executePlatformMutation(...)` with a dedicated neighbor soft-delete audit/outbox event payload, while repeated deletes return preserved deleted metadata without a new audit event, in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T014 [US1] Run focused US1 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Checkpoint**: User Story 1 is complete when soft delete is admin-only, confirmation-gated, auditable, phone-deactivating, and hidden from standard operational flows.

---

## Phase 4: User Story 2 - Review Deleted Neighbor History in Admin Context (Priority: P2)

**Goal**: Keep deleted neighbors and their thread history available for admin/debug review through the existing ConnectShyft detail routes with `includeDeleted=true`, while ensuring normal thread and detail flows stay hidden from ordinary operations.

**Independent Test**: Retrieve a deleted neighbor and its thread detail through the existing ConnectShyft detail routes with `includeDeleted=true` and confirm `is_deleted`, `deleted_at_utc`, `deleted_by_user_id`, `neighbor_deleted`, and `neighbor_deleted_at_utc` are visible, while the same records remain excluded from standard detail and inbox flows.

### Tests for User Story 2

- [X] T015 [P] [US2] Add read-contract coverage for deleted-neighbor thread exclusion in standard flows and deleted-flag enrichment in admin/debug detail in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
- [X] T016 [P] [US2] Add route coverage for deleted-neighbor retrieval through existing ConnectShyft detail routes with `includeDeleted=true` versus standard hidden behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Implement deleted-neighbor filtering and deleted-flag projection enrichment in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T018 [US2] Implement deleted-aware neighbor and thread detail handling for existing ConnectShyft detail routes when `includeDeleted=true` is supplied by a tenant-privileged admin/debug caller in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T019 [US2] Add `neighbor_deleted` and `neighbor_deleted_at_utc` response shaping to thread detail handling in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T020 [US2] Run focused US2 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Checkpoint**: User Story 2 is complete when deleted records remain retrievable through existing ConnectShyft detail routes with `includeDeleted=true`, expose explicit deletion metadata, and stay excluded from standard detail and inbox flows.

---

## Phase 5: User Story 3 - Continue Intake After a Deleted Neighbor's Phone Is Reused (Priority: P3)

**Goal**: Preserve active-only inbound identity behavior so deleted-only phone history creates a new neighbor and never resurrects the deleted record.

**Independent Test**: Soft-delete a neighbor, confirm its phones are inactive, then process inbound SMS for that deleted-only phone history and verify a new neighbor is created while the deleted record remains unchanged; also confirm that later active reassignment remains the current operational owner.

### Tests for User Story 3

- [X] T021 [P] [US3] Add deleted-only phone reuse and inbound new-neighbor coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T022 [P] [US3] Add provider-dispatch regression coverage for inbound SMS after soft delete in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Ensure deleted-neighbor and inactive-phone exclusion remains enforced in active identity lookups and inbound helper paths in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- [X] T024 [US3] Keep deleted neighbors out of UI-facing inbox/search, messaging-selector, calling-selector, and inbound reuse flows after phone deactivation in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T025 [US3] Run focused US3 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Checkpoint**: User Story 3 is complete when deleted-only phone history always creates a new neighbor and deleted identities never re-enter active inbound resolution.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize rollout notes and re-verify unchanged platform contracts after all story work is complete.

- [X] T026 [P] Validate host Nginx delegation, ConnectShyft API localhost-only binding on canonical port `3002`, shared Postgres connectivity, and shared migration authority using `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T027 [P] Reconcile final soft-delete validation and rollout notes in `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/05-testing.md`, `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/06-pr-template.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/quickstart.md`
- [ ] T028 Run final build, regression, and deployment runbook reproducibility verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` using `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` plus `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and locks the schema/testing assumptions.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user story work.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and delivers the MVP soft-delete capability.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and on deleted-state mutation behavior being available from US1 for realistic deleted-aware detail validation through `includeDeleted=true`.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and on the deleted-state plus phone-deactivation behavior delivered in US1.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after the foundational phase; this is the recommended MVP.
- **US2 (P2)**: Builds on deleted-state data created by US1 but remains independently testable once a deleted neighbor exists.
- **US3 (P3)**: Builds on US1’s delete-and-deactivate behavior and remains independently testable with deleted-only phone history fixtures.

### Within Each User Story

- Tests must be written and fail before implementation tasks are considered complete.
- Store and model-shaping work precedes route behavior.
- Route behavior precedes focused story verification.
- Story verification should pass before moving to the next priority.

## Parallel Opportunities

- **Setup**: T002 and T003 can run in parallel because they touch separate migration and feature-doc surfaces.
- **Foundational**: T005 and T006 can run in parallel because they touch separate shared runtime files.
- **US1**: T008 and T009 can run in parallel because they touch different test surfaces.
- **US2**: T015 and T016 can run in parallel because they touch different test surfaces.
- **US3**: T021 and T022 can run in parallel because they touch different test surfaces.
- **Polish**: T026 and T027 can run in parallel because deployment-contract verification is independent of feature-doc finalization.

---

## Parallel Example: User Story 1

```bash
Task: "T008 Add store/service coverage for first-time delete, missing confirmation, missing capability, phone deactivation, and idempotent repeated delete without a duplicate soft-delete audit event in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "T009 Add route coverage for admin-only delete success, confirmation failure, capability failure, not-found handling, and deleted-neighbor exclusion from standard list/search, messaging-selection, and calling-selection flows in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "T015 Add read-contract coverage for deleted-neighbor thread exclusion in standard flows and deleted-flag enrichment in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts"
Task: "T016 Add route coverage for deleted-neighbor retrieval through existing ConnectShyft detail routes with includeDeleted=true versus standard hidden behavior in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T021 Add deleted-only phone reuse and inbound new-neighbor coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "T022 Add provider-dispatch regression coverage for inbound SMS after soft delete in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational shared seams.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Confirm admin-only soft delete, confirmation enforcement, phone deactivation, and audit behavior before taking on review/inbound follow-up work.

### Incremental Delivery

1. Finish Setup + Foundational to lock schema, result types, and delete-route scaffolding.
2. Deliver User Story 1 and validate the core soft-delete flow as the first usable increment.
3. Deliver User Story 2 and validate deleted-aware review through `includeDeleted=true` plus deleted-thread indicators.
4. Deliver User Story 3 and validate deleted-only inbound reuse behavior.
5. Finish with Phase 6 full regression and platform-contract verification.

### Suggested MVP Scope

- **Recommended MVP**: Phase 1 + Phase 2 + Phase 3.
- **Second increment**: Phase 4 for deleted-aware retrieval through `includeDeleted=true` and deleted-thread metadata.
- **Third increment**: Phase 5 for inbound SMS reuse hardening after soft delete.

### Notes

- Keep the lifecycle schema assumption anchored to `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts` unless implementation proves otherwise.
- Do not add hard delete, restore, or cascade-delete behavior anywhere in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` or `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Preserve active-only inbound identity behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`.
