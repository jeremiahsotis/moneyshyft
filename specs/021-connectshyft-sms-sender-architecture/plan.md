# Implementation Plan: ConnectShyft SMS Sender Architecture

**Branch**: `021-connectshyft-sms-sender-architecture` | **Date**: 2026-03-18 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/spec.md)
**Input**: Feature specification from `/specs/021-connectshyft-sms-sender-architecture/spec.md`

## Summary

Add route-owned outbound SMS sender resolution in the dedicated ConnectShyft API lane, pass the chosen sender explicitly through the shared SMS command into the Telnyx adapter, keep `TELNYX_FROM_NUMBER` as fallback-only adapter behavior, and lock the result with targeted backend regressions. Because the current thread model exposes `preferredOutboundCsNumberId` and labels but no stable direct join to orgUnit number-mapping rows, the narrow design resolves sender ownership only when the active orgUnit has exactly one active mapped number; zero or multiple active mappings refuse before provider dispatch rather than silently choosing a global fallback.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Jest/ts-jest, shared `domains/communication` telephony contracts, ConnectShyft route/module services, Telnyx adapter  
**Storage**: Shared PostgreSQL plus in-memory ConnectShyft thread and number-mapping fixtures in tests  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites in route/provider/adapter/domain files  
**Target Platform**: Dedicated ConnectShyft API lane behind shared host Nginx and Dockerized Node runtime  
**Project Type**: Monorepo backend lane feature with one shared domain contract and one infrastructure adapter touchpoint  
**Performance Goals**: Preserve current target-resolution behavior, add zero extra provider round trips, and keep sender resolution/refusal entirely pre-dispatch  
**Constraints**: Keep scope backend-only and narrow; no voice work; no user-settings work; no neighbor CRUD; no unrelated communications refactor; no provider redesign beyond explicit sender support; different orgUnits must be able to dispatch from different configured numbers; sender must be explicit at provider dispatch; `TELNYX_FROM_NUMBER` must remain fallback-only rather than the normal path  
**Scale/Scope**: One ConnectShyft outbound SMS route, one orgUnit number-mapping service, one shared SMS command type, one provider wrapper, one Telnyx adapter path, and focused route/provider/adapter/domain regression files

## Constitution Check

*GATE: Pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes to `admin-web`, `admin-api`, or auth ownership are planned.
- **Lane isolation preserved**: Pass. Permanent changes stay within `apps/connectshyft-api`, `domains/communication`, and `infrastructure/communications/telnyx`, all on the already-approved ConnectShyft runtime path.
- **Routing delegation preserved**: Pass. No `/api/v1/auth/*` or `/api/v1/platform/admin/*` behavior changes are in scope.
- **Deployment topology preserved**: Pass. No Nginx, Docker binding, port, or static-serving changes are planned.
- **Database ownership preserved**: Pass. No schema or migration work is planned.
- **Security boundaries preserved**: Pass. No public ingress, cookie, or cross-lane access changes are planned.
- **Workflow compliance**: Pass. The plan is derived directly from the `021` spec and narrows implementation to the approved sender-resolution and provider-handoff boundaries.
- **Acceptance criteria present**: Pass. The plan includes build/test stop points plus unchanged routing/topology checks for the wider platform contract.

## Project Structure

### Documentation (this feature)

```text
specs/021-connectshyft-sms-sender-architecture/
├── checklists/
│   └── requirements.md
├── contracts/
│   └── outbound-sms-sender-dispatch.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
apps/connectshyft-api/
├── src/routes/api/v1/
│   ├── __tests__/
│   │   └── connectshyft.outbound-dispatch.test.ts
│   └── connectshyft.ts
└── src/modules/connectshyft/
    ├── __tests__/
    │   └── providerRegistry.test.ts
    ├── numberMappings.ts
    ├── providerRegistry.ts
    ├── readContracts.ts
    └── threads.ts

domains/communication/telephony/
├── __tests__/
│   └── index.test.ts
└── index.ts

infrastructure/communications/telnyx/
├── __tests__/
│   └── index.test.ts
└── index.ts
```

**Structure Decision**: The fix remains backend-only. `threads.ts`, `readContracts.ts`, and `numberMappings.ts` remain the authoritative context sources; the only planned shared-surface changes are the SMS command and replay-key inputs needed to carry explicit sender ownership.

## Current Context Holders

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns request-scoped `tenantId` and `orgUnitId` enforcement, lifecycle context loading, `ConnectShyftThread` construction, current target resolution, and the `adapter.sendSms(...)` call site.
- `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
  - defines the canonical thread model with `lastInboundCsNumberId` and `preferredOutboundCsNumberId`.
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - exposes `preferredOutboundLabel` and `preferredOutboundContext`, which are the only current read-model hints about outbound line ownership.
- `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`
  - owns orgUnit-scoped active mapped numbers through `listMappings(...)`, `findMappingByTenantNumber(...)`, and `resolveRoutingMappingByNumber(...)`.

## Planned Contract Deltas

- `domains/communication/telephony/index.ts`
  - add `senderPhone?: string` to `TelephonySendSmsCommand`
  - add `senderPhone?: string | null` to `TelephonyDispatchReplayKeyInput`
  - include `senderPhone` in the replay-key fingerprint so idempotency reflects the true outbound SMS payload
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
  - keep the wrapper as a transparent pass-through and forward `senderPhone` unchanged
- `infrastructure/communications/telnyx/index.ts`
  - update `buildSmsPayload(...)` to prefer `command.senderPhone`, then `TELNYX_FROM_NUMBER`, then the existing messaging-profile fallback
  - leave call payload behavior unchanged

## Complexity Tracking

No constitution exceptions are required for this feature.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/research.md](/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/data-model.md).
- Boundary contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/contracts/outbound-sms-sender-dispatch.md](/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/contracts/outbound-sms-sender-dispatch.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/021-connectshyft-sms-sender-architecture/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. Design leaves shell and auth ownership untouched.
- **Lane isolation preserved**: Pass. Design stays inside the ConnectShyft backend lane, one shared telephony contract, and one existing provider adapter.
- **Routing delegation preserved**: Pass. No routing changes are introduced.
- **Deployment topology preserved**: Pass. Design uses code and test changes only.
- **Database ownership preserved**: Pass. Design introduces no migration or schema work.
- **Security boundaries preserved**: Pass. No ingress, cookie, or cross-lane access changes are introduced.
- **Workflow compliance**: Pass. Slice order and stop points map directly to the `021` spec.
- **Acceptance criteria present**: Pass. The design includes targeted backend verification plus unchanged platform-compatibility checks.

## Implementation Slices

### Slice 1 - Sender-Number Domain Resolution

**Primary goal**: resolve sender ownership from current ConnectShyft domain state in the existing outbound SMS route before replay-key construction, idempotency persistence, and provider dispatch.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- Context reference only, unless a narrow helper extraction becomes unavoidable:
  - `apps/connectshyft-api/src/modules/connectshyft/threads.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts`

**Required changes**

- Add a route-local `resolveConnectShyftSmsSender(...)` helper and export it through a `ForTests` alias.
- Keep sender ownership in the existing route branch that already resolves `targetPhone`, builds the replay key, persists idempotency summaries, and calls `providerSelection.adapter.sendSms(...)`.
- Resolve sender ownership from:
  - active `tenantId` and `orgUnitId`
  - current `ConnectShyftThread`
  - active orgUnit number mappings from `connectShyftNumberMappingServiceAsync.listMappings(...)`
- Use the narrow deterministic rule:
  - exactly one active orgUnit mapping => resolved sender
  - zero active mappings => sender-required refusal
  - multiple active mappings => sender-ambiguous refusal
- Preserve `thread.preferredOutboundCsNumberId`, `lastInboundCsNumberId`, and any available preferred-outbound label in sender-resolution metadata, but do not invent a synthetic join between those fields and number-mapping rows.
- Keep target-resolution behavior unchanged.
- Introduce sender-specific business refusals before provider dispatch so sender failures do not masquerade as target failures or provider failures.

**Must hold constant**

- `resolveConnectShyftSmsTarget(...)` behavior and acceptance ordering
- Voice call route behavior
- Neighbor CRUD and user-settings surfaces
- Any fallback that would let the normal route path skip explicit sender resolution

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`

**Commit checkpoint**

- Safe to commit once sender resolution is route-owned, target behavior is unchanged, and the focused route suite passes.

### Slice 2 - Adapter Contract + Telnyx Payload

**Primary goal**: make explicit sender ownership legal at the shared SMS command boundary and pass the route-resolved sender unchanged into provider dispatch.

**Exact file targets**

- `domains/communication/telephony/index.ts`
- `domains/communication/telephony/__tests__/index.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/index.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`

**Required changes**

- Add `senderPhone` to `TelephonySendSmsCommand` only; do not widen call contracts.
- Add `senderPhone` to `TelephonyDispatchReplayKeyInput` and the replay-key fingerprint.
- Pass `senderPhone` into `buildTelephonyDispatchReplayKey(...)`, outbound request summaries, and `providerSelection.adapter.sendSms(...)` in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- Keep `providerRegistry.sendSms(command)` as a transparent pass-through and add an assertion that `senderPhone` survives unchanged.
- Update Telnyx SMS payload construction to use `command.senderPhone` first, `TELNYX_FROM_NUMBER` second, and the current messaging-profile fallback third.
- Leave outbound call handling unchanged.

**Must hold constant**

- Voice and bridge dispatch contracts
- Frontend request shape
- Sender-resolution refusal semantics introduced in Slice 1

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand ../../domains/communication/telephony/__tests__/index.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Commit checkpoint**

- Safe to commit once explicit sender reaches the provider boundary, Telnyx precedence is fixed, and the route plus shared-contract suites pass together.

### Slice 3 - Regression Coverage and Final Verification

**Primary goal**: lock orgUnit-specific sender behavior, fallback-only adapter behavior, and honest provider failure semantics in focused backend regressions.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `domains/communication/telephony/__tests__/index.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`
- `nginx/nginx.conf`
- `docker-compose.example.yml`
- `apps/connectshyft-api/Dockerfile.production`
- `apps/connectshyft-api/src/config/knex.ts`
- `apps/connectshyft-api/.env.example`
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- whichever production files were permanently changed in Slices 1 and 2

**Required regression additions**

- In `connectshyft.outbound-dispatch.test.ts`:
  - add an orgUnit-specific success-path test that proves two orgUnits can dispatch with different configured senders
  - add sender-required and sender-ambiguous refusal tests
  - keep the existing target-resolution success path intact
  - keep provider-failure coverage and tighten it to assert the provider receives both sender and target before failure wrapping
- In `providerRegistry.test.ts`:
  - add a pass-through assertion for `senderPhone`
- In `domains/communication/telephony/__tests__/index.test.ts`:
  - prove replay keys change when sender changes
- In `infrastructure/communications/telnyx/__tests__/index.test.ts`:
  - add explicit-sender precedence coverage
  - add fallback-only behavior coverage when sender is omitted and `TELNYX_FROM_NUMBER` is configured
  - keep the defensive missing-target guard and provider-failure classification tests passing
- In `nginx/nginx.conf`, `docker-compose.example.yml`, `apps/connectshyft-api/Dockerfile.production`, `apps/connectshyft-api/src/config/knex.ts`, `apps/connectshyft-api/.env.example`, and `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`:
  - validate that the sender-number slice changes do not alter routing delegation, localhost-only binding assumptions, shared Postgres ownership/connectivity expectations, or runbook reproducibility requirements

**Final stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand ../../domains/communication/telephony/__tests__/index.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`
- `rg -n "senderPhone|TELNYX_FROM_NUMBER" /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts /Users/jeremiahotis/projects/connectshyft/domains/communication/telephony/index.ts /Users/jeremiahotis/projects/connectshyft/infrastructure/communications/telnyx/index.ts`
- `rg -n "connect-api|3002|proxy_pass|postgres|knex|migrate" /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/.env.example /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Exit criteria**

- The normal ConnectShyft outbound SMS path reaches provider dispatch with both sender and target explicitly present.
- Different orgUnits can dispatch from different configured numbers.
- `TELNYX_FROM_NUMBER` is never the primary source of sender ownership for the normal ConnectShyft path.
- Missing or ambiguous sender ownership refuses before provider dispatch.
- True provider failures still surface as provider failures.

## Smallest Safe First Implementation Slice

Start with route-owned sender resolution in the existing outbound SMS path:

1. Add `resolveConnectShyftSmsSender(...)` beside the existing SMS target helpers in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
2. Resolve sender from current `tenantId`, `orgUnitId`, `thread`, and active orgUnit number mappings using the deterministic one-active-mapping rule.
3. Refuse before provider dispatch when sender ownership is missing or ambiguous.
4. Keep `resolveConnectShyftSmsTarget(...)` and current target handoff behavior unchanged.

This is the smallest safe first slice because the current route already owns target resolution, replay-key construction, idempotency summaries, and the `sendSms(...)` call site; adding sender ownership there first establishes the correct domain boundary before shared contract work lands.
