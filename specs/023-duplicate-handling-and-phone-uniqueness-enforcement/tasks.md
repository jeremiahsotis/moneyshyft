# Tasks: ConnectShyft Duplicate Phone Uniqueness Enforcement

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/contracts/duplicate-phone-enforcement.md`, `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/quickstart.md`

**Tests**: Included because the spec and user input explicitly require duplicate create and update refusals, migration safety validation, soft-deleted reuse coverage, and ambiguity regression coverage.

**Organization**: Tasks are grouped into setup, foundational prerequisites, then one phase per user story in spec priority order so each story remains independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the missing regression surfaces needed by later phases.

- [X] T001 [P] Create neighbor duplicate-refusal route regressions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- [X] T002 [P] Create phone-uniqueness migration regressions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core migration and rollout prerequisites that MUST be complete before ANY user story work can be considered done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Identify existing duplicate current phone assignments and record the inventory query, grandfathering expectation, and rollback notes in `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/quickstart.md`
- [X] T004 Create the shared migration and lane-local mirror for phone uniqueness enforcement in `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations/20260318143000_add_connectshyft_neighbor_phone_uniqueness.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260318143000_add_connectshyft_neighbor_phone_uniqueness.ts`
- [X] T005 [P] Validate grandfathering, partial unique index creation, and down-migration rollback in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`
- [X] T006 [P] Tighten migration safety coverage for canonical phone lookup and lifecycle coexistence in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Checkpoint**: Shared migration authority, safety-net shape, and rollout validation are in place.

---

## Phase 3: User Story 1 - Reject Duplicate Assignment Attempts (Priority: P1) 🎯 MVP

**Goal**: Refuse duplicate current phone assignments during create, update, and phone replacement flows without changing existing ownership.

**Independent Test**: Create a neighbor with a unique phone, then attempt duplicate create, duplicate update, and same-neighbor save flows; only the unique create and self-retaining update should succeed, and all conflicting writes should return the standardized duplicate refusal without changing ownership.

### Tests for User Story 1

- [X] T007 [P] [US1] Add duplicate create, duplicate update, duplicate phone add or replace, self-retaining update, and formatting-variant coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T008 [P] [US1] Add business-refusal route coverage for duplicate create and duplicate update in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Define `CONNECTSHYFT_PHONE_DUPLICATE`, `duplicate_phone`, and `phones` field-error refusal builders in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T010 [US1] Add current-owner lookup helpers for canonical active phones in the in-memory and Knex stores inside `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T011 [US1] Enforce duplicate preflight in `createNeighbor(...)`, `createNeighborFromInbound(...)`, `updateNeighbor(...)`, and any dedicated phone add or replace entrypoint with same-neighbor exclusion in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T012 [US1] Propagate duplicate refusal data through neighbor create and update route responses in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T013 [US1] Map partial-unique-index race failures back to `CONNECTSHYFT_PHONE_DUPLICATE` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T014 [US1] Run focused US1 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Checkpoint**: User Story 1 should now block duplicate current ownership deterministically for create, update, and replacement writes.

---

## Phase 4: User Story 2 - Refuse Ambiguous Phone Identity Resolution (Priority: P2)

**Goal**: Preserve explicit ambiguity when legacy duplicate current owners exist and ensure no caller silently falls back after an ambiguity outcome.

**Independent Test**: Resolve phone-based identity for one current owner, no current owner, and multiple current owners; confirm the resolver and its callers return `single_match`, `no_match`, or ambiguity only, with no arbitrary winner selection or hidden fallback path.

### Tests for User Story 2

- [X] T015 [P] [US2] Add resolver coverage for canonical formatting variants, multiple current matches, deleted-only no-match, and mixed current plus deleted outcomes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- [X] T016 [P] [US2] Add route and guardrail ambiguity coverage with no fallback selection in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Preserve the ambiguity outcome for legacy duplicate current owners in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`, keeping internal resolver naming aligned with the spec contract
- [X] T018 [US2] Audit and tighten ambiguity propagation so no caller falls back after `multiple_matches` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T019 [US2] Run focused US2 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

**Checkpoint**: User Story 2 should now keep legacy duplicate sets ambiguous everywhere the phone identity result is consumed.

---

## Phase 5: User Story 3 - Reuse Numbers Released by Soft Deletion (Priority: P3)

**Goal**: Exclude soft-deleted neighbors from uniqueness enforcement and identity reuse so deleted numbers can be reassigned safely while current owners still block duplicates.

**Independent Test**: Reassign a phone owned only by soft-deleted neighbors, then test deleted-only, deleted-plus-current, and current-owner-conflict scenarios; deleted-only cases should allow reuse or resolve to `no_match`, while any remaining current owner still blocks reuse or produces the expected match outcome.

### Tests for User Story 3

- [X] T020 [P] [US3] Add soft-deleted reuse and mixed-owner coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T021 [P] [US3] Add route coverage for soft-deleted phone reuse and unchanged refusal semantics in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

### Implementation for User Story 3

- [X] T022 [US3] Extend duplicate-owner lookup and in-memory deleted-neighbor test support to exclude soft-deleted neighbors in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T023 [US3] Preserve deleted-neighbor exclusion in canonical phone identity resolution queries and outcomes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- [X] T024 [US3] Run focused US3 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`

**Checkpoint**: User Story 3 should now allow deleted-only phone reuse while preserving duplicate blocking for any remaining current owner.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across migration, runtime, and platform-contract surfaces.

- [X] T025 [P] Verify ConnectShyft route ownership and Nginx delegation remain unchanged using `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T026 [P] Verify Docker binding, shared Postgres connectivity, production migration authority, and reproducible deployment runbook steps remain unchanged using `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T027 Run final build and regression verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and delivers the first usable increment.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and should land after US1 so duplicate-write behavior is fixed before ambiguity regression hardening.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and on the duplicate-owner lookup introduced in US1.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after foundation; this is the recommended MVP.
- **US2 (P2)**: Depends on the write- and lookup-shaping work from US1 only where shared duplicate-owner helpers are reused.
- **US3 (P3)**: Depends on the duplicate-owner lookup from US1 and shares resolver verification with US2, but remains independently testable once those prerequisites exist.

### Within Each User Story

- Tests must be written and fail before implementation tasks are considered complete.
- Refusal builders and lookup helpers precede write-path wiring.
- Store and resolver behavior precede route-level propagation checks.
- Focused story verification precedes final cross-story regression runs.

## Parallel Opportunities

- **Setup**: T001 and T002 can run in parallel because they create different test files.
- **Foundational**: T005 and T006 can run in parallel after T004 because they tighten different migration test files.
- **US1**: T007 and T008 can run in parallel because they touch different test surfaces.
- **US2**: T015 and T016 can run in parallel because they touch different test surfaces.
- **US3**: T020 and T021 can run in parallel because they touch different test surfaces.
- **Polish**: T025 and T026 can run in parallel because route delegation verification is independent of deployment and DB contract verification.

---

## Parallel Example: User Story 1

```bash
Task: "T007 Add duplicate create, duplicate update, and self-retaining update coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "T008 Add business-refusal route coverage for duplicate create and duplicate update in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "T015 Add resolver coverage for multiple current matches, deleted-only no-match, and mixed current plus deleted outcomes in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts"
Task: "T016 Add route and guardrail ambiguity coverage with no fallback selection in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T020 Add soft-deleted reuse and mixed-owner coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "T021 Add route coverage for soft-deleted phone reuse and unchanged refusal semantics in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational migration and rollout prerequisites.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run the US1 independent tests before taking on ambiguity or deleted-neighbor behavior.

### Incremental Delivery

1. Finish Setup + Foundational to lock the shared migration and regression surfaces.
2. Deliver User Story 1 and validate duplicate-write refusals as the first product increment.
3. Deliver User Story 2 and validate that legacy duplicates still hard-fail as ambiguous.
4. Deliver User Story 3 and validate deleted-only reuse without breaking current-owner blocking.
5. Finish with Phase 6 full verification and platform-contract review.

### Suggested MVP Scope

- **Recommended MVP**: Phase 1 + Phase 2 + Phase 3.
- **Second increment**: Phase 4 to harden deterministic ambiguity behavior once duplicate writes are blocked.
- **Third increment**: Phase 5 to finish soft-deleted reuse semantics.

### Notes

- Keep tests failing first before implementation in each story phase.
- Do not add raw-string phone comparisons anywhere in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` or `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`.
- Keep rollback isolated to the shared migration safety net and the duplicate-preflight validation seam described in `/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/research.md`.
