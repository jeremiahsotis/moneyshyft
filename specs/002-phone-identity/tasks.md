# Tasks: CS-002 Phone Identity

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/`
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/contracts/phone-domain-contract.md`, `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`
**Tests**: Required by `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/spec.md` and `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-002_Phone_Identity_Guardrailed_Spec.md`
**Organization**: Tasks are grouped by the explicit user stories in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/spec.md` so each delivery slice can be implemented and validated independently.

## Phase 1: Setup

**Purpose**: Create the shared-domain project boundary required for CS-002 implementation.

- [X] T001 Create shared-domain project metadata for `/Users/jeremiahotis/projects/connectshyft/domains/communication` in `/Users/jeremiahotis/projects/connectshyft/domains/communication/project.json`

---

## Phase 2: Foundational

**Purpose**: Remove repo-level blockers so ConnectShyft API can import and test the root shared communication domain.

**⚠️ CRITICAL**: Complete this phase before starting user story work.

- [X] T002 [P] Update Nx module-boundary constraints to allow `/Users/jeremiahotis/projects/connectshyft/domains/communication` as `scope:shared` in `/Users/jeremiahotis/projects/connectshyft/.eslintrc.cjs`
- [X] T003 [P] Extend workspace-boundary scanning and shared-project validation for `/Users/jeremiahotis/projects/connectshyft/domains/communication` in `/Users/jeremiahotis/projects/connectshyft/scripts/enforce-workspace-boundaries.js`
- [X] T004 [P] Widen ConnectShyft API compilation to include root shared-domain imports in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/tsconfig.json`
- [X] T005 [P] Widen ConnectShyft API Jest roots and shared-domain test discovery in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/jest.config.js`
- [X] T006 [P] Ensure Nx build/test inputs include `/Users/jeremiahotis/projects/connectshyft/domains/communication` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/project.json`

**Checkpoint**: The repo can compile, lint, and test ConnectShyft API code that imports the root communication domain.

---

## Phase 3: User Story 1 - Natural Input to Canonical Storage (Priority: P1) 🎯 MVP

**Goal**: ConnectShyft neighbor create/update flows accept natural phone input while persisting canonical E.164 plus derived canonical phone identity fields through the shared communication domain.

**Independent Test**: Run the shared phone-domain tests and neighbor regression tests, then create or update a neighbor with `2605551212` and `5551212` plus configured area code and confirm `connectshyft.cs_neighbor_phones` stores canonical E.164 and derived fields without requiring E.164 input.

### Tests for User Story 1

- [X] T007 [P] [US1] Write shared phone contract and example-conversion tests in `/Users/jeremiahotis/projects/connectshyft/domains/communication/phone/__tests__/index.test.ts`
- [X] T008 [P] [US1] Add ConnectShyft neighbor regression coverage for ten-digit and seven-digit natural input in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- [X] T009 [P] [US1] Add migration coverage for canonical contact-point fields on `connectshyft.cs_neighbor_phones` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneIdentityMigration.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Implement the shared phone domain contract and deterministic normalization rules in `/Users/jeremiahotis/projects/connectshyft/domains/communication/phone/index.ts`
- [X] T011 [US1] Re-export the shared phone domain public API from `/Users/jeremiahotis/projects/connectshyft/domains/communication/index.ts`
- [X] T012 [P] [US1] Add ConnectShyft `PhoneNormalizationContext` resolution for default country and area-code fallback in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/phoneIdentityContext.ts`
- [X] T013 [P] [US1] Shape `connectshyft.cs_neighbor_phones` toward canonical contact-point columns in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts`
- [X] T014 [US1] Replace ConnectShyft-local phone parsing and refusal handling with shared-domain normalization in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T015 [US1] Persist and hydrate canonical phone identity fields from `connectshyft.cs_neighbor_phones` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`

**Checkpoint**: Neighbor create/update behavior is fully functional with natural phone input and canonical persistence.

---

## Phase 4: User Story 2 - Canonical Identity Matching (Priority: P2)

**Goal**: Identity-boundary matching resolves by canonical phone identity instead of ConnectShyft-local regex normalization, using the same shared-domain contract and canonical lookup path introduced in US1.

**Independent Test**: Evaluate identity matching with differently formatted equivalents of the same number and confirm exact-match, no-match, ambiguous, and shared-phone decisions are computed from canonical identity data and canonical lookup columns.

### Tests for User Story 2

- [X] T016 [P] [US2] Add canonical identity-match coverage for exact, no-match, ambiguous, and shared-phone cases in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
- [X] T017 [P] [US2] Add migration coverage for canonical phone lookup indexing in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts`

### Implementation for User Story 2

- [X] T018 [US2] Replace ConnectShyft-local phone normalization and comparison logic with shared-domain helpers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- [X] T019 [US2] Update canonical phone lookup queries and identity-boundary adapter rows to use `normalized_e164`-equivalent persistence fields in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- [X] T020 [P] [US2] Add the canonical phone lookup index migration for ConnectShyft neighbor phones in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.ts`

**Checkpoint**: Identity-boundary matching is fully functional on canonical phone identity and no longer relies on duplicated ConnectShyft-local normalization.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Finalize reusable documentation plus constitution-required no-regression and validation guidance across the shared domain and the feature docs.

- [X] T021 [P] Update shared communication-domain usage guidance and import rules in `/Users/jeremiahotis/projects/connectshyft/domains/communication/README.md`
- [X] T022 [P] Refresh the canonical public API examples and error-code table in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/contracts/phone-domain-contract.md`
- [X] T023 [P] Record final validation commands, example conversions, and ADR/data-model compliance notes for feature documentation in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`
- [X] T024 [P] Validate that CS-002 does not change ConnectShyft versus admin route ownership and record the result in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`
- [X] T025 [P] Verify ConnectShyft API binding and port expectations remain unchanged for CS-002 in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`
- [X] T026 [P] Validate shared PostgreSQL connectivity and unchanged production migration ownership assumptions for CS-002 in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`
- [X] T027 [P] Record reproducible runbook-style validation steps for CS-002 no-regression checks in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Phase 1 and blocks all user story work.
- User Story 1 (Phase 3) depends on Phase 2.
- User Story 2 (Phase 4) depends on Phase 2 and User Story 1 because it consumes the shared phone contract and canonical persistence fields introduced there.
- Polish (Phase 5) depends on the user stories you intend to ship.

### User Story Dependency Graph

- `Phase 1 -> Phase 2 -> US1 -> US2 -> Phase 5`

### Within Each User Story

- Test tasks must exist and fail before implementation tasks begin.
- Shared-domain contract changes precede consumer adoption.
- Migration changes precede persistence/query updates that depend on new columns or indexes.
- Each user story must pass its independent test before moving to the next story.

### Parallel Opportunities

- Phase 2 tasks `T002` through `T006` touch different files and can run in parallel.
- US1 test tasks `T007` through `T009` can run in parallel.
- After US1 tests are in place, `T012` and `T013` can run in parallel while `T010` is implemented.
- US2 test tasks `T016` and `T017` can run in parallel.
- After US2 tests are in place, `T018` and `T020` can run in parallel before `T019`.
- Polish tasks `T021` through `T027` can run in parallel after implementation stabilizes.

---

## Parallel Example: User Story 1

```bash
# Launch the US1 test tasks together
T007 /Users/jeremiahotis/projects/connectshyft/domains/communication/phone/__tests__/index.test.ts
T008 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts
T009 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneIdentityMigration.test.ts

# Then implement the independent setup work in parallel
T012 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/phoneIdentityContext.ts
T013 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.ts
```

---

## Parallel Example: User Story 2

```bash
# Launch the US2 tests together
T016 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts
T017 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts

# Then implement the independent identity-match and index work in parallel
T018 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts
T020 /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3.
4. Validate the US1 independent test before expanding scope.

### Incremental Delivery

1. Establish the shared-domain boundary and toolchain support in Phases 1 and 2.
2. Deliver canonical natural-input storage for neighbors in US1.
3. Deliver canonical identity matching in US2.
4. Finish documentation and validation evidence in Phase 5.

### Parallel Team Strategy

1. One engineer handles repo boundary and tooling tasks in Phase 2 while another prepares US1 tests.
2. Once Phase 2 is complete, domain implementation, phone-context configuration, and migration work for US1 can be split across engineers.
3. After US1 passes, identity-boundary logic and lookup-index work for US2 can be split across engineers.

---

## Notes

- User story phases map directly to the explicit `US1` and `US2` definitions in `/Users/jeremiahotis/projects/connectshyft/specs/002-phone-identity/spec.md`.
- All task paths are absolute so the task list is executable without additional path resolution.
- Every task line follows the required checklist format: checkbox, task ID, optional `[P]`, required story label for story phases, and an exact file path.
