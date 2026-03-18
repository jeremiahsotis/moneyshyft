# Implementation Plan: ConnectShyft Inbound SMS Identity Resolution and Raw Body Capture

**Branch**: `022-inbound-sms-identity-resolution-and-raw-body-capture` | **Date**: 2026-03-18 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/spec.md)
**Input**: Feature specification from `/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/spec.md`

## Summary

Add exact-request raw-body capture to the ConnectShyft JSON parser, introduce a replaceable inbound subject-resolution boundary backed by the existing phone identity boundary, move inbound-created neighbor and texting-preference mutations behind neighbor service methods, and replace the current metadata-or-correlation-only inbound SMS refusal path with the approved deterministic chain: explicit metadata, thread correlation, phone resolution, then new-neighbor creation. The current route already attempts signature validation with `req.rawBody`, but both the runtime app and the route integration test harness install plain `express.json()` and therefore discard the original request bytes. The current inbound SMS branch also stops at `CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED` once payload aliases and thread correlation fail; this plan closes that production gap without widening into merge tooling, sender-number work, or UI changes.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Jest/ts-jest, Supertest, shared `domains/communication` phone normalization and telephony contracts, ConnectShyft provider registry, ConnectShyft identity boundary, existing communication audit log  
**Storage**: Shared PostgreSQL `connectshyft` schema, existing communication audit log persistence, in-memory ConnectShyft fixtures in tests, and shared migration authority if a narrow neighbor lifecycle marker is required for deleted-record exclusion  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites in route/module/provider/migration files  
**Target Platform**: Dedicated ConnectShyft API lane behind shared host Nginx and Dockerized Node runtime  
**Project Type**: Monorepo backend lane feature with webhook ingress, route/domain modules, shared persistence, and integration test harnesses  
**Performance Goals**: Keep signature validation pre-side-effect, preserve current webhook processing throughput, keep inbound identity resolution deterministic in one request, and avoid any additional provider round trips  
**Constraints**: Preserve exact request bytes for signature verification; no direct DB logic in the route; resolution order is fixed to metadata, thread, phone, create; no silent fallbacks or heuristic guessing; do not override explicit `YES` or `NO`; keep the phone resolver replaceable for future PeopleCore adoption; preserve shared-Postgres compatibility and `admin-api` production migration ownership if lifecycle state must be surfaced  
**Scale/Scope**: One Express middleware path, one inbound webhook route block, one new identity resolver module, one neighbor service extension, one audit-log reuse path, one route integration test harness, and focused route/module/provider/migration regression suites

## Constitution Check

*GATE: Pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes to `admin-web`, `admin-api`, shared auth ownership, or shell routing are planned.
- **Lane isolation preserved**: Pass. Permanent runtime changes stay within `apps/connectshyft-api` plus approved shared contracts and, if needed, shared migration authority for a ConnectShyft-owned lifecycle field.
- **Routing delegation preserved**: Pass. `/api/v1/connectshyft/webhooks/inbound` remains ConnectShyft-lane-owned; `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain untouched.
- **Deployment topology preserved**: Pass. The plan changes parser configuration and backend logic only; no Nginx, port, Docker binding, or static-serving changes are introduced.
- **Database ownership preserved**: Pass. Shared Postgres remains the storage model, and any lifecycle-state schema addition required for deleted-neighbor exclusion must land through shared migration authority while `admin-api` remains the sole production migration executor.
- **Security boundaries preserved**: Pass. Raw-body capture strengthens webhook authenticity validation and does not expose new ingress or cross-lane surface area.
- **Workflow compliance**: Pass. The plan is derived directly from the approved `022` spec and limits implementation to the approved resolver, webhook, and neighbor boundaries.
- **Acceptance criteria present**: Pass. The plan includes build/test stop points, webhook authenticity regressions, neighbor-resolution regressions, and unchanged platform-contract verification.

## Project Structure

### Documentation (this feature)

```text
specs/022-inbound-sms-identity-resolution-and-raw-body-capture/
├── checklists/
│   └── requirements.md
├── contracts/
│   └── inbound-sms-identity-resolution.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
apps/connectshyft-api/
├── src/
│   ├── app.ts
│   ├── migrations/
│   │   └── __tests__/
│   │       └── connectShyftNeighborsMigration.test.ts
│   ├── modules/connectshyft/
│   │   ├── __tests__/
│   │   │   ├── identityBoundary.test.ts
│   │   │   ├── identityResolver.test.ts
│   │   │   ├── neighbors.test.ts
│   │   │   └── providerRegistry.test.ts
│   │   ├── communicationAuditLog.ts
│   │   ├── identityBoundary.ts
│   │   ├── identityResolver.ts
│   │   ├── inboundSms.ts
│   │   └── neighbors.ts
│   └── routes/api/v1/
│       ├── __tests__/
│       │   ├── connectshyft.bridge-flow.test.ts
│       │   ├── connectshyft.identity-match.test.ts
│       │   ├── connectshyft.provider-registry.dispatch-events.test.ts
│       │   ├── connectshyft.provider-registry.guardrails.test.ts
│       │   └── connectshyft.provider-registry.test.shared.ts
│       └── connectshyft.ts
├── Dockerfile.production
└── src/config/knex.ts

shared/database/migrations/
└── *_connectshyft_neighbor_lifecycle*.ts   # only if deleted-neighbor lifecycle state must be added

infrastructure/communications/telnyx/
└── __tests__/
    └── index.test.ts

nginx/nginx.conf
docker-compose.example.yml
docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

**Structure Decision**: This is a backend-only ConnectShyft lane feature. The route remains the owner of ordered inbound SMS resolution, but all neighbor persistence and phone-match semantics move behind modules in `apps/connectshyft-api/src/modules/connectshyft`. The only new internal boundary is `identityResolver.ts`. The provider-registry route integration harness must mirror the app parser change because it constructs its own `express()` app instead of importing `src/app.ts`. If deleted-neighbor lifecycle state is not already available in production persistence, the smallest compatible schema addition must live under shared migration authority rather than route logic.

## Current Context Holders

- `apps/connectshyft-api/src/app.ts`: installs plain `express.json()` and drops the raw JSON bytes required by provider signature validation.
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`: validates webhook signatures, resolves inbound correlation, extracts optional payload `neighborId`, and then hard-fails `CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED` when metadata plus correlation do not produce a neighbor.
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`: owns inbound SMS payload extraction helpers, including alias-based `neighborId` extraction and canonical inbound SMS event mapping.
- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`: already normalizes phone input and returns deterministic `NO_MATCH`, `NO_AUTO_MERGE`, and `AMBIGUOUS` outcomes over tenant-scoped exact phone matches.
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`: already owns phone normalization, create/update persistence, and async identity-boundary evaluation, but normal create defaults `prefersTexting` to `YES`, which is wrong for inbound-created neighbors in this feature.
- `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`: already exposes a reusable audit append surface for ConnectShyft business-side effects.
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`: builds a standalone `express()` app with plain `express.json()`, so webhook route integration tests would otherwise miss raw-body regressions.
- `apps/connectshyft-api/src/migrations/20260224113000_create_connectshyft_neighbors.ts`: defines `cs_neighbors` without an explicit soft-delete marker, so deleted-neighbor exclusion must be surfaced from an existing lifecycle field or introduced through a narrow shared-schema addition if production behavior truly needs deleted-row matching protection.

## Planned Contract Deltas

- Capture `req.rawBody` during JSON parsing in both the runtime app and the route integration test harness so webhook signature verification always uses the exact received request bytes.
- Add a new internal resolver boundary in `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`:
  - `resolveSubjectByContactPoint({ tenantId, orgUnitId, contactPoint })`
  - current local adapter delegates to the async identity boundary and converts exact-match outcomes into `single_match`, `no_match`, or `multiple_matches`
  - `orgUnitId` remains part of the contract even when the local adapter only needs tenant-scoped phone matching, preserving PeopleCore compatibility
- Add inbound-specific neighbor service methods in `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`:
  - `createNeighborFromInbound(...)` creates a minimal active neighbor with `prefersTexting: 'UNKNOWN'`, one primary active valid phone, and audit side effects
  - `applyInboundSmsTextingPreference(...)` promotes `UNKNOWN -> YES` only and leaves `YES` or `NO` unchanged
- Replace the current inbound SMS `neighbor_unresolved` branch with the approved deterministic chain:
  - explicit webhook metadata
  - thread correlation
  - `resolveSubjectByContactPoint(...)`
  - `createNeighborFromInbound(...)`
- Preserve existing `IDENTITY_MATCH_AMBIGUOUS` semantics for multiple phone matches and refuse before creating a new neighbor.
- If deleted-neighbor lifecycle state is not already queryable, add the minimum shared-schema support required to exclude soft-deleted rows from explicit neighbor reuse and phone resolution without resurrecting them.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/research.md](/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/data-model.md).
- Boundary contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/contracts/inbound-sms-identity-resolution.md](/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/contracts/inbound-sms-identity-resolution.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/022-inbound-sms-identity-resolution-and-raw-body-capture/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. Design leaves shell, auth ownership, and cross-lane cookie behavior untouched.
- **Lane isolation preserved**: Pass. Design stays inside the ConnectShyft backend lane, existing shared communication contracts, and shared migration authority only if a ConnectShyft lifecycle marker must be surfaced.
- **Routing delegation preserved**: Pass. No auth or platform-admin routing behavior changes are introduced.
- **Deployment topology preserved**: Pass. Design changes parser configuration, route logic, neighbor services, and tests only.
- **Database ownership preserved**: Pass. Shared Postgres compatibility remains intact, and any lifecycle-state schema work remains under shared migration authority with `admin-api` still the only authorized production executor.
- **Security boundaries preserved**: Pass. Raw-body capture improves signature verification and does not widen ingress or public port exposure.
- **Workflow compliance**: Pass. Slice order and stop points map directly to the `022` spec.
- **Acceptance criteria present**: Pass. The design includes webhook authenticity validation, deterministic neighbor-resolution validation, texting-preference protection, and unchanged topology verification.

## Implementation Slices

### Slice 1 - Exact Request Raw Body Capture

**Primary goal**: make signed webhook verification use the exact JSON request bytes in both runtime and route integration tests before any identity-resolution changes land.

**Exact file targets**

- `apps/connectshyft-api/src/app.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`

**Required changes**

- Replace plain `express.json()` with `express.json({ verify })` and attach `rawBody` to the request object without changing the rest of the middleware order.
- Mirror the same parser behavior in the route integration harness so signed webhook tests exercise the real runtime contract.
- Add or tighten regressions that prove valid signed webhook requests still pass and tampered or unverifiable requests still fail before any receipt or timeline side effects.

**Must hold constant**

- `express.urlencoded(...)`, cookie parsing, auth/context middleware ordering, and webhook route ownership
- existing provider adapter verification semantics

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Commit checkpoint**

- Safe to commit once runtime and test-harness raw-body capture are aligned and signed webhook regressions still pass.

### Slice 2 - Replaceable Subject Resolver and Inbound Neighbor Service Methods

**Primary goal**: move phone-based subject resolution and inbound-specific neighbor mutations behind replaceable service boundaries so the route remains deterministic and DB-free.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `shared/database/migrations/*_connectshyft_neighbor_lifecycle*.ts` only if deleted-neighbor lifecycle state must be added
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts` only if deleted-neighbor lifecycle state must be added

**Reference-only context holders**

- `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`

**Required changes**

- Introduce `resolveSubjectByContactPoint({ tenantId, orgUnitId, contactPoint })` with current local implementation backed by the async identity boundary.
- Map identity-boundary outcomes by unique match count:
  - one matched neighbor becomes `single_match` even when auto-merge is not allowed
  - zero matches become `no_match`
  - ambiguous outcomes become `multiple_matches`
- Ensure cross-tenant-only phone hits remain `no_match` for the current tenant instead of resolving through other-tenant records.
- Add `createNeighborFromInbound(...)` that reuses neighbor normalization, creates a minimal profile, preserves the sender phone as the primary active valid phone, sets `prefersTexting` to `UNKNOWN`, and appends a neighbor-creation audit record.
- Add `applyInboundSmsTextingPreference(...)` that upgrades `UNKNOWN` to `YES` and never overrides `YES` or `NO`.
- Surface deleted-neighbor lifecycle state into resolver and explicit neighbor reads. If the active schema truly lacks that state, add the smallest shared-schema column needed to filter deleted neighbors deterministically instead of inferring from other fields.

**Must hold constant**

- existing identity-match endpoint semantics for `IDENTITY_MATCH_AMBIGUOUS`
- generic neighbor create/update behavior outside inbound-specific entry points
- audit-log repository shape and existing communication audit semantics

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/identityBoundary.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`

**Commit checkpoint**

- Safe to commit once the resolver boundary is stable, inbound-specific neighbor creation keeps `UNKNOWN`, ambiguous phone matches refuse cleanly, and unit/route identity suites pass together.

### Slice 3 - Ordered Inbound Webhook Resolution and Final Verification

**Primary goal**: replace the current correlation-only inbound SMS failure path with the approved ordered chain and prove the fix without regressing signature validation or texting-preference integrity.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- any Slice 1 or Slice 2 files that need final regression tightening
- verification-only platform contract files:
  - `nginx/nginx.conf`
  - `docker-compose.example.yml`
  - `apps/connectshyft-api/Dockerfile.production`
  - `apps/connectshyft-api/src/config/knex.ts`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Required changes**

- Keep signature validation and correlation resolution first.
- After payload neighbor extraction and thread correlation are known, evaluate the deterministic chain:
  - extract only the canonical `neighborId` field for explicit metadata resolution; if it is absent, continue to thread correlation without interpreting alias keys
  - explicit metadata neighbor when active and reusable
  - correlated thread neighbor when active and reusable
  - `resolveSubjectByContactPoint(...)` using normalized inbound sender phone
  - `createNeighborFromInbound(...)` when no active reusable match exists
- Replace the current `neighbor_unresolved` terminal refusal with:
  - successful existing-neighbor resolution
  - successful minimal-neighbor creation
  - `IDENTITY_MATCH_AMBIGUOUS` refusal when phone resolution returns multiple matches
- After the final neighbor is selected or created, run the conditional texting-preference promotion and ensure explicit `YES` or `NO` values remain untouched.
- Add route integration coverage for:
  - metadata match
  - canonical-metadata-only handling where alias keys are ignored
  - thread-correlation match
  - phone single-match
  - cross-tenant-only phone no-match progression
  - no-match new-neighbor creation
  - explicit-metadata-to-deleted-neighbor fallback
  - ambiguous phone refusal
  - signed webhook authenticity using captured raw body
- Verify that no routing, localhost binding, or shared-Postgres topology files need to change for this feature.

**Must hold constant**

- provider routing ownership and rollout checks
- non-SMS webhook branches such as voice and bridge flows
- outbound sender-number behavior and timeline projection work outside this slice

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `rg -n "express\\.json|rawBody|webhooks/inbound|IDENTITY_MATCH_AMBIGUOUS|CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED|prefersTexting" /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/app.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `rg -n "connect-api|3002|proxy_pass|postgres|knex|migrate" /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/config/knex.ts /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Exit criteria**

- Signed inbound webhook verification succeeds only when the exact received body validates.
- Accepted inbound SMS resolves through metadata, thread, phone, or new-neighbor creation with no undocumented fallback.
- Ambiguous phone matches refuse without creating a neighbor.
- Inbound-created neighbors start with `UNKNOWN` and accepted inbound SMS promotes only `UNKNOWN -> YES`.
- Explicit `YES` or `NO` texting preferences remain unchanged.
- No routing, binding, or shared-database topology contract changes are required.

## Smallest Safe First Implementation Slice

Make Slice 1 the first commit: raw-body capture in the runtime app and test harness. It is the narrowest change, it hardens signature validation immediately, and it isolates the highest rollback-risk parser behavior from the subsequent resolver and mutation changes.
