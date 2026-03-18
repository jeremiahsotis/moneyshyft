# Tasks: ConnectShyft SMS Sender Architecture

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/`  
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/contracts/outbound-sms-sender-dispatch.md`, `/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/quickstart.md`

**Tests**: Regression test additions are required in Slice 3. Slice 3 also carries the constitution-required platform-contract validation tasks without introducing a fourth phase.

**Organization**: Tasks are grouped into exactly three execution slices with hard stop points for commit and focused verification.

## Phase 1: Slice 1 - Sender-Number Domain Resolution (Priority: P1)

**Goal**: Make the ConnectShyft route own canonical outbound SMS sender resolution from thread, orgUnit, and number-mapping state while leaving target resolution behavior intact.

**Independent Test**: An outbound SMS request in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` resolves a deterministic sender before provider dispatch, refuses when sender ownership is missing or ambiguous, and does not change existing target-phone resolution behavior.

- [X] T001 [US1] Implement the route-local outbound sender resolution helper and sender-specific refusal builders in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` using context from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/threads.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`.
- [X] T002 [US1] Wire `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` to resolve sender ownership before replay-key construction, idempotency summaries, and provider dispatch, fail closed on zero or multiple active orgUnit mappings, and preserve the existing target-resolution path in the same file.
- [X] T003 [US1] Expose the sender-resolution helper through the test surface in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` so later regressions can prove route-owned sender selection without introducing new shared abstractions.
- [X] T004 [US1] Run the Slice 1 focused verification for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` against `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts` and stop only when sender resolution is pre-dispatch and target resolution still passes unchanged.
- [ ] T005 [US1] Create the Slice 1 commit for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` after the focused verification in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts` is clean.

**Checkpoint**: Slice 1 ends with route-owned sender resolution in place, unchanged target resolution behavior, and a focused verification/commit stop before any adapter contract work.

---

## Phase 2: Slice 2 - Adapter Contract + Telnyx Payload (Priority: P2)

**Goal**: Carry the explicit sender number through the SMS provider command and make Telnyx prefer that sender over `TELNYX_FROM_NUMBER`, while leaving the env number as fallback-only behavior.

**Independent Test**: The outbound SMS command reaches provider dispatch with `senderPhone` explicitly present, `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` prefers that sender over `TELNYX_FROM_NUMBER`, and the fallback env sender is only used when the explicit sender is absent.

- [ ] T006 [US2] Extend the SMS command and replay-key input in `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts` so outbound dispatch can carry `senderPhone` explicitly and idempotency reflects the sender as part of the dispatch-ready command.
- [ ] T007 [US2] Update `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts` so the resolved sender is included in replay-key and request-summary inputs and passed unchanged into adapter dispatch.
- [ ] T008 [US2] Change `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` so the SMS payload builder uses `command.senderPhone` first, `TELNYX_FROM_NUMBER` second, and the existing messaging-profile fallback only after both are absent.
- [ ] T009 [US2] Run the Slice 2 focused verification for `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` against `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`.
- [ ] T010 [US2] Create the Slice 2 commit for `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` after the explicit-sender provider-handoff verification passes.

**Checkpoint**: Slice 2 ends with explicit sender ownership at provider dispatch, Telnyx precedence fixed, fallback constrained to compatibility mode, and a commit stop before regression expansion.

---

## Phase 3: Slice 3 - Regression Coverage (Priority: P3)

**Goal**: Lock orgUnit-specific sender selection, explicit sender handoff, fallback-only behavior, and no regression to target resolution with focused backend tests.

**Independent Test**: The backend regression suites prove sender resolution differs correctly across orgUnits, the explicit sender reaches provider payloads, fallback-only behavior works only when sender resolution is absent, and target resolution still behaves as before.

- [ ] T011 [P] [US3] Add route regression coverage for orgUnit-specific sender selection, sender-required refusal, sender-ambiguous refusal, and no regression to target resolution in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`.
- [ ] T012 [P] [US3] Add replay-key regression coverage for `senderPhone` in `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts`.
- [ ] T013 [P] [US3] Add explicit sender pass-through regression coverage in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`.
- [ ] T014 [P] [US3] Add Telnyx regression coverage for explicit sender precedence, fallback-only behavior when the explicit sender is unavailable, and unchanged provider failure handling in `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`.
- [ ] T015 [P] [US3] Validate unchanged ConnectShyft route delegation in `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf` against the sender-resolution changes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- [ ] T016 [P] [US3] Validate localhost-only API binding and ConnectShyft port assumptions in `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production` remain unchanged by the sender-number slice.
- [ ] T017 [P] [US3] Validate shared Postgres connectivity and migration-ownership assumptions in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example` remain unchanged by the sender-number slice.
- [ ] T018 [P] [US3] Validate reproducible deployment guidance remains accurate in `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` for the unchanged ConnectShyft runtime path.
- [ ] T019 [US3] Run final backend and platform-contract verification for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`.
- [ ] T020 [US3] Create the final Slice 3 commit and PR-ready diff for `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf`, `/Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example`, and `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`.

**Checkpoint**: Slice 3 ends with all required regression coverage in place, final verification passing, and the branch ready for the final commit and PR.

---

## Dependencies & Execution Order

- Slice 1 must complete first because `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` has to own sender resolution before any provider contract change can be validated meaningfully.
- Slice 2 depends on Slice 1 because `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts` need the route-owned sender path to supply the explicit sender.
- Slice 3 depends on Slices 1 and 2 because the regression suites in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`, `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts` must validate the completed behavior.
- Commit after T005, commit after T010, and final commit after T020 are mandatory stop points for the three approved slices.

## Parallel Opportunities

- T011 through T018 can run in parallel after Slices 1 and 2 because they touch different test, config, and deployment-contract files.
- No other tasks are marked parallel because Slice 1 and Slice 2 each contain sequencing-sensitive work in shared route and provider handoff files.

## Parallel Example: Slice 3

```bash
Task: "T011 Add route regression coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts"
Task: "T012 Add replay-key regression coverage in /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/__tests__/index.test.ts"
Task: "T013 Add provider pass-through regression coverage in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts"
Task: "T014 Add Telnyx regression coverage in /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts"
Task: "T015 Validate route delegation in /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf"
Task: "T016 Validate API binding and port assumptions in /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production"
Task: "T017 Validate shared Postgres assumptions in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example"
Task: "T018 Validate deployment guidance in /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md"
```

## Implementation Strategy

### Exact Slice Order

1. Complete Slice 1 in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and stop for focused verification plus a dedicated commit.
2. Complete Slice 2 across `/Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`, and `/Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`, then stop for focused verification plus a dedicated commit.
3. Complete Slice 3 in the four backend regression files, run final backend verification, and create the final commit/PR-ready diff.

### MVP Scope

1. Slice 1 is the MVP because it establishes the non-negotiable route-owned sender-resolution boundary while keeping target resolution intact.
2. Slice 2 makes that sender explicit at provider dispatch and constrains the fallback behavior.
3. Slice 3 hardens the behavior with regressions and final verification.
