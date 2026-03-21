# ConnectShyft Router Orchestration Notes (Post Slice 11)

## Purpose

This document defines the hard architectural boundary for the ConnectShyft router after Slice 11.

The goal is to keep `connectshyft.ts` from becoming a second application layer.

This note is authoritative for future ConnectShyft route work unless a later ADR explicitly replaces it.

---

## Why This Exists

Before the extraction sequence, `connectshyft.ts` accumulated too many responsibilities:

- route registration
- HTTP parsing
- response shaping
- orchestration
- policy checks
- direct coordination across multiple modules
- large inline execution flows

That made the router hard to review, hard to test, and easy to accidentally bloat.

Slices 4 through 11 progressively extracted route families into handlers and HTTP helper boundaries. This document locks the resulting architecture so future work does not drift backward.

---

## Router Responsibility (Hard Rule)

`apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` must only:

- declare routes
- preserve route order
- attach already-approved middleware and route-level guards when truly necessary
- delegate to module-owned handlers

The router must not:

- contain business logic
- contain route-family orchestration logic
- perform multi-step request parsing
- call domain modules directly
- shape complex success envelopes
- shape complex refusal envelopes
- embed provider-specific behavior
- embed bridge, canonical-event, correlation, or timeline behavior

### Allowed pattern

```ts
router.post('/threads/:threadId/call', postConnectThreadCall);
router.post('/webhooks/inbound', postConnectWebhookInbound);
```

### Forbidden pattern

```ts
router.post('/threads/:threadId/call', async (req, res) => {
  const context = await resolveSomething(req);
  const parsed = parseBody(req);
  const result = await callSeveralModules(context, parsed);
  return res.json(result);
});
```

If a new route cannot be expressed as direct delegation, that is a signal to add or expand a handler/helper boundary, not to re-bloat the router.

---

## Handler Responsibility (Orchestration Layer)

Handlers are the orchestration layer for ConnectShyft HTTP entry points.

Handlers may:

- coordinate multiple ConnectShyft modules
- call HTTP boundary helpers
- decide execution order
- enforce capability and context prerequisites through helper boundaries
- preserve exact response shapes already locked by characterization tests
- delegate heavy behavior to existing domain and infrastructure modules

Handlers must not:

- absorb deep provider internals
- reimplement bridge session logic
- reimplement canonical event persistence
- reimplement correlation mapping
- rewrite business rules that belong in domain modules
- introduce response-shape drift

A handler may be large if the orchestration surface is large, but the logic should still be organized around helper boundaries and domain delegation rather than router-local sprawl.

---

## HTTP Boundary Helpers (Strict Boundary)

HTTP helpers exist to isolate request and response concerns from orchestration.

They should own things like:

- request param parsing
- body parsing
- header parsing
- orgUnit and tenant context resolution
- actor extraction
- route-kind or entrypoint classification
- prerequisite refusal mapping
- response-envelope preservation helpers
- safe normalization for HTTP input values

They must not own:

- provider dispatch behavior
- webhook domain execution
- bridge execution
- canonical persistence behavior
- merge behavior
- identity resolution logic
- business-state mutation orchestration

The helper boundary is a translation layer between Express and orchestration, not a new domain layer.

---

## Domain Modules (Protected Layer)

The following stay in module/domain space and must not move back into router or helper code:

- provider registry
- sender number resolver
- bridge sessions
- canonical events
- inbound SMS translation and payload shaping
- inbound voice translation and payload shaping
- provider correlation mappings
- communication reliability/idempotency
- communication audit logging
- SMS preference override persistence
- thread, neighbor, and identity domain services

These modules may be refactored later, but Slice 11 does not change their ownership.

---

## Route Family Structure

After Slice 11, ConnectShyft route families should follow this pattern:

1. Router registers route.
2. Router delegates to a named handler.
3. Handler calls one or more helper boundaries for HTTP prerequisite work.
4. Handler orchestrates module calls.
5. Domain/infrastructure modules execute business behavior.
6. Handler preserves the locked response envelope.

This pattern should apply consistently across:

- context and inbox routes
- thread read routes
- lifecycle routes
- outbound routes
- neighbor and identity routes
- inbound webhook routes
- remaining admin/configuration routes

---

## Characterization Lock Rule

No router or handler extraction work should begin unless the current route family is locked by characterization tests.

At minimum, characterization tests must pin:

- success envelope shape
- refusal envelope shape
- known error/refusal codes
- current side-effect metadata fields
- any current weirdness intentionally preserved for compatibility

If behavior is ugly but currently depended on, preserve it first, then redesign in a later intentional slice.

---

## Response-Shape Preservation Rule

The extraction sequence is not a redesign sequence.

Unless a slice explicitly says otherwise, handler extraction work must preserve:

- exact field names
- exact nesting
- exact success/refusal envelope patterns
- exact behavior around reopen/auto-claim/voicemail/transcription metadata
- existing HTTP status behavior
- current refusal typing semantics

This is especially important in ConnectShyft because frontend and tests currently depend on these shapes.

---

## Frontend Type-System Separation (Required)

ConnectShyft web must maintain separate build and test type surfaces.

### Production surface

`tsconfig.json` is for production build only.

It must:

- include production app source
- exclude test files
- avoid requiring Vitest or Vue test-utils to build

### Test surface

`tsconfig.vitest.json` is for test compilation and editor/test tooling.

It should:

- extend the base config
- include test files
- load Vitest and jsdom types
- allow test-only tooling without polluting production build

### Hard rule

A production build must succeed even if test-only source is not compiled by `vue-tsc` during the build step.

This separation is not optional.

---

## Anti-Regression Rules

The following count as architectural regressions:

- adding non-trivial inline route lambdas back into `connectshyft.ts`
- directly importing deep domain modules into the router for new execution paths
- pushing request parsing into domain modules
- letting helpers absorb orchestration responsibilities
- letting handlers absorb provider-specific internals that already belong elsewhere
- coupling production frontend build to Vitest-only types or packages

If a PR does any of those things, it should be treated as boundary drift, not harmless cleanup.

---

## What Slice 11 Does Not Change

Slice 11 does not:

- redesign provider behavior
- redesign telephony behavior
- redesign webhook semantics
- redesign identity resolution
- change canonical event semantics
- change bridge progression behavior
- change thread lifecycle semantics
- redesign ConnectShyft domain ownership

Those are separate concerns and must be handled in explicitly named future slices.

---

## Review Checklist for Future PRs

When reviewing future ConnectShyft PRs, ask:

1. Does the router only register and delegate?
2. Is the handler the orchestration layer?
3. Is HTTP parsing isolated to helper boundaries?
4. Are provider, bridge, canonical, and correlation internals still outside router/helpers?
5. Are existing response shapes preserved unless the slice explicitly redesigns them?
6. Does the frontend build remain independent from the test type surface?

If the answer to any of these is no, the PR needs revision.

---

## Bottom Line

Post Slice 11, ConnectShyft should have:

- a thin router
- named route-family handlers
- explicit HTTP helper boundaries
- protected domain/infrastructure modules
- separate frontend build and test type surfaces

This is the architecture lock that prevents `connectshyft.ts` from turning back into a monolith.
