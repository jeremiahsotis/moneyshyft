# Codex Implementation Brief: Slice 8

## Title
ConnectShyft Slice 8: outbound actions thin-router extraction

## Objective
Extract the outbound route family from `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` into thin-router handlers and one shared outbound helper boundary, while preserving exact current response shapes and exact current reopen behavior.

## Locked rules
1. Preserve exact current outbound response shapes for both routes.
2. Preserve current reopen behavior exactly.
3. Extract only the route family and helper boundary.
4. Leave provider, bridge, idempotency, audit, SMS override, sender resolution, and webhook internals where they are.
5. Do not redesign payloads.
6. Do not rewrite provider/bridge architecture.
7. Do not pull inbound/webhook logic into this slice.

## In scope
- `POST /api/v1/connectshyft/threads/:threadId/call`
- `POST /api/v1/connectshyft/threads/:threadId/messages`
- characterization coverage for current outbound route behavior
- handler extraction
- shared outbound helper boundary
- router delegation
- helper-boundary tests
- docs updates

## Out of scope
- webhook or inbound extraction
- provider architecture rewrite
- bridge session redesign
- sender-number redesign
- payload cleanup
- reopen/lifecycle behavior changes
- PeopleCore convergence beyond light seam prep already implied by cleaner route boundaries

## Target files
### New tests
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.threadOutboundContext.test.ts`

### New helper boundary
- `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`

### New handlers
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadCall.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectThreadMessage.ts`

### Updated exports
- `apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts`

### Router update
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

### Docs
- `docs/architecture/connectshyft-router-refactor-plan.md`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/THREAD_OUTBOUND_NOTES.md`

## Design intent
The slice should do for outbound what Slices 4 through 7 did for the other route families:
- characterize current behavior first
- extract helper boundary second
- switch router to handlers third
- add focused helper tests fourth
- document guardrails fifth

The extracted helper boundary should centralize only route-family concerns such as:
- capability and orgUnit context enforcement
- thread id parsing
- loading lifecycle context or thread detail prerequisites needed by outbound routes
- preserving current refusal shaping inputs
- shared execution wrapper for call/message route handlers if that reduces duplication without moving domain logic out of existing modules

The helper boundary must **not** absorb provider, bridge, idempotency, audit, or SMS override business logic.

## Checkpoint plan

---

## Checkpoint 1: characterize current outbound route behavior

### Goal
Pin current route behavior for call and message dispatch before any production refactor.

### Tasks
1. Add `connectshyft.thread-call.characterization.test.ts`.
2. Add `connectshyft.thread-message.characterization.test.ts`.
3. Characterize current success and refusal envelopes for both routes.
4. Capture current reopen behavior exactly for closed-thread outbound flows.
5. Capture representative refusal surfaces without broadening coverage into inbound/webhooks.

### Minimum coverage expectations
#### Call route characterization
- successful outbound call response shape
- closed-thread outbound call preserves current reopen behavior and response shape
- operator callback required refusal shape
- neighbor phone required refusal shape
- sender resolution refusal shape
- thread id required refusal shape
- thread not found / context refusal behavior as currently implemented

#### Message route characterization
- successful outbound message response shape
- closed-thread outbound message preserves current reopen behavior and response shape
- SMS target resolution refusal shape
- SMS sender resolution refusal shape
- texting-preference override refusal path shape
- idempotency conflict or in-progress refusal shape if currently reachable in route tests
- thread id required refusal shape

### Validation commands
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts
```

### Stop rule
Stop after Checkpoint 1. Report what changed, validation results, blockers, and wait.

---

## Checkpoint 2: add outbound helper boundary and handler scaffolding

### Goal
Create the new thin-router target handlers and a shared outbound helper boundary, without switching the router yet.

### Tasks
1. Add `threadOutboundContext.ts`.
2. Add `postConnectThreadCall.ts`.
3. Add `postConnectThreadMessage.ts`.
4. Export the new handlers from `handlers/index.ts`.
5. Move only route-family orchestration into the helper boundary.

### Helper boundary responsibilities
Acceptable contents for `threadOutboundContext.ts`:
- capability gating wrappers used by both outbound routes
- orgUnit context enforcement for outbound route family
- thread id parsing
- shared outbound prerequisite loading
- shared wrapper that calls the existing outbound orchestration with `call` or `message`
- helper methods that preserve exact response/refusal shaping for the route family

Not acceptable in `threadOutboundContext.ts`:
- provider adapter rewrites
- bridge internals rewrites
- sender-number algorithm rewrites
- SMS override model rewrites
- communication reliability redesign
- webhook handling code

### Validation commands
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts

pnpm nx run connectshyft-api:test
```

### Stop rule
Stop after Checkpoint 2. Report what changed, validation results, blockers, and wait.

---

## Checkpoint 3: convert outbound routes to thin router

### Goal
Switch the two outbound routes to the new handlers while preserving route order and behavior.

### Tasks
1. Update `connectshyft.ts` so:
   - `POST /threads/:threadId/call` delegates to `postConnectThreadCall`
   - `POST /threads/:threadId/messages` delegates to `postConnectThreadMessage`
2. Remove only the now-unused outbound route-local wrapper logic from the router.
3. Keep all unrelated inline router families untouched.
4. Preserve exact current response shapes.
5. Preserve exact current reopen behavior.

### Validation commands
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts

pnpm nx run connectshyft-api:test
```

### Stop rule
Stop after Checkpoint 3. Report what changed, validation results, blockers, and wait.

---

## Checkpoint 4: add focused helper-boundary tests and update architecture doc

### Goal
Add direct tests for the outbound helper boundary and update the canonical router plan.

### Tasks
1. Add `handlers.threadOutboundContext.test.ts`.
2. Cover helper-boundary behavior only.
3. Update `docs/architecture/connectshyft-router-refactor-plan.md` to mark Slice 8 complete and set inbound/webhooks/telephony as next.

### Minimum helper test coverage
- valid outbound prerequisite resolution
- missing thread id refusal mapping
- thread/context prerequisite refusal mapping
- guardrail that helper remains prerequisite/orchestration only and does not absorb provider/bridge internals

### Validation commands
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts \
  src/modules/connectshyft/__tests__/handlers.threadOutboundContext.test.ts

pnpm nx run connectshyft-api:test
```

### Stop rule
Stop after Checkpoint 4. Report what changed, validation results, blockers, and wait.

---

## Checkpoint 5: add outbound handler guardrail notes

### Goal
Document the outbound ownership boundary so later slices do not blur it.

### Tasks
1. Add `THREAD_OUTBOUND_NOTES.md` under `apps/connectshyft-api/src/modules/connectshyft/handlers/`.
2. Document:
   - what the outbound handlers own
   - what `threadOutboundContext.ts` owns
   - what remains in provider/bridge/reliability/audit modules
   - exact response-shape preservation rule
   - exact reopen-behavior preservation rule
   - explicit deferral of inbound/webhooks/telephony extraction

### Validation commands
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.thread-call.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.thread-message.characterization.test.ts \
  src/modules/connectshyft/__tests__/handlers.threadOutboundContext.test.ts

pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Stop rule
Stop after Checkpoint 5. Report what changed, validation results, blockers, and wait.

---

## Implementation constraints for Codex
- Do not change current route paths.
- Do not change current response field names.
- Do not normalize or clean up payload shapes in this slice.
- Do not alter provider selection logic.
- Do not alter bridge session start behavior.
- Do not alter idempotency semantics.
- Do not alter texting-preference override semantics.
- Do not alter reopen semantics.
- Do not fold inbound/webhook logic into the outbound helper boundary.
- Keep route order stable in `connectshyft.ts`.

## Commit guidance
Use one commit per checkpoint.
If the worktree already contains unrelated user changes, commit all uncommitted items exactly as instructed by the user, but do not expand implementation scope.

Suggested commit messages:
- `test(slice-8): add connectshyft outbound characterization tests`
- `refactor(slice-8): add connectshyft outbound handlers and context scaffolding`
- `refactor(slice-8): convert connectshyft outbound routes to thin router`
- `docs(slice-8): update router plan and outbound helper coverage`
- `chore(slice-8): add connectshyft outbound handler guardrails`

## Definition of done
Slice 8 is done when:
- outbound call and message routes are delegated through thin-router handlers
- exact current response shapes still pass characterization coverage
- exact current reopen behavior still passes characterization coverage
- helper-boundary tests exist
- router plan is updated
- outbound guardrail notes exist
- CI remains green
