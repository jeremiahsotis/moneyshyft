# Implementation Plan: Sender Number Architecture

**Branch**: `026-sender-number-architecture` | **Date**: 2026-03-19 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/spec.md)
**Input**: Feature specification from `/specs/026-sender-number-architecture/spec.md`

## Summary

Centralize ConnectShyft sender-number selection behind a new backend resolver so outbound SMS, inbound SMS alignment, and the partial voice path all use the same tenant-scoped thread-based decision. The design introduces `senderNumberResolver.ts` as a ConnectShyft-lane service, replaces synthetic `sms-inbound:*` and `sms-outbound:*` thread identifiers with real provider-number alignment persisted on the thread, makes `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)` the authoritative validation step, removes synthetic thread derivation from inbound number-mapping fallback, and applies deterministic refusal whenever a thread cannot prove one valid sender number for the requested channel.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, `pg`, Jest/ts-jest, existing ConnectShyft `threads`, `readContracts`, `numberMappings`, `providerCorrelationMappings`, `bridgeSessions`, and inbound voice or SMS modules, shared telephony primitives under `domains/communication`  
**Storage**: Shared PostgreSQL using existing `connectshyft.cs_threads` alignment columns plus existing provider-correlation and canonical-event persistence; no new schema or migration authority planned for this slice  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites for outbound dispatch, inbound webhook correlation, thread persistence/read contracts, bridge or voice behavior, and number-mapping resolution  
**Target Platform**: ConnectShyft API lane behind host-managed Nginx, Dockerized Node runtime with localhost-only binding, shared host-managed PostgreSQL, no public API exposure  
**Project Type**: Monorepo backend lane feature introducing one new lane-local resolver module and updating existing route or module contracts without adding a new deployable service  
**Performance Goals**: No separate performance acceptance target is introduced in this slice.  
**Constraints**: All sender selection must call `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })`; must use `resolveRoutingMappingByNumber(...)`; must not generate synthetic sender identifiers; must not fall back to neighborId or threadId; must refuse when mapping is missing, ambiguous, invalid, or cross-scoped; same thread must keep the same sender number; inbound and outbound must align; voice is partial only; number provisioning, pooling strategy, and regulatory workflows remain out of scope  
**Scale/Scope**: One new `senderNumberResolver.ts` module, one thread-alignment semantics update in existing thread fields, one outbound SMS path change, one inbound SMS correlation or persistence redesign to remove synthetic thread derivation, one partial voice path integration, and focused regression cleanup in existing ConnectShyft route and module tests

## Constitution Check

*GATE: Pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes affect `admin-web`, `admin-api`, or platform-auth ownership.
- **Lane isolation preserved**: Pass. Permanent runtime changes remain inside the ConnectShyft backend lane and existing shared platform modules; no new cross-lane service coupling is introduced.
- **Routing delegation preserved**: Pass. No `/api/v1/auth/*` or `/api/v1/platform/admin/*` ownership changes are in scope, and all modified routes remain ConnectShyft-lane owned.
- **Deployment topology preserved**: Pass. The design changes code and tests only; host-managed Nginx, localhost-only API binding, static frontend serving, and shared Postgres remain unchanged.
- **Database ownership preserved**: Pass. Shared Postgres remains the storage model and no new production migration authority is introduced; the plan reuses existing thread columns instead of adding lane-owned schema.
- **Security boundaries preserved**: Pass. Sender resolution stays tenant-scoped, no public ingress changes are introduced, and no cookie or cross-lane auth behavior changes are needed.
- **Workflow compliance**: Pass. The plan derives directly from the approved `026` spec and the user-supplied implementation boundaries.
- **Acceptance criteria present**: Pass. The plan includes verifiable checks for deterministic sender reuse, inbound/outbound alignment, refusal semantics, unchanged platform routing or topology, and shared-database compatibility.

## Project Structure

### Documentation (this feature)

```text
specs/026-sender-number-architecture/
├── 01-specify.md
├── 02-plan.md
├── 03-tasks.md
├── 04-implement.md
├── 05-testing.md
├── 06-pr-template.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── sender-number-resolution.md
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
│   │   ├── bridgeSessions.test.ts
│   │   ├── inboundVoice.test.ts
│   │   ├── numberMappings.test.ts
│   │   ├── readContracts.test.ts
│   │   ├── threads.contract.test.ts
│   │   └── threads.test.ts
│   ├── bridgeSessions.ts
│   ├── inboundVoice.ts
│   ├── numberMappings.ts
│   ├── readContracts.ts
│   ├── senderNumberResolver.ts
│   └── threads.ts
└── src/routes/api/v1/
    ├── __tests__/
    │   ├── connectshyft.bridge-flow.test.ts
    │   ├── connectshyft.outbound-dispatch.test.ts
    │   ├── connectshyft.provider-registry.dispatch-events.test.ts
    │   └── connectshyft.provider-registry.guardrails.test.ts
    └── connectshyft.ts

apps/admin-api/
└── knexfile.js

nginx/nginx.conf
docker-compose.example.yml
docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

**Structure Decision**: This remains a backend-only ConnectShyft lane feature. The new resolver lives in `apps/connectshyft-api/src/modules/connectshyft`, and the plan reuses existing thread persistence and number-mapping ownership rather than widening into shared provider abstractions or new schema.

## Contract Naming Convention

- Internal service inputs, outputs, and routing metadata use camelCase.
- Existing public HTTP envelope conventions remain unchanged unless a response already exposes snake_case DTO fields.
- `lastInboundCsNumberId` and `preferredOutboundCsNumberId` remain the current storage field names, but the design changes their runtime semantics from synthetic tokens to real sender-alignment values.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Current Context Holders

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - currently owns outbound SMS sender resolution through `resolveConnectShyftSmsSender(...)`, currently falls back to “single active org-unit mapping,” generates `sms-inbound:*` and `sms-outbound:*` thread identifiers during inbound SMS persistence, and synthesizes thread IDs from number mappings during inbound webhook correlation.
- `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`
  - already owns `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)`, which is the mandated mapping lookup for this feature.
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
  - persists `lastInboundCsNumberId` and `preferredOutboundCsNumberId` on `connectshyft.cs_threads`, which is the narrowest existing durable seam for same-thread sender alignment.
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - exposes thread outbound-context hints and currently assumes legacy “cs-number” semantics in seeded records and display helpers.
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
  - already carries `selectedOutboundContactPointId` for outbound bridge behavior, making it the partial voice seam that must use the same sender-number decision.

## Planned Contract Deltas

- Introduce `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts` with:
  - `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })`
  - success output containing `providerNumberE164`, optional `mappingId`, and routing metadata
  - deterministic refusal output for missing alignment, invalid alignment, missing mapping, ambiguous mapping, unsupported channel, or scope mismatch
- Replace outbound SMS route-owned “single active mapping” sender selection with the centralized resolver and preserve explicit sender handoff to provider dispatch.
- Replace inbound SMS persistence of `sms-inbound:*` and `sms-outbound:*` tokens with real provider-number alignment stored on the thread.
- Change inbound number-mapping fallback so `resolveRoutingMappingByNumber(...)` resolves tenant or org-unit scope only and no longer fabricates a synthetic thread ID from the provider number.
- Update partial voice flow so any outbound line selection uses the centralized resolver rather than thread-, neighbor-, or fallback-derived identifiers.
- Update read-contract and seeded-thread helpers so thread number fields and display metadata reflect real sender alignment rather than synthetic “cs-number” placeholders.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/research.md](/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/research.md).
- No unresolved clarification markers remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/data-model.md).
- Boundary contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/contracts/sender-number-resolution.md](/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/contracts/sender-number-resolution.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. The design does not affect `admin-web`, `admin-api`, or shell-auth ownership.
- **Lane isolation preserved**: Pass. The design stays inside ConnectShyft route, thread, bridge, read-contract, and number-mapping modules only.
- **Routing delegation preserved**: Pass. No auth or platform-admin route ownership changes are introduced.
- **Deployment topology preserved**: Pass. Post-implementation validation will reconfirm host Nginx delegation, ConnectShyft API localhost-only binding, and shared Postgres connectivity remain unchanged.
- **Database ownership preserved**: Pass. Existing shared Postgres and current thread columns remain authoritative; no migration or new lane-owned table is required.
- **Security boundaries preserved**: Pass. Tenant scoping remains mandatory for sender resolution and no new ingress or cookie behavior is introduced.
- **Workflow compliance**: Pass. The design slices map directly to the approved `026` spec and the planning input.
- **Acceptance criteria present**: Pass. The design includes verification for same-thread determinism, inbound/outbound alignment, mapping-based refusal semantics, and unchanged Admin, MoneyShyft, and ConnectShyft deployment contracts.

## Implementation Slices

### Slice 1 - Central Resolver and Thread Alignment Semantics

**Primary goal**: introduce `resolveSenderNumber(...)` as the sole sender-selection policy and convert current thread sender fields away from synthetic token semantics.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/threads.contract.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts`

**Required changes**

- Create `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })` in a new ConnectShyft module and make it the only approved sender-selection entrypoint.
- Load thread-alignment data from existing thread persistence and treat only normalized provider-number values as valid sender anchors.
- Validate any candidate sender number by calling `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)`.
- Refuse deterministically when the thread has no aligned provider number, stores a legacy synthetic token, resolves to an inactive or missing mapping, resolves ambiguously, or resolves to another org unit.
- Reuse existing thread fields for durable alignment so repeated sends from the same thread can resolve the same number without adding schema.
- Update seeded read-contract and test-fixture values away from synthetic “cs-number” placeholders where they represent sender alignment.

**Must hold constant**

- No new schema or production migration path.
- No new shared provider abstraction.
- No fallback to neighbor ID, thread ID, random choice, or “single active mapping” heuristics once the centralized resolver is in place.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/threads.test.ts src/modules/connectshyft/__tests__/threads.contract.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts src/modules/connectshyft/__tests__/numberMappings.test.ts`

**Commit checkpoint**

- Safe to commit once resolver behavior is deterministic, thread alignment persists real sender anchors, and no legacy synthetic sender tokens are required for thread reads.

### Slice 2 - Outbound SMS and Inbound SMS Correlation

**Primary goal**: make outbound SMS dispatch and inbound SMS routing depend on the centralized sender resolver and remove synthetic sender identifiers from inbound persistence.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`

**Required changes**

- Replace `resolveConnectShyftSmsSender(...)` with `resolveSenderNumber(...)` for every outbound SMS send path.
- Keep provider dispatch explicit: sender resolution must complete before idempotency summaries, audit summaries, and adapter invocation.
- Remove persistence of `sms-inbound:${...}` and `sms-outbound:${...}` in inbound SMS thread updates and persist the real mapped provider number instead.
- Remove `resolveDeterministicThreadIdForNumberMapping(...)` from inbound number-mapping fallback and redesign number-mapping correlation so it resolves sender scope without fabricating thread IDs.
- Keep inbound neighbor and thread selection on the existing ensured-thread path, then stamp the resolved provider number onto the resulting thread so the next outbound send reuses the same sender.
- Return deterministic business refusals for missing, ambiguous, invalid, or cross-scoped sender mappings and keep provider failures reserved for actual provider execution.

**Must hold constant**

- Existing target-phone resolution behavior.
- Existing provider-correlation behavior when concrete provider identifiers already resolve a thread.
- Existing public request payload shape for outbound message sends and inbound webhooks.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts src/modules/connectshyft/__tests__/inboundSms.test.ts`

**Commit checkpoint**

- Safe to commit once outbound SMS reuses one sender per thread, inbound SMS no longer writes synthetic sender identifiers, and the route-level refusal semantics are stable.

### Slice 3 - Voice Partial Integration and Final Verification

**Primary goal**: apply the same sender-resolution contract to the partial voice path and lock the feature with regression and platform-compatibility checks.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/inboundVoice.test.ts`
- `nginx/nginx.conf`
- `docker-compose.example.yml`
- `apps/connectshyft-api/Dockerfile.production`
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Required changes**

- Route any voice sender-number selection that chooses an outbound ConnectShyft line through `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel: 'voice' })`.
- Reuse the same deterministic refusal semantics for voice when no valid aligned sender number exists.
- Keep intake or voicemail routing logic distinct from sender selection so “voice fallback” events do not create or imply synthetic sender identifiers.
- Ensure bridge-session `selectedOutboundContactPointId` reflects the centralized sender decision instead of raw thread field values or ad hoc fallback.
- Reconfirm that the feature does not alter Nginx delegation, localhost-only API binding, shared Postgres assumptions, or deployment runbook reproducibility.

**Must hold constant**

- No number provisioning or pooling work.
- No cross-lane routing changes.
- No permanent rollback path that re-enables synthetic sender fallback inside the forward design.

**Final stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts src/modules/connectshyft/__tests__/bridgeSessions.test.ts src/modules/connectshyft/__tests__/inboundVoice.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `rg -n "sms-inbound:|sms-outbound:|resolveDeterministicThreadIdForNumberMapping|single_active_org_unit_mapping" /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src`
- `rg -n "connect-api|3002|proxy_pass|postgres|migrate" /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Exit criteria**

- Repeated sender resolution for the same thread returns one stable sender number.
- Inbound SMS persistence stamps the same sender number that outbound resolution later reuses.
- Missing or ambiguous mappings refuse before dispatch.
- Partial voice flow does not invent sender identifiers or borrow fallback sender numbers.
