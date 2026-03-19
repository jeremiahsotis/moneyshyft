# Tasks: Sender Number Architecture

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/contracts/sender-number-resolution.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/quickstart.md`

**Tests**: Included because the spec, testing notes, quickstart, and user input explicitly require verification for consistent same-thread sender reuse, inbound/outbound alignment, missing-mapping refusal, ambiguity refusal, and partial voice behavior.

**Organization**: Tasks are grouped into setup, foundational prerequisites, then one phase per user story in priority order so each story remains executable and testable as an increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new resolver surface and shared test scaffolding before blocking implementation begins.

- [X] T001 Create the centralized sender resolver scaffold with exported `resolveSenderNumber(...)` entrypoint placeholders in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- [X] T002 [P] Create aligned-provider-number fixture scaffolds and resolver call-site hooks in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared resolver contract, thread-alignment semantics, and mapping-validation seams that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Define centralized sender-resolution request, success, refusal, and routing-metadata types in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- [X] T004 [P] Normalize thread persistence helpers to treat sender-alignment values as provider numbers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- [X] T005 [P] Normalize seeded thread sender-alignment values and outbound-context labels away from synthetic `cs-number-*` tokens in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- [X] T006 [P] Extend tenant/org-unit provider-number mapping fixtures and validation assertions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`
- [X] T007 Implement mapping-backed thread-alignment loading helpers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts` using `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threads.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`
- [X] T008 [P] Add foundational regression coverage for provider-number thread alignment semantics in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`

**Checkpoint**: The resolver contract, thread-alignment semantics, and mapping-validation seams are ready for story-specific implementation.

---

## Phase 3: User Story 1 - Keep One Sender Per Thread (Priority: P1) 🎯 MVP

**Goal**: Ensure repeated outbound SMS from the same tenant-scoped thread reuses one deterministic sender number.

**Independent Test**: Send multiple outbound SMS messages from the same thread and verify the same mapped sender number and routing rationale are returned each time.

### Tests for User Story 1

- [X] T009 [P] [US1] Add outbound SMS regression coverage for repeated same-thread sender reuse in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- [X] T010 [P] [US1] Add resolver alignment coverage for provider-number thread reuse and legacy synthetic-token rejection in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Implement mapping-backed success-path `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel: 'sms' })` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- [X] T012 [US1] Replace `resolveConnectShyftSmsSender(...)` with `resolveSenderNumber(...)` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T013 [US1] Update outbound sender audit and idempotency metadata to use resolver routing metadata and aligned provider numbers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T014 [US1] Run focused US1 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`

**Checkpoint**: User Story 1 is complete when outbound SMS on an existing aligned thread always resolves the same sender number and no longer depends on the old single-active-mapping shortcut.

---

## Phase 4: User Story 2 - Keep Inbound and Outbound Aligned (Priority: P2)

**Goal**: Ensure inbound SMS on a mapped provider number aligns with the same tenant, org-unit, and thread sender context used by outbound traffic.

**Independent Test**: Send outbound SMS from a mapped thread, process an inbound reply on that sender number, and verify the ensured thread persists the same provider number for later outbound resolution without synthetic thread derivation.

### Tests for User Story 2

- [X] T015 [P] [US2] Add inbound webhook regression coverage for mapped-provider-number alignment without synthetic thread derivation in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- [X] T016 [P] [US2] Add inbound guardrail coverage for tenant-scoped mapped sender reuse and ambiguity refusal in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Remove `resolveDeterministicThreadIdForNumberMapping(...)` synthetic thread fallback from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T018 [US2] Replace `sms-inbound:${...}` and `sms-outbound:${...}` persistence with normalized mapped provider numbers in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- [X] T019 [US2] Update ensured-thread alignment writes so inbound-mapped provider numbers become the next outbound sender anchor in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- [X] T020 [US2] Run focused US2 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundSms.test.ts`

**Checkpoint**: User Story 2 is complete when inbound SMS no longer fabricates sender or thread identity from provider numbers and the ensured thread reuses the same sender number outbound.

---

## Phase 5: User Story 3 - Refuse Safely When Sender Mapping Is Missing (Priority: P3)

**Goal**: Enforce mapping existence and deterministic refusal for SMS and partial voice flows whenever sender alignment is missing, invalid, ambiguous, or cross-scoped.

**Independent Test**: Remove, deactivate, or ambiguate the mapped sender number for a thread and verify SMS and partial voice flows refuse before dispatch with deterministic refusal codes and no fallback sender assignment.

### Tests for User Story 3

- [X] T021 [P] [US3] Add missing-mapping, inactive-or-reassigned-alignment, ambiguous-mapping, and scope-mismatch refusal coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`
- [X] T022 [P] [US3] Add voice partial refusal coverage for unresolved sender alignment in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Enforce deterministic refusal for missing, inactive, reassigned, ambiguous, and cross-scoped sender mappings in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- [X] T024 [US3] Replace SMS sender fallback paths with resolver-driven refusal handling in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T025 [US3] Route partial voice outbound-line selection and bridge-session `selectedOutboundContactPointId` through `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel: 'voice' })` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- [X] T026 [US3] Run focused US3 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts`

**Checkpoint**: User Story 3 is complete when missing or invalid sender mappings refuse deterministically for SMS and partial voice flows without reintroducing synthetic sender fallback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, recheck platform constraints, and run full regression verification.

- [X] T027 [P] Update implementation verification and rollout notes in `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/05-testing.md`, `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/06-pr-template.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/quickstart.md`
- [X] T028 [P] Validate unchanged Nginx routing delegation in `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`
- [X] T029 [P] Validate ConnectShyft API localhost-only binding and canonical port assumptions in `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`
- [X] T030 [P] Validate shared Postgres connectivity and migration-ownership assumptions in `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml` and `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`
- [X] T031 [P] Validate deployment runbook reproducibility in `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [X] T032 Run final build and sender-number regression verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against all affected ConnectShyft route and module tests under `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and creates the resolver and shared fixture surfaces.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all story implementation.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and delivers the MVP centralized resolver plus outbound SMS adoption.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because inbound/outbound alignment needs the outbound sender path already running through the centralized resolver.
- **User Story 3 (Phase 5)**: Depends on User Story 1 because deterministic refusal and partial voice sender selection extend the same resolver adoption path.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after the foundational phase; this is the recommended MVP.
- **US2 (P2)**: Builds on US1’s outbound resolver path, then remains independently testable through mapped inbound reply scenarios.
- **US3 (P3)**: Builds on US1’s centralized resolver path, then remains independently testable through missing-mapping and partial voice refusal scenarios.

### Within Each User Story

- Tests should be written and fail before implementation tasks are considered complete.
- Shared resolver and alignment primitives should land before route adoption relies on them.
- Route adoption should land before focused story verification.
- Story verification should pass before moving to the next dependent phase.

## Parallel Opportunities

- **Setup**: T002 can run while T001 defines the new resolver surface because the fixture scaffolds live in different test files.
- **Foundational**: T004, T005, T006, and T008 can run in parallel because they touch separate persistence, read-model, mapping-test, and regression-test files.
- **US1**: T009 and T010 can run in parallel because they touch different route and thread test files.
- **US2**: T015 and T016 can run in parallel because they touch different inbound route test files.
- **US3**: T021 and T022 can run in parallel because they touch different SMS and voice test files.
- **Polish**: T027, T028, T029, T030, and T031 can run in parallel because documentation updates, routing validation, binding validation, database validation, and runbook validation touch separate files.

---

## Parallel Example: User Story 1

```bash
Task: "T009 Add outbound SMS regression coverage for repeated same-thread sender reuse in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
Task: "T010 Add resolver alignment coverage for provider-number thread reuse and legacy synthetic-token rejection in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "T015 Add inbound webhook regression coverage for mapped-provider-number alignment without synthetic thread derivation in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts"
Task: "T016 Add inbound guardrail coverage for tenant-scoped mapped sender reuse and ambiguity refusal in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "T021 Add missing-mapping, inactive-or-reassigned-alignment, ambiguous-mapping, and scope-mismatch refusal coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts"
Task: "T022 Add voice partial refusal coverage for unresolved sender alignment in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Confirm repeated outbound SMS sends from the same thread reuse one sender number with mapping-backed routing metadata before taking on inbound alignment or refusal hardening.

### Incremental Delivery

1. Finish Setup + Foundational to lock resolver contracts, thread-alignment semantics, and mapping-validation seams.
2. Deliver User Story 1 and validate same-thread sender determinism as the MVP.
3. Deliver User Story 2 and validate inbound/outbound alignment without synthetic thread derivation.
4. Deliver User Story 3 and validate deterministic refusal plus partial voice integration.
5. Finish with Phase 6 documentation, platform-contract validation, and full regression verification.

### Suggested MVP Scope

- **Recommended MVP**: Phase 1 + Phase 2 + Phase 3.
- **Second increment**: Phase 4 for inbound/outbound alignment.
- **Third increment**: Phase 5 for deterministic refusal and partial voice behavior.

### Notes

- Keep `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)` as the only authoritative sender-mapping validation seam.
- Do not reintroduce `sms-inbound:*`, `sms-outbound:*`, `resolveDeterministicThreadIdForNumberMapping(...)`, or single-active-mapping sender shortcuts after resolver adoption.
- Preserve unchanged Admin, MoneyShyft, and ConnectShyft routing/deployment contracts while implementing the feature.
