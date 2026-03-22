# Slice 17 Codex-Ready Implementation Brief

## Title
Slice 17 - Telephony Runtime Certification + Operator Callback Number Readiness

## Branch
`codex/dev`

## Intent
Close the gap between telephony architecture that passes tests and telephony that can actually run in production.

This slice does **not** redesign provider architecture. It adds the minimum repo-snapped runtime readiness surfaces and the minimum operator callback-number path required so inbound and outbound voice do not fail for avoidable configuration reasons.

---

## Authoritative Scope

This slice is limited to:

1. Telephony runtime readiness inspection
2. Operator callback / forwarding number persistence and read path
3. Minimal user-facing callback-number management surface
4. Deterministic refusal and readiness messaging for missing callback-number prerequisites
5. Characterization / integration coverage for the new readiness and callback-number path

This slice must preserve the current telephony architecture already exercised through:
- provider selection and dispatch
- inbound webhook prerequisite handling
- bridge-session state progression
- persisted bridge-session readback
- existing outbound call refusal when operator callback number is missing

---

## Why this slice exists

The repo already contains substantial telephony architecture and passing test coverage around provider dispatch, webhook handling, bridge-session orchestration, and read-only ops visibility. However, the current router still refuses outbound bridge calls when the operator callback number is absent, and there is no confirmed user-facing path in the working set for a logged-in operator to actually set that number.

That means telephony can still be "architecturally present but operationally broken."

This slice closes that gap.

---

## Locked Policy: Telephony Runtime Certification (LOCKED)

### Decision
Telephony readiness is a first-class operational concern.

### Rules
- No telephony-critical prerequisite may remain implicit.
- Missing operator callback numbers must be surfaced as explicit runtime readiness failures.
- The system must fail closed with actionable, operator-safe messaging.
- Operator callback numbers are operational telephony configuration, not deferred profile polish.
- This slice must not redesign provider selection, bridge orchestration, or webhook semantics.

### Enforcement
- Add a read-only readiness surface for telephony prerequisites.
- Add a durable path for the logged-in operator to read and set callback number state.
- Preserve current outbound/inbound voice contract behavior unless the new readiness surface explicitly improves the refusal explanation.
- Do not introduce silent fallback behavior.

### Telemetry
Emit or preserve deterministic audit / canonical visibility where repo patterns already exist, but do not invent a new analytics subsystem.

---

## Locked Policy: Scope Discipline (LOCKED)

### Decision
This slice is runtime-readiness work, not full telephony feature expansion.

### Rules
- No provider redesign
- No WebRTC or SIP redesign
- No new operator availability scheduling system
- No broad profile/settings rebuild
- No large shell/navigation redesign
- No mutation-heavy ops tooling beyond callback-number management
- No telephony smoke-call execution endpoint in this slice

---

## Repo-Snapped Architecture Constraints

Follow existing repo layering exactly:

- routes register endpoints only
- handlers orchestrate
- http helpers parse / resolve access context / shape refusals
- services own business logic
- stores own persistence

Respect the existing thin-router direction documented in the repo. Do not move telephony internals back into `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.

Preserve these module boundaries:
- `providerRegistry.ts` stays provider/domain oriented
- `bridgeSessions.ts` stays bridge/domain oriented
- `inboundWebhookContext.ts` stays webhook prerequisite oriented
- existing telephony route behavior remains handler-driven, not router-driven

---

## Working assumptions to preserve

1. ConnectShyft remains the communications substrate.
2. Conversation remains operationally distinct from person identity.
3. PeopleCore is not being redesigned in this slice.
4. Telephony readiness is orgUnit- and operator-aware.
5. Existing outbound call refusal for missing operator callback number is correct and should remain fail-closed.

---

## Primary files expected to be touched

Backend candidates:
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/ops.handlers.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/accessContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/http/threadOutboundContext.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`

New backend files are allowed where they fit repo structure cleanly, likely under:
- `apps/connectshyft-api/src/modules/connectshyft/http/ops.handlers.ts`
- `apps/connectshyft-api/src/modules/connectshyft/telephonyReadiness.ts`
- `apps/connectshyft-api/src/modules/connectshyft/operatorCallbackNumbers.ts`

Frontend candidates:
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/*Settings*.vue`
- existing feature/store modules already used by ConnectShyft settings / more surfaces

Tests likely touched:
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- new tests for readiness and callback-number persistence / handlers

Docs:
- update the currently active architecture / roadmap docs only if the repo expects it for this slice
- do not create floating policy docs
- inline policy inside implementation-facing artifacts only

---

## Required deliverables

### Deliverable A - Telephony readiness read model
Implement a deterministic readiness service that can answer, at minimum:

- is there an active telephony provider selection path
- is webhook signature verification configured for the active provider
- does the active orgUnit have routable number mapping(s)
- is voice supported for the current orgUnit/provider selection
- does the current operator have a callback / forwarding number on file
- is the operator callback number dialable / normalized
- is bridge calling currently runnable

The response must be read-only.

The response must be explicit, structured, and actionable.

Do not bury readiness in generic booleans only. Include machine-friendly codes and human-friendly explanations.

### Deliverable B - Operator callback-number persistence
Add or complete a durable operator callback-number persistence path.

Requirements:
- must be bound to the authenticated operator / user
- must support read current value
- must support set / replace current value
- must normalize dialable phone input using existing repo phone-normalization rules where possible
- must fail clearly on invalid phone input
- must not expose raw provider-specific nonsense to the user

If an existing persistence location already exists in platform/user settings, use it.
If it does not, add the narrowest possible persistence shape to support this slice.

### Deliverable C - Minimal operator-facing settings path
Add the minimal user-facing path required so an operator can actually set the callback number.

Constraints:
- do not build a giant account/profile/settings system
- do not redesign the full shell
- place this in the smallest repo-aligned ConnectShyft settings / more surface already present
- mobile-first, simple, functional, and explicit

UI requirements:
- current callback number visible when present
- clear empty state when absent
- add / edit flow
- plain-language explanation that voice forwarding depends on this number
- explicit success and failure messaging

### Deliverable D - Deterministic refusal integration
Preserve current voice fail-closed behavior, but improve the path so the system can clearly say:
- why voice cannot proceed
- whether the problem is operator callback-number missing
- what the operator must do next

This must apply to the read model and any directly adjacent existing refusal surfaces.

### Deliverable E - Characterization and integration coverage
Add tests that prove:
- readiness reports callback-number missing when absent
- readiness reports bridge-call runnable when present and otherwise configured
- invalid callback number updates refuse deterministically
- valid callback number updates persist and read back deterministically
- outbound bridge calling still refuses without callback number
- outbound bridge calling clears the callback-number prerequisite when the operator number exists
- inbound voice / callback-related read surfaces do not regress

---

## Checkpoints

### Checkpoint 1 - Characterization lock
Before production logic changes, add characterization coverage for:
- current missing-callback refusal path
- current absence of operator callback-number settings/readiness surface if absent
- current more/settings surface behavior relevant to this slice

Stop after tests are added.

### Checkpoint 2 - Persistence foundation
Implement or complete the narrow persistence/store/service layer for operator callback numbers.

Do not wire full UI yet.

Must include:
- read current operator callback number
- set/update callback number
- normalization/validation
- tests

### Checkpoint 3 - Readiness service
Implement telephony readiness service.

Must return structured readiness, including callback-number readiness.

Keep it read-only.

### Checkpoint 4 - Handler + route integration
Expose readiness and callback-number read/write through repo-snapped handlers/routes.

Do not collapse orchestration back into `connectshyft.ts`.

### Checkpoint 5 - Minimal UI path
Add the minimal ConnectShyft-facing settings surface to let the operator manage the callback number.

Do not expand beyond the necessary user path.

### Checkpoint 6 - End-to-end regression lock
Add/adjust characterization and integration tests across backend and frontend to prove:
- readiness truth
- callback-number persistence truth
- continued fail-closed voice behavior
- no router/module boundary regressions

---

## Data model guidance

Use the narrowest viable durable shape.

Preferred shape:
- operator/user-bound callback number record or user settings field

Required fields:
- user id
- normalized callback number
- raw input if repo conventions keep it
- created/updated timestamps if persisted in dedicated storage

Optional only if already idiomatic in repo:
- validation status
- source

Do not add speculative fields for future profile systems.

---

## API / contract guidance

The exact endpoint names must follow repo naming conventions, but the system must expose:

1. **Read readiness**
2. **Read current operator callback number**
3. **Create/update operator callback number**

Response contracts must be deterministic.

Readiness response should include something like:
- `voiceReady`
- `callbackNumberConfigured`
- `callbackNumberNormalized`
- `orgUnitNumberMappingReady`
- `providerReady`
- `blockingReasons[]`
- `nextActions[]`

Use repo-standard refusal envelopes where appropriate.
Do not invent one-off envelope patterns if existing ConnectShyft handler contracts already cover this.

---

## Frontend guidance

### Product stance
This is not "profile management."
This is "make telephony actually work."

### UX requirements
- one small focused settings card or screen
- plain-language explanation
- no backend IDs
- no provider jargon
- no transport jargon unless already exposed elsewhere
- mobile-first

### Suggested content
- heading: callback / forwarding number
- short explanation: inbound and bridge calls use this number to reach you
- input field with dialable number formatting help
- save action
- current status indicator tied to readiness surface

### Non-goals
- no avatar/profile editing
- no multi-number strategy in this slice
- no availability scheduler bundle-in unless already repo-native and trivial

---

## Testing commands

Codex must run the narrowest relevant tests first, then broader validation.

Backend targeted examples:
```bash
pnpm --dir apps/connectshyft-api exec jest --runInBand --config jest.config.js --runTestsByPath \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/routes/api/v1/__tests__/connectshyft.webhook-voice.characterization.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts \
  src/modules/connectshyft/__tests__/bridgeSessions.test.ts
```

Add any new readiness / callback-number test paths explicitly to that command.

Broader backend validation:
```bash
pnpm nx run connectshyft-api:test
```

Frontend validation, if touched:
```bash
pnpm --dir apps/connectshyft-web test
pnpm --dir apps/connectshyft-web build
```

Run only the smallest affected scope first, then broaden.

---

## Guardrails for Codex

- Do not widen this into full telephony UX.
- Do not widen this into full account settings.
- Do not redesign provider architecture.
- Do not move provider or bridge internals into the router.
- Do not create floating policy docs.
- Keep policy inline in implementation artifacts only.
- Preserve existing response shapes unless the slice explicitly requires additive readiness fields.
- Prefer additive change over breaking contract change.
- Preserve passing telephony behavior already locked by characterization tests.
- Stop immediately if implementation would require speculative identity-model redesign.

---

## Done definition

Slice 17 is done when all of the following are true:

1. A logged-in operator can set a callback / forwarding phone number through a real repo-native UI path.
2. That number persists durably and reads back correctly.
3. Telephony readiness can explicitly report whether voice is runnable.
4. Missing callback-number prerequisites are surfaced clearly and deterministically.
5. Existing outbound voice fail-closed behavior remains correct.
6. Targeted telephony tests pass.
7. Broader ConnectShyft backend tests pass.
8. No router boundary regression is introduced.

---

## Recommended commit progression

1. `test(slice-17): lock telephony callback readiness behavior`
2. `feat(slice-17): add operator callback number persistence`
3. `feat(slice-17): add telephony readiness inspection`
4. `feat(slice-17): expose callback number and readiness handlers`
5. `feat(slice-17): add minimal callback settings surface`
6. `test(slice-17): lock readiness and callback regressions`

---

## Final instruction to Codex

Implement this slice as a **runtime-readiness slice**, not a feature-expansion slice.

The objective is to make the existing telephony architecture operationally usable by exposing and satisfying the missing operator callback-number prerequisite, while preserving the repo’s current telephony structure and tests.
