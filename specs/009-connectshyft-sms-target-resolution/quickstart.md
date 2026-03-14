# Quickstart

## Goal

Verify that the current ConnectShyft runtime host resolves outbound SMS targets deterministically, refuses non-permitted sends before provider dispatch, and returns thread source fidelity for outbound thread-message responses.

## Automated Checks

### Route-level dispatch and refusal coverage

From repo root:

```bash
cd apps/moneyshyft-api && npm test -- --runInBand src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
```

### Read-contract and source-fidelity coverage

From repo root:

```bash
cd apps/moneyshyft-api && npm test -- --runInBand src/modules/connectshyft/__tests__/readContracts.test.ts
```

### SMS preference policy coverage

From repo root:

```bash
cd apps/moneyshyft-api && npm test -- --runInBand src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
```

## Manual Verification

### 1. Explicit target wins

1. Send `POST /api/v1/connectshyft/threads/:threadId/messages` with a valid `targetPhone`.
2. Use a thread whose linked neighbor has multiple stored phones.
3. Confirm the response is successful.
4. Confirm `dispatch.dispatchContext.targetPhone` equals the explicit target, not a neighbor fallback.
5. Confirm `thread.source` is `SMS`.

### 2. Deterministic neighbor-primary fallback

1. Send the same route without any explicit target fields.
2. Use a linked neighbor with exactly one primary phone and `prefers_texting = YES`.
3. Confirm the response is successful.
4. Confirm `dispatch.dispatchContext.targetPhone` equals that primary phone.

### 3. Multiple-phone refusal

1. Send the route without any explicit target fields.
2. Use a linked neighbor with multiple valid phone candidates and no single deterministic winner.
3. Confirm the route returns `CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES`.
4. Confirm `dispatchAttempted` is `false`.

### 4. No-phone refusal

1. Send the route without any explicit target fields.
2. Use a linked neighbor with no valid phone candidates.
3. Confirm the route returns `CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE`.
4. Confirm the response does not report provider dispatch failure.

### 5. Texting gate refusal

1. Send the route with no explicit target override behavior.
2. Use a linked neighbor with `prefers_texting = NO` or `UNKNOWN`.
3. Confirm the route returns `CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED`.
4. Confirm no provider dispatch is attempted.

## Regression Notes

- Provider registry behavior remains provider-neutral and unchanged.
- Current route ownership, topology, and lane isolation remain unchanged.
- Outbound call behavior must continue returning `VOICE` source semantics.

## Topology Validation

### 6. Route ownership remains local to the current runtime host

1. Inspect `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`.
2. Confirm outbound SMS target resolution remains inside the existing ConnectShyft route.
3. Confirm no `/api/v1/auth/*` or `/api/v1/platform/admin/*` ownership changes were introduced.
4. Confirm `apps/connectshyft-api` remains untouched for this feature.

### 7. Localhost-only port and binding expectations remain unchanged

1. Inspect `apps/moneyshyft-api/src/server.ts`.
2. Confirm the canonical MoneyShyft API port remains `3000`.
3. Confirm production binding is still constrained to a local interface expectation as documented in `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`.
4. Confirm no new listener, ingress, or host-level port is required for this feature.

### 8. Shared PostgreSQL compatibility remains unchanged

1. Inspect `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`.
2. Confirm the feature only reads existing `connectshyft.cs_threads`, `connectshyft.cs_neighbors`, and `connectshyft.cs_neighbor_phones` data.
3. Confirm no new migration ownership or standalone lane migration workflow was introduced.
4. Confirm automated tests pass without any new schema requirement.

### 9. Deployment runbook remains reproducible

1. Inspect `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`.
2. Confirm the existing build, migrate, and deploy flow remains unchanged.
3. Confirm no manual runtime patch step was introduced for SMS target resolution.
4. Confirm the feature can be shipped with the existing documented Docker Compose and Nginx workflow.

### 10. Route-to-provider dispatch shape remains unchanged

1. Inspect `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`.
2. Inspect `apps/moneyshyft-api/src/modules/connectshyft/providerRegistry.ts`.
3. Confirm deterministic SMS target resolution occurs before `dispatchOutboundMessage()`.
4. Confirm no new cross-service call, provider-layer branch, or adapter interface change was introduced.
