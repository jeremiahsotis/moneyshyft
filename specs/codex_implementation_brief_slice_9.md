# Codex Implementation Brief — Slice 9: ConnectShyft inbound webhooks and telephony route-family extraction

## Slice goal

Extract the ConnectShyft inbound webhook route family into thin handlers plus one helper boundary, while preserving exact current inbound/webhook response shapes and preserving current inbound auto-claim, voicemail, and transcription behavior exactly.

This is a route extraction slice only.

Do not redesign provider routing.
Do not redesign bridge progression.
Do not redesign provider correlation mapping.
Do not redesign canonical event persistence.
Do not redesign voicemail transcription behavior.
Do not redesign inbound identity resolution behavior.

## Locked constraints

- Preserve exact current response shapes for:
  - `POST /api/v1/connectshyft/webhooks/inbound`
  - `POST /api/v1/connectshyft/webhooks/sms`
- Preserve current inbound auto-claim behavior exactly.
- Preserve current voicemail routing behavior exactly.
- Preserve current transcription request and callback behavior exactly.
- Extract only the route family and helper boundary.
- Leave provider, bridge, correlation, canonical, and telephony internals where they are.
- Keep router order stable.
- Do not broaden scope into PeopleCore implementation.
- Do not change business semantics.

## Architectural intent

By the end of Slice 9:

- `connectshyft.ts` should delegate inbound webhook routes to thin handlers.
- A dedicated helper boundary should centralize request-level prerequisite resolution and route-context preparation for inbound webhook handling.
- The heavy inbound execution core can remain in router-owned or module-owned logic for now, as long as the route family itself is thin.
- Existing provider and telephony internals stay where they are.

This is the last major ConnectShyft route-family extraction before moving to architecture consolidation and implementation against the locked PeopleCore / Identity Resolution model.

## Scope

### In scope

- Characterization tests for inbound webhook route behavior.
- Helper boundary for inbound webhook prerequisite resolution.
- Thin handlers for inbound webhook endpoints.
- Router delegation swap.
- Focused helper-boundary tests.
- Notes/guardrails doc for future maintainers.
- Router refactor plan update.

### Out of scope

- Rewriting webhook business logic.
- Rewriting provider adapter resolution.
- Rewriting canonical event storage.
- Rewriting bridge session internals.
- Rewriting provider correlation persistence.
- Rewriting auto-claim rules.
- Rewriting voicemail / transcription rules.
- Rewriting sender normalization internals.
- Any UI changes.
- Any PeopleCore data-model implementation.

## Target files

### New route characterization tests

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts`

### New helper boundary

- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`

### New handlers

- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookInbound.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/postConnectWebhookSms.ts`

### Existing handler export surface

- `apps/connectshyft-api/src/modules/connectshyft/handlers/index.ts`

### Focused helper tests

- `apps/connectshyft-api/src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts`

### Guardrail notes

- `apps/connectshyft-api/src/modules/connectshyft/handlers/INBOUND_WEBHOOK_NOTES.md`

### Existing router

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

### Existing refactor plan

- `docs/architecture/connectshyft-router-refactor-plan.md`

## Handler and helper design

### `inboundWebhookContext.ts`

This helper boundary should centralize only the route-family prerequisites and shared request preparation, not the deep execution core.

It should own things like:

- capability entry checks for inbound webhook route family
- requested provider selection preconditions that are route-level
- strict shared route parsing needed by both webhook endpoints
- request-level normalization for route dispatch into the existing inbound core
- any shared refusal mapping that is purely route-entry/prerequisite related

It must not absorb:

- provider registry internals
- bridge progression internals
- provider correlation persistence internals
- canonical event persistence internals
- inbound SMS domain mapping internals
- inbound voice routing internals
- voicemail transcription callback internals
- deep neighbor resolution internals

### Thin handlers

`postConnectWebhookInbound.ts` and `postConnectWebhookSms.ts` should:

1. call the helper boundary
2. delegate into the existing inbound execution core
3. preserve exact current response envelopes
4. preserve exact current behavior

These handlers should be very small.

## Checkpoint plan

---

## Checkpoint 1 — characterization lock

### Goal

Pin current route behavior before any extraction.

### Add

- `connectshyft.webhook-sms.characterization.test.ts`
- `connectshyft.webhook-voice.characterization.test.ts`
- `connectshyft.webhook-transcription.characterization.test.ts`

### Coverage requirements

#### SMS webhook characterization

Cover at least:

- successful inbound SMS acceptance with current success envelope
- duplicate-safe replay surface if currently exposed at route level
- sender phone required / invalid refusal behavior
- ambiguous neighbor refusal behavior
- unresolved neighbor refusal behavior
- inbound SMS thread ensure persistence refusal mapping
- inbound SMS canonical persistence refusal mapping
- exact current response payload shape for successful SMS acceptance

#### Voice webhook characterization

Cover at least:

- successful inbound voice acceptance with current success envelope
- current voicemail / fallback routing shape
- current auto-claim behavior for connected call event
- canonical persistence refusal mapping
- exact current response payload shape including current lifecycle / routing / audit / outbox sections

#### Transcription callback characterization

Cover at least:

- successful transcription callback acceptance with current shape
- duplicate suppression behavior if currently surfaced
- invalid callback correlation refusal behavior
- callback persistence failure mapping if currently surfaced
- preservation of current voicemail artifact / transcription fields

### Validation command

Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts
```

### Stop condition

Stop after Checkpoint 1 and report:

- files changed
- test results
- blockers or deviations

Commit all uncommitted items.

---

## Checkpoint 2 — helper boundary and thin handlers scaffolding

### Goal

Introduce the helper boundary and handler files without changing the route declarations yet.

### Add

- `http/inboundWebhookContext.ts`
- `handlers/postConnectWebhookInbound.ts`
- `handlers/postConnectWebhookSms.ts`
- export both from `handlers/index.ts`

### Implementation requirements

- Reuse existing logic from `connectshyft.ts`; do not redesign it.
- Keep the heavy inbound core behavior in place.
- It is acceptable in this slice for the router-owned execution core to remain large, as long as the new helper boundary isolates route-entry logic.
- Preserve exact response shapes.
- Preserve exact behavior.

### Validation commands

Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts
pnpm nx run connectshyft-api:test
```

### Stop condition

Stop after Checkpoint 2 and report:

- files changed
- validation results
- blockers or deviations

Commit all uncommitted items.

---

## Checkpoint 3 — thin-router switch

### Goal

Switch the router endpoints to the thin handlers.

### Change

In `connectshyft.ts`, replace inline webhook route lambdas with delegated handlers:

- `router.post('/webhooks/inbound', postConnectWebhookInbound);`
- `router.post('/webhooks/sms', postConnectWebhookSms);`

### Requirements

- Preserve route order exactly.
- Preserve response shapes exactly.
- Preserve behavior exactly.
- Remove only the route-local wrapper code that becomes unused because of this switch.
- Do not expand cleanup beyond what is necessary.

### Validation commands

Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts
pnpm nx run connectshyft-api:test
```

### Stop condition

Stop after Checkpoint 3 and report:

- files changed
- validation results
- blockers or deviations

Commit all uncommitted items.

---

## Checkpoint 4 — focused helper-boundary tests and refactor-plan update

### Goal

Add focused tests for the helper boundary and update the refactor roadmap.

### Add

- `src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts`

### Test coverage requirements

Cover at least:

- valid prerequisite resolution path
- deterministic refusal mapping for missing or invalid route-entry prerequisites handled by the helper
- helper remains prerequisite-only and does not absorb provider / bridge / canonical internals
- handler-facing route preparation is deterministic

### Update

Update:

- `docs/architecture/connectshyft-router-refactor-plan.md`

Mark:

- Slice 4 complete
- Slice 5 complete
- Slice 6 complete
- Slice 7 complete
- Slice 8 complete
- Slice 9 complete

And set next step to:

- architecture consolidation for PeopleCore / Identity Resolution / ConnectShyft model lock-in

Also explicitly state:

- provider / correlation / canonical / bridge internals remain intentionally deferred from the route-family extraction sequence

### Validation commands

Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts
pnpm nx run connectshyft-api:test
```

### Stop condition

Stop after Checkpoint 4 and report:

- files changed
- validation results
- blockers or deviations

Commit all uncommitted items.

---

## Checkpoint 5 — inbound webhook guardrail notes

### Goal

Document ownership and deferrals for the inbound webhook route family.

### Add

- `apps/connectshyft-api/src/modules/connectshyft/handlers/INBOUND_WEBHOOK_NOTES.md`

### Document content requirements

State clearly:

- what the inbound webhook handlers own
- what `inboundWebhookContext.ts` owns
- what remains in provider / correlation / canonical / bridge / transcription internals
- that exact current inbound response shapes are locked
- that current auto-claim / voicemail / transcription behavior is locked
- that this slice did not redesign telephony or provider behavior
- that architecture consolidation is next

### Validation commands

Run exactly:

```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts src/routes/api/v1/__tests__/connectshyft.webhook-transcription.characterization.test.ts src/modules/connectshyft/__tests__/handlers.inboundWebhookContext.test.ts
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Stop condition

Stop after Checkpoint 5 and report:

- files changed
- validation results
- blockers or deviations

Commit all uncommitted items.

---

## PR / CI completion step

After Checkpoint 5 is complete:

1. commit all remaining uncommitted items
2. push the branch
3. open the PR against `codex/dev`
4. watch checks through completion
5. do not broaden scope unless a failing check requires a tightly scoped fix

Report back with:

- PR number
- check results
- whether any follow-up patching was needed

## Implementation guardrails

- Do not rename existing response keys.
- Do not normalize or “clean up” current envelopes.
- Do not refactor provider internals into the helper.
- Do not move bridge or canonical modules.
- Do not re-architect webhook dedupe behavior.
- Do not alter current webhook routing semantics.
- Do not alter current SMS neighbor-resolution semantics.
- Do not alter current voice auto-claim semantics.
- Do not alter current voicemail transcription callback semantics.
- Do not start PeopleCore implementation in this slice.

## Done definition

Slice 9 is done when:

- inbound webhook routes are thin-router delegated
- the helper boundary exists and is tested
- exact current webhook response shapes remain unchanged
- exact current auto-claim / voicemail / transcription behavior remains unchanged
- router refactor plan is updated
- inbound guardrail notes exist
- local validations pass
- CI passes

## Counterpoint

The biggest risk in this slice is accidental “cleanup” of the inbound core while extracting routes. That would be the wrong move. The point here is to finish structural extraction, not to make the inbound logic prettier. If the code is ugly but behavior-stable and the route family becomes thin, that is success for Slice 9.
