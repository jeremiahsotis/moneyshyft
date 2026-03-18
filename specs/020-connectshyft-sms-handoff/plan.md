# Implementation Plan: ConnectShyft SMS Dispatch Handoff

**Branch**: `020-connectshyft-sms-handoff` | **Date**: 2026-03-17 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/spec.md)
**Input**: Feature specification from `/specs/020-connectshyft-sms-handoff/spec.md`

## Summary

Harden the dedicated ConnectShyft outbound SMS composer path with a route-owned dispatch-ready `targetPhone` invariant, prove the exact handoff integrity across route, wrapper, and Telnyx boundaries with short-lived instrumentation, and then lock the permanent behavior with focused regression coverage. Step 2 architecture guidance is controlling: add the defensive route guard first, treat provider abstractions as fixed, instrument only the six validated handoff points, and remove the instrumentation before closure unless a short-lived verification hold is explicitly required.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Jest/ts-jest, shared `domains/communication` telephony contracts, ConnectShyft provider registry, Telnyx adapter  
**Storage**: Shared PostgreSQL plus in-memory ConnectShyft test fixtures and ledgers  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest route/module/adapter tests from `apps/connectshyft-api`, optional existing Playwright smoke coverage left unchanged  
**Target Platform**: Dedicated ConnectShyft API lane behind shared host Nginx and Dockerized Node runtime  
**Project Type**: Monorepo backend lane feature with shared infrastructure adapter surface  
**Performance Goals**: Preserve current composer request contract, add zero extra provider round trips, and fail before provider dispatch when the route lacks a dispatch-ready target  
**Constraints**: Keep scope surgical; no provider abstraction redesign; no frontend rewrite; no unrelated comms cleanup; no lane-convergence work; no migration-runner work; temporary instrumentation at exactly six handoff points only; remove instrumentation before final closure  
**Scale/Scope**: One ConnectShyft outbound SMS path (`POST /api/v1/connectshyft/threads/:threadId/messages`), one provider wrapper, one Telnyx adapter path, and the existing related route/provider/adapter test files

## Constitution Check

*GATE: Pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes to `admin-web`, `admin-api`, authentication ownership, or shared shell behavior are planned.
- **Lane isolation preserved**: Pass. Source changes stay within `apps/connectshyft-api` and the already-used shared Telnyx/provider surfaces on the ConnectShyft runtime path.
- **Routing delegation preserved**: Pass. No `/api/v1/auth/*` or `/api/v1/platform/admin/*` routing behavior changes are in scope.
- **Deployment topology preserved**: Pass. No Nginx, Docker binding, port, or static-serving changes are planned.
- **Database ownership preserved**: Pass. No migration, schema, or ownership changes are planned.
- **Security boundaries preserved**: Pass. No public ingress, cookie, or cross-lane access changes are planned.
- **Workflow compliance**: Pass. The implementation is derived directly from the `020` spec plus the Step 2 route-guard and instrumentation guidance.
- **Acceptance criteria present**: Pass. The plan includes route/provider verification plus unchanged routing/topology checks for the wider platform contract.

## Project Structure

### Documentation (this feature)

```text
specs/020-connectshyft-sms-handoff/
├── checklists/
│   └── requirements.md
├── contracts/
│   └── outbound-sms-dispatch-boundary.md
├── 02-debugging-plan.md
├── 03-speckit-handoff-context.md
├── 04-recommended-runtime-instrumentation.md
├── 05-recommended-fixes.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
apps/connectshyft-api/
├── src/modules/connectshyft/
│   ├── __tests__/
│   │   └── providerRegistry.test.ts
│   └── providerRegistry.ts
└── src/routes/api/v1/
    ├── __tests__/
    │   └── connectshyft.outbound-dispatch.test.ts
    └── connectshyft.ts

infrastructure/communications/telnyx/
├── __tests__/
│   └── index.test.ts
└── index.ts

tests/e2e/platform/
└── g-2-inbox-and-mine-surface-rebuild.automate.dispatch-and-ownership.cases.ts
```

**Structure Decision**: The permanent fix remains backend-only unless slice-two instrumentation proves the first divergent handoff is in the wrapper or Telnyx adapter. Existing frontend behavior and request shape remain unchanged.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/research.md](/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/data-model.md).
- Boundary contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/contracts/outbound-sms-dispatch-boundary.md](/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/contracts/outbound-sms-dispatch-boundary.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/020-connectshyft-sms-handoff/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. Design keeps all auth and shell ownership unchanged.
- **Lane isolation preserved**: Pass. Design limits permanent changes to ConnectShyft route logic plus the already-linked provider wrapper and Telnyx adapter only if instrumentation proves drift there.
- **Routing delegation preserved**: Pass. Design introduces no routing changes.
- **Deployment topology preserved**: Pass. Design uses code and test changes only.
- **Database ownership preserved**: Pass. No migration or schema work is introduced.
- **Security boundaries preserved**: Pass. Temporary instrumentation is local runtime logging only and is removed before closure.
- **Workflow compliance**: Pass. Slice order, stop points, and verification criteria map directly to the `020` spec.
- **Acceptance criteria present**: Pass. The design includes unchanged platform compatibility checks and precise dispatch-boundary verification.

## Implementation Slices

### Slice 1 - Route-Level Invariant Hardening

**Primary goal**: make outbound SMS provider dispatch impossible unless `performOutboundAction` holds a dispatch-ready `targetPhone`.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `buildConnectShyftSmsTargetRefusal`
  - `resolveConnectShyftSmsTarget`
  - `performOutboundAction`
  - one new route-local SMS dispatch invariant helper placed in the same file and exported with a `ForTests` alias

**Required changes**

- Reuse the existing SMS-target refusal family instead of creating a new provider-facing taxonomy.
- Introduce a route-local helper that:
  - normalizes the resolved outbound SMS target into a dispatch-ready string,
  - derives refusal source from the current request context (`explicit_request` when the request supplied a target, otherwise `neighbor_record`),
  - returns the existing `CONNECTSHYFT_SMS_TARGET_REQUIRED` refusal shape when the route cannot hold a dispatch-ready target immediately before provider dispatch.
- Call that helper inside `performOutboundAction` after successful resolution and before `providerSelection.adapter.sendSms(...)`.
- Keep provider failure handling unchanged so true provider failures still surface as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`.

**Must hold constant**

- Request-body composer behavior that omits `targetPhone`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `infrastructure/communications/telnyx/index.ts`
- Shared telephony provider interfaces in `domains/communication/telephony/index.ts`

**Stop point**

- Run:
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- Commit checkpoint: route-only hardening is eligible for a standalone commit after the targeted route suite passes.

### Slice 2 - Temporary Handoff Instrumentation and First-Divergence Proof

**Primary goal**: prove where `targetPhone` stays intact or first diverges across the validated runtime boundaries, without widening permanent architecture.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - immediately after `outboundMessageTargetPhone = smsTargetResolution.targetPhone`
  - immediately before `providerSelection.adapter.sendSms(...)`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
  - first line of `sendSms(command)`
- `infrastructure/communications/telnyx/index.ts`
  - first line of `sendSms(command)`
  - immediately before `requestTelnyx(...)` after introducing a local SMS payload variable
  - `catch` path wrapping the real-send portion of `sendSms(command)`

**Required changes**

- Add temporary `console.log` / `console.error` instrumentation only at the six points above, using the validated labels from the handoff notes.
- Do not add logging anywhere else in the route, wrapper, or adapter.
- Reproduce exactly one composer-origin SMS send after rebuilding the ConnectShyft API.
- Compare the same `threadId`, `body`, `providerKey`, and `targetPhone` across the six logs.
- If the first divergence is:
  - **inside the route**: finish the permanent fix in `connectshyft.ts` only.
  - **at `providerRegistry.sendSms()` entry**: apply one narrow permanent pass-through fix in `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts` only.
  - **between Telnyx `sendSms()` entry and payload dispatch**: apply one narrow permanent payload-preservation fix in `infrastructure/communications/telnyx/index.ts` only.
- Do not modify more than the first proven divergent boundary outside the route.

**Must hold constant**

- Provider abstraction shape
- Composer request payload contract
- Frontend source files
- Any unrelated communication cleanup

**Stop point**

- Run:
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`
- Runtime verification checkpoint:
  - rebuild/restart the ConnectShyft API runtime,
  - reproduce one composer send for the known failing thread from the handoff context,
  - capture the six-log chain once.
- Commit checkpoint: do not create a final commit at this stage. If a temporary verification commit is absolutely required for collaboration, it must be short-lived and removed in Slice 3.

### Slice 3 - Regression Coverage and Instrumentation Removal

**Primary goal**: lock the permanent behavior in tests, remove temporary logs, and close the feature with the narrowest code delta proven by Slice 2.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`
- The same source file or files changed in Slice 1 and, if proven necessary, the first divergent boundary from Slice 2

**Required regression additions**

- In `connectshyft.outbound-dispatch.test.ts`:
  - add a composer-style route test that omits `targetPhone`, stubs deterministic neighbor resolution, and asserts successful dispatch with the server-resolved `targetPhone`,
  - add a route-local helper test through the exported `ForTests` seam for the invariant-refusal path,
  - keep the existing provider failure route test and tighten it to assert the provider call still receives a dispatch-ready target before the provider-layer failure is wrapped.
- In `providerRegistry.test.ts`:
  - add a pass-through test using a fake base adapter spy so `sendSms(command)` can be asserted to forward the exact `targetPhone` unchanged.
- In `infrastructure/communications/telnyx/__tests__/index.test.ts`:
  - keep the defensive missing-target validation test passing after any payload-construction refactor introduced by instrumentation or a proven Telnyx-side fix,
  - keep the true provider failure classification tests passing unchanged.
- Remove every temporary instrumentation statement and any verification-only scaffolding before the final test run.

**Final stop point**

- Run:
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
  - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`
  - `rg -n "SMS_TARGET_AFTER_RESOLUTION|SMS_DISPATCH_COMMAND|CONNECTSHYFT_PROVIDER_WRAPPER_SENDSMS|TELNYX_SENDSMS_COMMAND|TELNYX_SENDSMS_REQUEST_PAYLOAD|TELNYX_SENDSMS_ERROR" /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`
- Exit criteria:
  - composer-origin SMS remains server-resolved,
  - no missing-target condition surfaces as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`,
  - `adapter.sendSms()` is never invoked without a dispatch-ready `targetPhone`,
  - true provider failures still surface as provider failures,
  - the `rg` command above returns no matches unless temporary retention was explicitly approved for short-lived verification.

## Smallest Safe First Implementation Slice

Start in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` only:

1. Introduce the route-local dispatch-ready SMS target helper.
2. Wire it into `performOutboundAction` before `adapter.sendSms(...)`.
3. Reuse the existing SMS-target refusal family for invariant failure.
4. Export the helper through a `ForTests` alias so the invariant-refusal path can be tested without inventing a new shared module.

This is the smallest safe starting slice because it fixes the architectural boundary that is non-negotiable even if the later instrumentation proves an additional first-divergence bug in the wrapper or Telnyx adapter.
