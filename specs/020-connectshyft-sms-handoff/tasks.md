# Tasks: ConnectShyft SMS Dispatch Handoff

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/`
**Prerequisites**: `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/plan.md`, `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/spec.md`, `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/research.md`, `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/data-model.md`, `/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/contracts/outbound-sms-dispatch-boundary.md`

**Tests**: Included because the user explicitly required focused verification stop points plus regression coverage for success, invariant refusal, provider failure separation, wrapper pass-through, and the Telnyx defensive missing-target guard.

**Organization**: Tasks are grouped into exactly three implementation slices. Slice 1 and Slice 2 are cross-story prerequisites; Slice 3 maps the permanent regression coverage back to the spec user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same slice
- **[Story]**: Maps to the feature spec user stories where applicable
- **All task descriptions include exact file paths**

## Slice 1: Route Invariant Hardening

**Goal**: Harden the outbound SMS route so provider dispatch is impossible unless `performOutboundAction` holds a dispatch-ready `targetPhone`.

**Independent Test**: The route returns a business refusal from the SMS target family when the pre-dispatch invariant fails, and `adapter.sendSms()` is never called after that refusal path.

- [X] T001 Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts to add a route-local helper that normalizes and validates the resolved outbound SMS `targetPhone`, reuses `buildConnectShyftSmsTargetRefusal`, and exports the helper with a `ForTests` alias
- [X] T002 Update `performOutboundAction` in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts to call the new helper after `resolveConnectShyftSmsTarget`, return a business refusal in the existing SMS target family on invariant breach, and short-circuit `providerSelection.adapter.sendSms(...)` when the route does not hold a dispatch-ready `targetPhone`
- [X] T003 Run focused verification for /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts using /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts, then stop here for commit + focused verification

**Stop here**: Do not start Slice 2 until T003 is complete and the route-only hardening changes in `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` have been committed.

---

## Slice 2: Temporary Instrumentation

**Goal**: Add short-lived handoff logs only at the approved route/wrapper/adapter boundaries so one composer-origin SMS send can prove where `targetPhone` stays intact or first diverges.

**Independent Test**: One reproduced composer-origin SMS send yields exactly the approved handoff log chain from the route, wrapper, and Telnyx adapter without introducing permanent observability infrastructure.

- [X] T004 Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts to add temporary logs only at the approved route handoff points: immediately after SMS target resolution and immediately before `providerSelection.adapter.sendSms(...)`
- [X] T005 [P] Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts to add a temporary entry log only at `providerRegistry.sendSms(command)` while keeping `sendSms` a transparent pass-through
- [X] T006 [P] Update /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts to add temporary logs only at Telnyx `sendSms(command)` entry, immediately before Telnyx payload dispatch, and in the Telnyx adapter `catch` path while keeping the adapter defensive and avoiding permanent observability scaffolding
- [X] T007 Rebuild and reproduce one composer-origin SMS send using /Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/03-speckit-handoff-context.md and /Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/quickstart.md, then capture the approved handoff logs from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts, and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts to identify the first divergent boundary
- [X] T008 Stop here after T007, commit the temporary instrumentation state in /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts, and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts, and do not add logs anywhere else

**Stop here**: Do not start Slice 3 until T008 is complete and the reproduction/log-capture commit exists for the approved instrumentation-only boundaries.

---

## Slice 3: Regression Coverage + Cleanup

**Goal**: Lock the permanent behavior with route/provider/adapter regressions, apply the smallest proven handoff correction if Slice 2 identified one outside the route, and remove all temporary instrumentation before the final commit and PR.

**Independent Test**:
- **US1**: A composer-origin SMS send without request `targetPhone` succeeds with a server-resolved target.
- **US2**: A pre-dispatch invariant breach returns a business refusal from the SMS target family and never calls `adapter.sendSms()`.
- **US3**: A valid `targetPhone` handoff preserves provider failure separation, the provider wrapper preserves `targetPhone`, and the Telnyx adapter still rejects missing `targetPhone` as a last-resort guard.

- [X] T009 [US1] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts to cover composer success when the request body omits `targetPhone` and the route resolves the SMS target server-side
- [X] T010 [US2] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts to cover invariant refusal before provider dispatch by exercising the `ForTests` helper exported from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts and asserting `sendSmsMock` is not called after refusal
- [X] T011 [US3] Tighten /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts so provider failure separation is verified only when a valid `targetPhone` reaches `adapter.sendSms(...)`
- [X] T012 [P] [US3] Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts to assert `providerRegistry.sendSms(command)` preserves `targetPhone` unchanged across the wrapper boundary
- [X] T013 [P] [US3] Extend or preserve /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts so the Telnyx adapter still throws the defensive missing-target assertion as a last-resort guard after any send-path changes
- [X] T014 Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts or /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts only if T007 proved the first `targetPhone` divergence occurs there; otherwise leave those files functionally unchanged apart from removing temporary instrumentation
- [X] T015 Remove all temporary instrumentation from /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts, and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts after T009-T014 are verified
- [X] T016 Run final verification for /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts, and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts using /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/package.json, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts, and /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts, then stop here for final commit + PR

**Stop here**: Do not close the feature until T016 passes and all temporary instrumentation has been removed from the three instrumented source files unless a short-lived retention exception was explicitly approved.

---

## Dependencies & Execution Order

### Slice Dependencies

- **Slice 1**: Starts immediately and blocks all later work
- **Slice 2**: Depends on T003
- **Slice 3**: Depends on T008

### User Story Coverage

- **US1**: Delivered by T009 and validated in T016 after the Slice 1 and Slice 2 boundary work is complete
- **US2**: Enabled by T001-T002 and locked by T010 plus T016
- **US3**: Locked by T011-T014 plus T016 once the route invariant and handoff proof are complete

### Execution Markers

- **Slice 1 stop marker**: T003
- **Slice 2 start marker**: T004 depends on T003
- **Slice 2 stop marker**: T008
- **Slice 3 start marker**: T009 depends on T008
- **Final completion marker**: T016

### Parallel Opportunities

- T005 and T006 can run in parallel after T004 defines the approved temporary log contract
- T012 and T013 can run in parallel after T009-T011 establish the route-level regression baseline

---

## Parallel Example: Slice 2

```bash
Task: "Update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts to add the temporary wrapper entry log"
Task: "Update /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts to add the temporary Telnyx entry/pre-dispatch/catch logs"
```

---

## Parallel Example: Slice 3

```bash
Task: "Extend /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts for wrapper pass-through coverage"
Task: "Extend /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/__tests__/index.test.ts for the Telnyx defensive missing-target guard"
```

---

## Implementation Strategy

### MVP First

1. Complete Slice 1 through T003
2. Stop and validate the route-level invariant hardening
3. Commit before any instrumentation is introduced

### Incremental Delivery

1. Complete Slice 1 and stop at T003
2. Complete Slice 2 and stop at T008
3. Complete Slice 3 and stop at T016

### Notes

- No task introduces provider abstraction redesign
- No task introduces frontend rewrite
- No task introduces unrelated communication cleanup
- No task introduces lane-convergence or migration-runner work
- Any non-route permanent fix outside Slice 1 must be limited to the first divergent handoff boundary proven by T007
