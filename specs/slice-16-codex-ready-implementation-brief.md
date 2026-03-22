# Slice 16: ConnectShyft Telephony Stabilization

## Objective

Stabilize the telephony runtime that already exists in `apps/connectshyft-api` so ConnectShyft can move from architecture groundwork into trustworthy real-world operation.

This slice is not a redesign.
This slice is a runtime stabilization slice.

It must:
- preserve the current provider-neutral architecture
- preserve the thin-router direction already established
- preserve current identity ambiguity behavior from Slices 13 through 15
- keep ConnectShyft neighbor/person authority boundaries unchanged
- harden telephony behavior where tests and recon show instability
- close the currently failing bridge-flow regression before any broader telephony expansion

---

## Repo-Snapped Scope

Primary runtime surface already exists in:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`

Primary tests already in play:

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundSms.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/senderNumberResolver.test.ts`

---

## Locked Recommendation

Implement Slice 16 as **telephony runtime stabilization**, not as telephony expansion.

Best-practice call:
- fix the failing bridge-flow persistence/read path first
- then harden runtime seams already present in the router and modules
- do not introduce new provider features, new transport modes, or major schema redesign in this slice
- do not move identity ownership again in this slice
- do not fold telephony logic back into unrelated handler families

Why this is the right move:
- recon shows the telephony surface already exists and is broad
- the current targeted failure set is narrow: one bridge-flow test is failing while the rest of the telephony target set is largely green
- this means the fastest path to a working system is stabilization, not new capability expansion

Counterpoint:
A tempting path is to jump directly into outbound/provider feature growth because the route already contains a lot of telephony logic. That is the wrong move for this slice. A partially stable call/message stack with one unresolved bridge persistence/read defect is not ready for expansion.

---

## Policy: Telephony Stabilization (LOCKED)

Decision:
- Slice 16 stabilizes existing telephony runtime behavior only.

Rules:
- No provider redesign.
- No new provider abstraction layer.
- No new identity authority model.
- No silent fallback that weakens ambiguity handling.
- No route thickening beyond minimal stabilization changes.
- No behavioral drift in response shapes unless an explicit checkpoint below requires it.

Enforcement:
- Existing telephony route contracts remain authoritative.
- Existing ambiguity behavior remains authoritative.
- Existing provider-neutral event translation remains authoritative.
- Every runtime change must be covered by characterization or focused regression tests.

Telemetry:
- Preserve current canonical event, correlation, and webhook receipt behavior.
- Do not remove existing replay-safe or side-effect reporting fields.

---

## Non-Negotiable Constraints

- Preserve current response shapes for inbound SMS, inbound voice, outbound dispatch, and provider-webhook flows unless explicitly locked below.
- Preserve Slice 13 and Slice 14 ambiguity semantics exactly.
- Preserve router order in `connectshyft.ts`.
- Keep route-family orchestration in handlers/helpers/modules, not ad hoc inline sprawl.
- Do not create standalone policy docs.
- If documentation is updated, policy must be embedded inline in the slice docs already in scope.
- Do not invent PeopleCore ↔ neighbor reconciliation.
- Do not add new mapping tables for person ↔ neighbor equivalence.
- Do not change app-shell, feature-flag, or UI architecture in this slice.
- Do not expand beyond telephony stabilization just because nearby code is messy.

---

## Recon Snapshot (Authoritative for This Slice)

The attached recon shows:
- branch is `codex/dev`
- telephony surface is already concentrated in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- the route already coordinates provider selection, sender resolution, correlation mapping, inbound SMS handling, bridge sessions, and webhook processing
- targeted telephony tests are mostly passing
- the only listed failing target in the provided failures file is:
  - `src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
  - failing test: `connectshyft bridge webhook flow › loads persisted bridge state from a fresh thread detail read after completion`

This means Slice 16 should treat bridge-flow persistence/read coherence as the entry defect and then harden adjacent seams without redesigning the platform.

---

## Success Criteria

By the end of Slice 16:

- the bridge-flow failing test passes
- the full telephony target suite passes
- webhook SMS behavior remains green
- provider registry dispatch and guardrails remain green
- outbound dispatch remains green
- inbound voice and inbound SMS module tests remain green
- provider correlation and number mapping tests remain green
- no identity ambiguity regression is introduced
- no new unresolved route-contract drift is introduced
- ConnectShyft is measurably closer to real telephony readiness because the runtime path is stabilized instead of merely described

---

# CHECKPOINT 1
## Lock the Current Telephony Runtime Surface and Reproduce the Bridge Defect

### Purpose
Before changing production logic, lock the current runtime behavior around the failing bridge-flow readback path and the nearest telephony seams.

### Required work
Add or refine characterization coverage only where needed to make the bridge persistence/read expectations explicit.

### Files in scope
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

### Required behavior to lock
- completed bridge webhook progression must be readable from a fresh thread detail read
- persisted bridge session state must not disappear after completion
- correlation mapping and bridge aggregate state must remain deterministic after webhook application
- no unrelated identity or SMS fallback behavior changes

### Prohibitions
- no production logic edits in this checkpoint
- no schema edits
- no router refactor in this checkpoint

### Validate
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts

pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
  apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts

git commit -m "test(slice-16): lock bridge-flow telephony stabilization behavior"
```

### Stop condition
STOP after Checkpoint 1. Report exact failing assertions before changing production code.

---

# CHECKPOINT 2
## Repair Bridge Completion Persistence and Fresh-Read Coherence

### Purpose
Fix the specific bridge-flow defect where completed bridge state is not loading correctly from a fresh thread detail read.

### Files in scope
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- `apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts`
- any narrow helper already used by these modules if absolutely required

### Required behavior
- when a bridge webhook progression completes, persisted bridge state must remain readable on subsequent fresh thread-detail reads
- bridge aggregate state, domain event output, and correlation mapping must remain internally coherent
- completion handling must not suppress the persisted state needed by the thread-detail projection
- replay-safe semantics must remain intact

### Prohibitions
- no provider redesign
- no new route families
- no broad projection rewrite
- no change to unrelated inbound SMS or outbound message behavior

### Implementation rule
Prefer the narrowest possible fix:
- repair persistence/read contract mismatch first
- repair completion-state projection second only if required
- do not rewrite bridge session architecture unless the failing test proves it is unavoidable

### Validate
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts

pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts \
  apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts \
  apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts

git commit -m "fix(slice-16): restore bridge completion persistence and fresh-read coherence"
```

### Stop condition
STOP after Checkpoint 2. Confirm the previously failing bridge-flow test now passes.

---

# CHECKPOINT 3
## Stabilize Inbound Webhook Correlation and Reusable Neighbor Resolution

### Purpose
Harden the inbound telephony path that reuses explicit or correlated neighbor identity during webhook intake, without changing ambiguity policy.

### Files in scope
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts`
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`

### Required behavior
- explicit inbound neighbor reuse remains supported when valid
- correlated thread neighbor reuse remains supported when valid
- retryable persistence failures remain explicit
- ambiguity still blocks creation
- no-match still allows the existing create-new shell where already characterized
- PeopleCore-unavailable fallback remains stable where already characterized

### Prohibitions
- no weakening of Slice 13 ambiguity precedence
- no new silent winner selection
- no new crosswalk logic between person and neighbor

### Validate
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts

pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/modules/connectshyft/http/inboundWebhookContext.ts \
  apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings.ts \
  apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts \
  apps/connectshyft-api/src/modules/connectshyft/neighbors.ts

git commit -m "fix(slice-16): stabilize inbound telephony correlation and neighbor reuse"
```

### Stop condition
STOP after Checkpoint 3. Report whether inbound SMS and provider-registry telephony suites are still green.

---

# CHECKPOINT 4
## Stabilize Outbound Sender Resolution and Bridge Dispatch Guardrails

### Purpose
Harden the outbound call/message runtime without redesigning provider selection.

### Files in scope
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`

### Required behavior
- outbound SMS target ambiguity behavior remains unchanged
- outbound sender ambiguity behavior remains unchanged
- bridge transport policy remains enforced for calls
- provider adapter selection remains deterministic
- dispatch-side persistence and replay-safe behavior remain intact

### Prohibitions
- no new transport modes
- no experimental provider branching in domain modules
- no response-shape redesign

### Validate
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/modules/connectshyft/__tests__/senderNumberResolver.test.ts \
  src/modules/connectshyft/__tests__/numberMappings.test.ts \
  src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts

pnpm nx run connectshyft-api:test
```

### Commit
```bash
git add apps/connectshyft-api/src/routes/api/v1/connectshyft.ts \
  apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts \
  apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts \
  apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts \
  apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts

git commit -m "fix(slice-16): harden outbound telephony dispatch and sender resolution"
```

### Stop condition
STOP after Checkpoint 4. Confirm outbound dispatch suite remains green.

---

# CHECKPOINT 5
## Add Telephony Runtime Notes Aligned to Actual Repo Ownership

### Purpose
Document the stabilized runtime seams so future slices do not re-thicken the router or re-open settled ambiguity behavior.

### Create
- `docs/architecture/connectshyft-telephony-runtime-notes.md`

### Update
- `docs/architecture/connectshyft-router-refactor-plan.md`

### Required documentation content
- what telephony runtime remains in `connectshyft.ts`
- what is intentionally still owned by domain/infrastructure modules
- that Slice 16 is stabilization, not expansion
- that ambiguity rules remain governed by Slices 13 through 15
- what remains deferred for future telephony audit/launch readiness

### Prohibitions
- no standalone policy docs
- no fake future architecture descriptions
- no claims that PeopleCore already replaces ConnectShyft neighbor runtime

### Validate
```bash
pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Commit
```bash
git add docs/architecture/connectshyft-telephony-runtime-notes.md \
  docs/architecture/connectshyft-router-refactor-plan.md

git commit -m "docs(slice-16): lock connectshyft telephony runtime stabilization boundaries"
```

### Stop condition
STOP after Checkpoint 5.

---

# CHECKPOINT 6
## Final Telephony Target Validation and PR Prep

### Purpose
Run the exact telephony-focused validation set and close the slice only if the runtime is stable.

### Validate
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-sms.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
  src/modules/connectshyft/__tests__/numberMappings.test.ts \
  src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts \
  src/modules/connectshyft/__tests__/inboundVoice.test.ts \
  src/modules/connectshyft/__tests__/inboundSms.test.ts \
  src/modules/connectshyft/__tests__/senderNumberResolver.test.ts

pnpm nx run connectshyft-api:test
pnpm nx run contracts:test
```

### Commit
```bash
git status --short
```

If clean and green, then:

```bash
git push -u origin codex/slice-16-telephony-stabilization
```

### PR
Title:
```text
Slice 16: stabilize ConnectShyft telephony runtime
```

### PR body must state
- bridge-flow failing test fixed
- telephony target suite green
- no ambiguity-policy regression
- no provider redesign performed
- slice stayed within stabilization scope

---

## Codex Execution Rules

- Work checkpoint by checkpoint.
- Do not skip ahead.
- Stop after each checkpoint.
- If validation fails, report:
  - exact failing tests
  - exact file/line if available
  - whether failure is new, pre-existing, or caused by current checkpoint
  - minimal next fix recommendation
- Commit all and only the files changed for that checkpoint if validation passes.
- Do not silently widen scope.

---

## Definition of Done

Slice 16 is done only if:
- the bridge-flow defect is resolved
- telephony runtime target suites are green
- no ambiguity regressions were introduced
- no new telephony architecture drift was introduced
- docs accurately describe the stabilized runtime ownership

