# Implementation Plan: ConnectShyft Master Debugging

**Branch**: `019-connectshyft-master-debugging` | **Date**: 2026-03-17 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/spec.md)
**Input**: Feature specification from `/specs/019-connectshyft-master-debugging/spec.md`

## Summary

Implement the locked ConnectShyft debugging sequence as three mergeable patches inside the dedicated ConnectShyft runtime only. Patch 1 restores canonical texting preference persistence and display, Patch 2 preserves refusal semantics through the frontend action and rendering path without changing the HTTP-200 envelope, and Patch 3 adds deterministic SMS target resolution behind the existing outbound action flow with explicit request target precedence while keeping provider and envelope layers unchanged.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20, Vue 3 SFCs  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, Vue Router, Axios, shared `libs/platform` envelope helpers, shared `domains/communication` telephony contracts  
**Storage**: Shared PostgreSQL plus in-memory ConnectShyft stores and test fixtures  
**Testing**: Jest/ts-jest module and route tests in `apps/connectshyft-api`, `npm run build` in `apps/connectshyft-web`, targeted manual UI verification for ConnectShyft inbox, thread detail, directory, and neighbor views  
**Target Platform**: Dedicated ConnectShyft SPA and ConnectShyft API running inside the shared host Nginx and Dockerized Node topology  
**Project Type**: Monorepo full-stack web application lane  
**Performance Goals**: Preserve existing operator-visible response characteristics and avoid additional provider round trips or refusal-envelope churn  
**Constraints**: Locked three-patch order; ConnectShyft lane only; no mega-patch; no lane-convergence refactor; no provider redesign; no API envelope redesign; hold `providerRegistry` and shared refusal builders constant  
**Scale/Scope**: ConnectShyft neighbor create/profile/directory/snapshot flows, thread action wrappers, inbox/thread-detail refusal surfaces, and outbound SMS target resolution in the existing lane runtime

## Constitution Check

*GATE: Pass before Phase 0 research. Re-checked after Phase 1 design.*

- **Platform shell authority**: Pass. No changes to `admin-web`, `admin-api`, auth authority, or shared shell behavior are planned.
- **Lane isolation preserved**: Pass. All planned code changes stay in `apps/connectshyft-web`, `apps/connectshyft-api`, or narrow shared helpers already used by ConnectShyft.
- **Routing delegation preserved**: Pass. No `/api/v1/auth/*` or `/api/v1/platform/admin/*` routing changes are in scope.
- **Deployment topology preserved**: Pass. No Nginx, Docker binding, or static-serving behavior changes are planned.
- **Database ownership preserved**: Pass. No migration authority or cross-lane schema ownership changes are planned.
- **Security boundaries preserved**: Pass. No public port exposure, cookie-scope change, or ingress change is in scope.
- **Workflow compliance**: Pass. This plan is derived directly from the locked spec, prior master-debugging artifacts, and inspected runtime files.
- **Acceptance criteria present**: Pass. The plan defines per-patch and cross-patch verification without altering Admin or MoneyShyft deployment behavior.

## Project Structure

### Documentation (this feature)

```text
specs/019-connectshyft-master-debugging/
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── patch-1-texting-preference.md
│   ├── patch-2-refusal-rendering.md
│   └── patch-3-sms-target-resolution.md
├── bootstrap-prompts.md
├── data-model.md
├── implementation-checklist.md
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
│   │   ├── neighbors.test.ts
│   │   └── smsPreferenceOverrides.test.ts
│   ├── neighbors.ts
│   ├── providerRegistry.ts
│   └── smsPreferenceOverrides.ts
├── src/platform/envelopes/response.ts
└── src/routes/api/v1/
    ├── __tests__/connectshyft.outbound-dispatch.test.ts
    └── connectshyft.ts

apps/connectshyft-web/
├── src/components/connectshyft/ConnectShyftNeighborSnapshot.vue
├── src/features/connectshyft/
│   ├── neighbors.ts
│   ├── presentation.ts
│   ├── threads.ts
│   └── uiContracts.ts
├── src/router/index.ts
└── src/views/ConnectShyft/
    ├── ConnectShyftInboxView.vue
    ├── ConnectShyftNeighborCreateView.vue
    ├── ConnectShyftNeighborProfileView.vue
    └── ConnectShyftThreadDetailView.vue

domains/communication/telephony/index.ts
libs/platform/src/envelopes/response.ts
```

**Structure Decision**: The implementation stays inside the dedicated ConnectShyft lane runtime, with narrow shared-helper adjustments only where the existing runtime already depends on them.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/research.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/data-model.md).
- Patch contracts are captured in [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-1-texting-preference.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-1-texting-preference.md), [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-2-refusal-rendering.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-2-refusal-rendering.md), and [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-3-sms-target-resolution.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/contracts/patch-3-sms-target-resolution.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/019-connectshyft-master-debugging/quickstart.md).

## Phased Patch Plan

### Patch 1 - Texting Preference Persistence and Display

**Primary goal**: restore canonical `prefersTexting` capture, persistence, serialization, and display, with new neighbors defaulting to `YES`.

**Exact file and function boundaries**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `parseNeighborCreateBody`
  - `parseNeighborUpdateBody`
  - POST neighbor handler
  - PUT neighbor handler
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `updateNeighborWithSideEffects`
  - any route-local neighbor create and update command forwarding that currently drops `prefersTexting`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - `mapRowsToNeighbor`
  - create and update input types for store and service layers
  - in-memory `createNeighbor` and `updateNeighbor`
  - Knex `createNeighbor` and `updateNeighbor`
  - sync service `createNeighbor` and `updateNeighbor`
  - async service `createNeighbor` and `updateNeighbor`
- Required cross-phase bridge alignment: `apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts`
  - `AsyncConnectShyftSmsPreferenceOverrideService.resolvePreference`
  - neighbor-record canonical preference is authoritative when a durable neighbor can be resolved
- Verification-only consumers unless wire-format alignment is required:
  - `apps/connectshyft-web/src/features/connectshyft/neighbors.ts`
  - `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
  - `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
  - `apps/connectshyft-web/src/components/connectshyft/ConnectShyftNeighborSnapshot.vue`
  - `apps/connectshyft-web/src/features/connectshyft/presentation.ts`

**Must hold constant**

- `apps/connectshyft-web/src/features/connectshyft/threads.ts`
- `apps/connectshyft-api/src/platform/envelopes/response.ts`
- `libs/platform/src/envelopes/response.ts`
- SMS target selection logic in `performOutboundAction`

**Merge boundary**

- Mergeable once API persistence is canonical, returned values round-trip correctly, display surfaces confirm the saved canonical value, and SMS gating reads the same authoritative canonical value without widening target-selection scope.

### Patch 2 - Refusal Rendering

**Primary goal**: preserve and render refusal semantics in shared thread actions and inbox UI without changing the backend envelope contract.

**Exact file and function boundaries**

- `apps/connectshyft-web/src/features/connectshyft/threads.ts`
  - `ConnectShyftEnvelope`
  - `ConnectShyftThreadActionResult`
  - `parseRefusalMessage`
  - `parseActionSuccessMessage`
  - `executeConnectShyftThreadAction`
  - `dispatchConnectShyftThreadCall`
  - `dispatchConnectShyftThreadMessage`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - refusal banner state
  - send-message submit handler
  - call submit handler
  - accessible refusal announcement copy
- Optional alignment only if necessary:
  - `apps/connectshyft-web/src/features/connectshyft/uiContracts.ts`
  - `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

**Must hold constant**

- `apps/connectshyft-api/src/platform/envelopes/response.ts`
- `libs/platform/src/envelopes/response.ts`
- refusal builders and HTTP-200 refusal semantics in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- texting preference persistence rules
- SMS target resolution rules

**Merge boundary**

- Mergeable once the inbox path preserves refusal code, message, and structured data, keeps transport failures distinct from business refusals, and a focused wrapper-level assertion or fixture comparison confirms `threads.ts` does not flatten refusal data needed by Patch 3.

### Patch 3 - SMS Target Resolution

**Primary goal**: add deterministic SMS target resolution behind the existing outbound message flow and refuse before provider dispatch when targeting is not deterministic.

**Exact file and function boundaries**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `performOutboundAction`
  - outbound message target-selection block
  - `parseOutboundMessagePolicyRequest` only if normalization must change
  - `buildSyntheticThread` only if existing runtime thread context already exposes target-relevant metadata that must be preserved without creating new thread-target architecture
  - `buildThreadFromDetailRecord` only if existing runtime thread context already exposes target-relevant metadata that must be preserved without creating new thread-target architecture
  - `resolveNeighborIdForThreadCorrelation` only if target context must tighten neighbor lookup
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - `inboxActionPhoneOptions`
  - `applyDefaultDispatchPhone`
  - explicit phone selection used by message and call submit handlers
- `apps/connectshyft-web/src/features/connectshyft/threads.ts`
  - consume refusal result shape already established in Patch 2 without redefining it

**Must hold constant**

- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/platform/envelopes/response.ts`
- `libs/platform/src/envelopes/response.ts`
- provider adapter contract in `domains/communication/telephony/index.ts`
- outbound call target fallback in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

**Merge boundary**

- Mergeable once SMS uses the locked target order of explicit request target, primary active valid phone, only active valid phone if exactly one exists, else refusal, ambiguous or missing targets refuse before provider dispatch, inbox explicit-phone UI can no longer offer unrelated neighbor phones, and the call path remains unchanged.

## Cross-Patch Dependency Notes

- Patch 1 must land before Patch 3 because SMS policy gating depends on the same canonical texting preference that persistence and display expose.
- `smsPreferenceOverrides` is the only allowed bridge between Patch 1 and Patch 3; no other helper or serializer may widen into shared cleanup, and neighbor-record state is authoritative when durable preference data is available.
- Patch 2 must land before Patch 3 because target-resolution refusals must already render correctly in inbox action flows.
- The thread action and result shape in `apps/connectshyft-web/src/features/connectshyft/threads.ts` is the only allowed bridge between Patch 2 and Patch 3.
- `providerRegistry` and the shared refusal-envelope builders remain fixed across all three patches.
- Patch 3 in the current runtime treats explicit outbound request target as the first target-resolution step; it does not authorize a new thread-target architecture.
- Outbound call fallback remains out of scope for this debugging sequence and must remain behaviorally unchanged.
- No patch may move behavior into `apps/moneyshyft-*`, alter routing delegation, or introduce lane-convergence remediation.

## Regression Checkpoints

- After Patch 1, new neighbors default to `YES`, updates across `YES|NO|UNKNOWN` round-trip, and profile plus snapshot displays match the saved canonical value.
- Before Patch 2 starts, outbound behavior remains unchanged except for the allowed texting-preference source-of-truth alignment.
- After Patch 2, HTTP 200 with `ok: false` renders as a refusal in inbox and thread detail, while transport failures still render separately.
- Before Patch 3 starts, inbox action results preserve refusal code, message, and structured data needed by new target-resolution refusals, validated by a focused wrapper-level assertion or fixture comparison.
- After Patch 3, outbound SMS honors this order: explicit outbound request target, then primary active valid phone, then only active valid phone if exactly one, else refusal.
- After Patch 3, ambiguous or missing targets refuse before provider dispatch and do not collapse into generic provider failure.
- After Patch 3, preview-composer send, modal send, and implicit thread-detail SMS send all honor the same target-resolution behavior while outbound call fallback remains unchanged.
- Final regression pass confirms trustworthy texting state, visible refusal state, and deterministic SMS behavior together.

## Recommended Test Order

1. Extend and run `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` for Patch 1 create, update, default, and serializer round-trip behavior.
2. Extend and run `apps/connectshyft-api/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts` for the required Patch 1 to Patch 3 bridge alignment so SMS gating follows the authoritative durable neighbor preference.
3. Run `npm run build` in `apps/connectshyft-web` and manually verify neighbor create, profile edit, directory or snapshot display flows for Patch 1.
4. Extend shared thread-action coverage in `apps/connectshyft-web` through a focused refusal-shape assertion or fixture comparison in `threads.ts`, then manually verify inbox and thread-detail refusal checks for Patch 2 and run `npm run build` in `apps/connectshyft-web`.
5. Extend and run `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts` for Patch 3 deterministic target selection and refusal-before-provider cases using explicit outbound request target precedence.
6. Manually verify inbox explicit-phone options, preview-composer send, modal send, implicit thread-detail SMS send, and unchanged outbound call behavior after Patch 3.
7. Run a final `npm test` in `apps/connectshyft-api`, `npm run build` in `apps/connectshyft-web`, and a cross-phase manual smoke pass covering all three user stories.

## Smallest Safe First Implementation Slice

Start with the backend half of Patch 1 only:

1. Update `parseNeighborCreateBody` and `parseNeighborUpdateBody` to accept canonical `prefersTexting`.
2. Thread that value through route-local forwarding, including `updateNeighborWithSideEffects`, and through the neighbor create and update service and store inputs in `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`.
3. Change new-neighbor default persistence from `UNKNOWN` to `YES` and persist explicit updates instead of dropping them.
4. Align `smsPreferenceOverrides` so durable neighbor-record preference remains authoritative for SMS gating when available.
5. Verify existing web create and profile views already send the canonical value before touching any UI logic.

This slice is the smallest safe entry point because it fixes the actual data-loss defect without entangling refusal rendering or SMS target selection.

## Post-Design Constitution Check

- **Platform shell authority**: Pass after design. No admin-shell changes are introduced.
- **Lane isolation preserved**: Pass after design. All planned edits remain inside ConnectShyft lane files plus narrow shared helpers already in path.
- **Routing delegation preserved**: Pass after design. No delegation or route ownership changes are proposed.
- **Deployment topology preserved**: Pass after design. No infrastructure or deployment changes are proposed.
- **Database ownership preserved**: Pass after design. No migration-authority or shared-schema ownership changes are proposed.
- **Security boundaries preserved**: Pass after design. No ingress or cookie changes are proposed.
- **Workflow compliance**: Pass after design. Research, data model, contracts, and quickstart are generated under the locked feature folder.
- **Acceptance criteria present**: Pass after design. The plan includes per-patch and cross-patch verification gates aligned with the spec.
