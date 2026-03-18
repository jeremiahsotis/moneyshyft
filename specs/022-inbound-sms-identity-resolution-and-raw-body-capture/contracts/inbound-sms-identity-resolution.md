# Contract: ConnectShyft Inbound SMS Identity Resolution

## Objective

Make inbound SMS neighbor resolution deterministic across explicit metadata, thread correlation, tenant-scoped phone matching, and new-neighbor creation, while ensuring signed webhook validation uses the exact received request body.

## Allowed runtime surface

- `apps/connectshyft-api/src/app.ts`
  - JSON parser raw-body capture for signed webhook requests
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - inbound webhook signature validation
  - correlation resolution
  - ordered neighbor resolution chain
  - refusal shaping
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
  - replaceable `resolveSubjectByContactPoint(...)` boundary
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - `createNeighborFromInbound(...)`
  - `applyInboundSmsTextingPreference(...)`
  - explicit and phone-based active-neighbor filtering
- `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
  - neighbor-creation audit persistence
- Existing related tests only:
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`

## Webhook request contract

- `POST /api/v1/connectshyft/webhooks/inbound` remains the inbound webhook entrypoint.
- Any JSON request that reaches signed webhook verification must have `req.rawBody` populated with the exact bytes received on the wire.
- Signature validation must run before message append, neighbor creation, texting-preference mutation, or neighbor-creation audit persistence.

## Subject resolution boundary contract

### `resolveSubjectByContactPoint(input)`

**Input**

- `tenantId`
- `orgUnitId`
- `contactPoint` as normalized E.164 sender phone

**Output**

- `single_match`
  - `neighborId`
- `no_match`
- `multiple_matches`
  - `candidateNeighborIds`

**Current local adapter**

- Delegates to the existing async identity boundary.
- Uses phone matching only.
- Converts unique exact-match outcomes into `single_match` even when the underlying identity boundary would classify them as `NO_AUTO_MERGE`.

## Boundary rules

1. Inbound SMS neighbor resolution must use only this ordered chain:
   - explicit webhook metadata neighbor reference
   - thread correlation
   - `resolveSubjectByContactPoint(...)`
   - `createNeighborFromInbound(...)`
2. The first reusable active neighbor in that chain wins. Lower-priority steps must not run after a higher-priority active match succeeds.
3. A reusable match must be tenant-scoped and must exclude soft-deleted neighbors.
4. `multiple_matches` is a hard business refusal. The system must not guess and must not create a new neighbor.
5. `no_match` must create a new active minimal neighbor with:
   - sender phone as primary phone
   - phone marked active and valid
   - minimal profile with blank names allowed
   - `prefersTexting = UNKNOWN`
   - neighbor-creation audit entry
6. After final neighbor resolution:
   - `UNKNOWN -> YES`
   - `YES -> YES`
   - `NO -> NO`
7. No direct DB logic may be added to the webhook route.

## Error-semantics rules

- Invalid or unverifiable signatures must reject before any business side effect.
- Ambiguous phone matches must return business refusal semantics and must not create a new neighbor.
- Deleted-neighbor matches must not resurrect deleted records and must not fail solely because deleted records were found; if no active reusable match remains, create a new neighbor.
- No silent fallback path may bypass the approved resolution order.

## Must hold constant

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` routing ownership
- shared host Nginx and localhost-only API binding topology
- shared Postgres compatibility and `admin-api` production migration ownership
- outbound sender-number behavior
- merge tooling, duplicate-resolution tooling, and timeline projection work outside this feature
