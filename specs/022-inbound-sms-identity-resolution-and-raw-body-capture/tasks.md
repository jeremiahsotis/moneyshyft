# Tasks: ConnectShyft Inbound SMS Identity Resolution and Raw Body Capture

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/contracts/inbound-sms-identity-resolution.md`, `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/quickstart.md`

**Tests**: Included because the spec and user input explicitly require rawBody presence, metadata resolution, thread correlation, phone match, soft-delete, cross-tenant isolation, canonical metadata handling, and `prefers_texting` regression coverage.

**Organization**: Tasks are grouped into Setup, Foundational prerequisites, the raw-body safety slice identified as the smallest safe first commit in the implementation plan, then the remaining user stories and platform-contract verification. This intentionally sequences User Story 3 ahead of User Stories 1 and 2 so parser hardening lands before identity-resolution behavior changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the missing shared source and test surfaces needed by later phases.

- [X] T001 Create the inbound subject resolver source and unit-test scaffolds at `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites that must exist before any slice can be completed safely.

**Critical**: No user story work should be considered done until this phase is complete.

- [X] T002 [P] Extend `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/types/express.d.ts` so `Express.Request` carries `rawBody?: Buffer` for the inbound webhook path used by `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [X] T003 Audit deleted-neighbor lifecycle support in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts` to determine whether a shared migration is required for deterministic soft-delete filtering
- [X] T004 [P] Prepare reusable inbound webhook fixture helpers and request-shape assertions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts` for canonical `neighborId`, thread, cross-tenant phone, deleted-neighbor, metadata-alias, and rawBody scenarios

**Checkpoint**: Foundation ready; slice implementation can proceed.

---

## Phase 3: User Story 3 - Validate Webhook Authenticity Against the Exact Request (Safe-First Slice)

**Goal**: Preserve the exact inbound JSON request body so webhook signatures are validated against the real request content before any side effect occurs.

**Independent Test**: Submit signed inbound webhook requests that use untouched and tampered JSON bodies; confirm only requests whose exact raw body verifies are accepted and all other requests are rejected before processing.

### Tests for User Story 3

- [X] T005 [P] [US3] Add rawBody presence and provider-signature input coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- [X] T006 [P] [US3] Add exact-request signature verification regressions for valid and tampered inbound webhooks in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts` and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`

### Implementation for User Story 3

- [X] T007 [US3] Replace plain `express.json()` with a rawBody-capturing parser in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts`
- [X] T008 [US3] Update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to use the typed `req.rawBody` contract from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/types/express.d.ts` and to exercise the same parser behavior in route integration tests
- [X] T009 [US3] Run focused US3 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`

**Checkpoint**: User Story 3 should now validate webhook signatures against the exact request body in both runtime and route integration tests before identity-resolution changes land.

---

## Phase 4: User Story 1 - Resolve Existing Neighbor Deterministically (Priority: P1) MVP

**Goal**: Make inbound SMS attach to the correct existing active neighbor through canonical explicit metadata, thread correlation, or a single phone match, while refusing ambiguity and rejecting alias-based metadata shortcuts.

**Independent Test**: Process inbound SMS fixtures that separately exercise canonical explicit metadata, thread correlation, single phone match, cross-tenant-only phone matches, metadata aliases, and multiple phone matches; confirm canonical metadata, thread, and single-match flows resolve to the expected active neighbor, cross-tenant-only matches continue to later permitted steps, alias keys are ignored, and multiple phone matches refuse without creating a neighbor.

### Tests for User Story 1

- [X] T010 [P] [US1] Add normalized E.164 resolver unit coverage for single-match, no-match, multiple-match, and cross-tenant-only phone inputs in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- [X] T011 [P] [US1] Add inbound webhook success regressions for canonical `neighborId` metadata and thread-correlation neighbor resolution in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- [X] T012 [P] [US1] Add inbound webhook guardrail coverage for metadata alias rejection and multiple phone matches in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implement `resolveSubjectByContactPoint({ tenantId, orgUnitId, contactPoint })` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` using `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/phoneIdentityContext.ts` to return `single_match`, `no_match`, or `multiple_matches` for active neighbors in the current tenant only
- [X] T014 [US1] Update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to normalize the inbound sender phone, extract only canonical `neighborId` metadata, preserve the metadata -> thread -> phone order, and call `resolveSubjectByContactPoint(...)` only after thread correlation
- [X] T015 [US1] Update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to route `single_match` into the existing inbound thread ensure flow, stop lower-priority fallbacks once any active reusable neighbor is found, and return `IDENTITY_MATCH_AMBIGUOUS` with no neighbor creation on `multiple_matches`
- [X] T016 [US1] Run focused US1 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`

**Checkpoint**: User Story 1 should now resolve existing neighbors deterministically, ignore alias metadata keys, and refuse ambiguous phone matches without creating new records.

---

## Phase 5: User Story 2 - Create a Safe Minimal Neighbor When Needed (Priority: P2)

**Goal**: Create a minimal active neighbor when no active match exists or only deleted neighbors match, and update texting preference only when the current value is `UNKNOWN`.

**Independent Test**: Process inbound SMS fixtures with no match, deleted-only matches, explicit metadata pointing to a deleted neighbor, and each `prefersTexting` state; confirm new-neighbor creation occurs only when allowed, deleted neighbors are never reused, `UNKNOWN` becomes `YES`, and existing `YES` or `NO` values remain unchanged.

### Tests for User Story 2

- [X] T017 [P] [US2] Add inbound neighbor creation and texting-preference unit coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` for primary active valid phone selection, `prefersTexting: 'UNKNOWN'`, `UNKNOWN -> YES`, and `YES/NO` preservation
- [X] T018 [P] [US2] Add inbound webhook regressions for phone no-match neighbor creation, explicit-metadata-to-deleted-neighbor fallback, deleted-neighbor replacement, and `prefers_texting` behavior in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- [X] T019 [P] [US2] Add route coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` to preserve explicit-reference deleted-neighbor filtering and ambiguity semantics after lifecycle-state support is surfaced

### Implementation for User Story 2

- [X] T020 [US2] Implement `createNeighborFromInbound(...)` and `applyInboundSmsTextingPreference(...)` in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- [X] T021 [US2] If T003 confirms lifecycle state is missing, create `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts` and update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`; otherwise update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` so explicit and phone-based resolution exclude soft-deleted neighbors without schema changes
- [X] T022 [US2] Update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to replace the current inbound `no_match` unresolved branch with `createNeighborFromInbound(...)`, keep the sender phone primary + active on newly created neighbors, handle explicit-deleted-neighbor fallback to later permitted steps, and run the guarded `UNKNOWN -> YES` promotion after final neighbor resolution
- [X] T023 [US2] Run focused US2 verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Checkpoint**: User Story 2 should now create safe minimal neighbors on allowed no-match paths, exclude deleted neighbors from reuse, and preserve explicit texting preferences.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and platform-contract checks that span multiple stories.

- [ ] T024 [P] Verify ConnectShyft route ownership and Nginx delegation remain unchanged using `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- [ ] T025 Verify ConnectShyft API binding and container port contracts remain unchanged using `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts`
- [ ] T026 Verify shared Postgres connectivity contracts remain unchanged using `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [ ] T027 Verify `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, and `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml` remain sufficient to deploy this feature without manual routing or database adjustments
- [ ] T028 Run final build and full regression verification from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all later phases.
- **User Story 3 (Phase 3)**: Depends on Phase 2 and should complete before any identity-resolution route changes land.
- **User Story 1 (Phase 4)**: Depends on Phase 2 and on the raw-body runtime contract introduced in Phase 3.
- **User Story 2 (Phase 5)**: Depends on Phase 4 and on the lifecycle-state audit in T003; T021 runs only if T003 shows schema changes are required.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US3**: Safe-first prerequisite for parser authenticity; complete before modifying ordered identity-resolution behavior.
- **US1 (P1)**: Depends on the raw-body safety slice being in place, then stands alone as the first product-behavior increment.
- **US2 (P2)**: Reuses the ordered resolver insertion from US1 and the lifecycle-state audit from Phase 2.

### Within Each User Story

- Tests must be written and fail before implementation tasks in the same story are considered complete.
- Runtime parser hardening precedes route-level identity changes.
- Resolver and service implementations precede route wiring.
- Route wiring precedes focused story verification.
- Focused story verification precedes the final cross-story verification in Phase 6.

## Parallel Opportunities

- **Foundational**: T002 and T004 can run in parallel because they touch `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/types/express.d.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts` independently.
- **US3**: T005 and T006 can run in parallel because they touch different test surfaces.
- **US1**: T010, T011, and T012 can run in parallel because they touch different test files.
- **US2**: T017, T018, and T019 can run in parallel because they touch different test files.
- **Polish**: T024 can run in parallel with T025 through T027 because route-ownership verification is independent of binding, Postgres, and runbook checks.

---

## Parallel Example: User Story 3

```bash
Task: "T005 Add rawBody signature-input coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts"
Task: "T006 Add exact-request signature regressions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
```

---

## Parallel Example: User Story 1

```bash
Task: "T010 Add normalized E.164 and cross-tenant resolver coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts"
Task: "T011 Add canonical-neighborId and thread-correlation webhook regressions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts"
Task: "T012 Add metadata-alias and multiple-match webhook guardrails in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "T017 Add inbound neighbor creation and texting-preference unit coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts"
Task: "T018 Add no-match and explicit-deleted-neighbor webhook regressions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts"
Task: "T019 Add deleted-neighbor filtering coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts"
```

---

## Implementation Strategy

### Smallest Safe First Commit

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational prerequisites.
3. Complete Phase 3: User Story 3 raw-body capture and signature-hardening.
4. Stop and validate the US3 independent test before any identity-resolution behavior changes.

### MVP After Safety Slice

1. Complete Phase 4: User Story 1.
2. Stop and validate the US1 independent test before expanding to no-match creation and deleted-neighbor handling.

### Incremental Delivery

1. Deliver US3 first to harden webhook authenticity against exact raw request bytes.
2. Deliver US1 to close the existing-neighbor resolution gap for canonical metadata, thread, and single phone matches.
3. Deliver US2 to replace the remaining no-match failure path with safe new-neighbor creation and guarded texting-preference updates.
4. Finish with Phase 6 full verification and platform-contract review.

### Suggested MVP Scope

- **Recommended first commit**: Phase 1 + Phase 2 + Phase 3 (raw-body safety slice).
- **Recommended product MVP**: Phase 4 (User Story 1) on top of the safety slice.
- **Recommended second increment**: Phase 5 (User Story 2) because it removes the remaining production gap for unknown or deleted senders.

### Notes

- Keep tests failing first before implementation in each story phase.
- Do not add route-level DB logic to `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Keep rollback isolated to the parser hook, resolver insertion, and no-match-create branch replacement described in `/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/research.md`.
