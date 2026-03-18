# Quickstart: ConnectShyft Inbound SMS Identity Resolution and Raw Body Capture

## Goal

Implement deterministic inbound SMS neighbor resolution and exact-request webhook signature validation in three narrow backend slices, keeping route-owned resolution order while moving phone matching and inbound-specific neighbor mutations behind replaceable service boundaries.

## Slice Order

1. Raw-body capture and signed-webhook regression parity
2. Subject resolver boundary and inbound neighbor service methods
3. Ordered inbound webhook resolution, regression hardening, and rollback rehearsal

## Slice 1: Raw-Body Capture and Signed-Webhook Regression Parity

**Source targets**

- `apps/connectshyft-api/src/app.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- `infrastructure/communications/telnyx/__tests__/index.test.ts`

**Work**

1. Replace plain `express.json()` with `express.json({ verify })` and attach `req.rawBody`.
2. Mirror the same JSON parser behavior in the route integration test app.
3. Prove signed webhook verification still succeeds with untouched request bytes.
4. Prove tampered or unverifiable requests still fail before side effects.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts ../../infrastructure/communications/telnyx/__tests__/index.test.ts`

**Commit checkpoint**

- Safe to commit once runtime and test harness raw-body capture match and signature regressions remain green.

## Slice 2: Subject Resolver Boundary and Inbound Neighbor Service Methods

**Source targets**

- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/communicationAuditLog.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `shared/database/migrations/*_connectshyft_neighbor_lifecycle*.ts` only if deleted-neighbor lifecycle state must be added
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts` only if deleted-neighbor lifecycle state must be added

**Work**

1. Add `resolveSubjectByContactPoint({ tenantId, orgUnitId, contactPoint })`.
2. Map unique exact phone matches to `single_match`, no-match to `no_match`, and ambiguous matches to `multiple_matches`.
3. Add `createNeighborFromInbound(...)` with `prefersTexting: 'UNKNOWN'` and neighbor-creation audit persistence.
4. Add `applyInboundSmsTextingPreference(...)` so only `UNKNOWN` becomes `YES`.
5. Surface deleted-neighbor lifecycle state into active-match filtering; if the schema lacks that state, add the smallest shared migration needed to expose it.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/identityBoundary.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`

**Commit checkpoint**

- Safe to commit once the resolver boundary is stable, inbound-created neighbors start as `UNKNOWN`, and ambiguous phone matches still refuse cleanly.

## Slice 3: Ordered Inbound Webhook Resolution and Regression Hardening

**Source targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/modules/connectshyft/inboundSms.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- whichever Slice 1 and Slice 2 files need final regression tightening

**Work**

1. Keep signature validation and correlation resolution first.
2. Insert the ordered neighbor-resolution chain after metadata extraction and thread correlation.
3. Replace the old `neighbor_unresolved` terminal refusal with:
   - existing-neighbor resolution through metadata
   - existing-neighbor resolution through thread correlation
   - existing-neighbor resolution through phone match
   - new-neighbor creation when no active match exists
   - ambiguous refusal when phone match returns multiple candidates
4. Apply the guarded texting-preference promotion after final neighbor resolution.
5. Add route integration coverage for metadata match, thread match, phone single-match, no-match create, ambiguous refusal, and signature-authenticated webhook handling.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`

**Final acceptance**

- Valid signed inbound requests are accepted only when verified against the captured raw body.
- Inbound SMS resolves through metadata, thread, phone, or new-neighbor creation with no undocumented fallback.
- Ambiguous phone matches refuse without creating a new neighbor.
- Inbound-created neighbors start as `UNKNOWN`, and accepted inbound SMS promotes only `UNKNOWN -> YES`.
- Existing `YES` and `NO` values stay unchanged.

## Rollback Levers

1. Revert the JSON parser verify hook in `apps/connectshyft-api/src/app.ts` and `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts` if signature verification behavior changes unexpectedly.
2. Remove or bypass `resolveSubjectByContactPoint(...)` invocation in the inbound webhook route to return temporarily to metadata-plus-thread behavior while preserving the raw-body fix.
3. Restore the old `CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED` branch if inbound-created neighbor or texting-preference side effects must be disabled during incident response.
