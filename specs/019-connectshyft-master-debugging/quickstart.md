# Quickstart: ConnectShyft Master Debugging

## Goal

Execute the locked three-patch debugging sequence in order, keep each patch independently reviewable, and verify behavior after each patch before moving to the next one.

## Patch Execution Order

1. Implement Patch 1 for texting preference persistence and display.
2. Verify Patch 1 before opening Patch 2.
3. Implement Patch 2 for refusal rendering.
4. Verify Patch 2 before opening Patch 3.
5. Implement Patch 3 for deterministic SMS target resolution.
6. Run the final cross-phase regression pass.

## Smallest Safe Starting Slice

Start in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`:

1. Accept canonical `prefersTexting` in neighbor create and update request parsing.
2. Thread it through route-local forwarding, including `updateNeighborWithSideEffects`, plus create and update service and store inputs.
3. Persist new neighbors as `YES` by default and stop coercing explicit values to `UNKNOWN`.
4. Align `smsPreferenceOverrides` so durable neighbor preference remains authoritative for SMS gating when available.
5. Re-run existing neighbor service coverage before touching any frontend code.

## Recommended Verification Loop

### Patch 1

- In `apps/connectshyft-api`, run `npm test`.
- In `apps/connectshyft-web`, run `npm run build`.
- Manually verify ConnectShyft neighbor create, profile edit, and snapshot or directory display flows.

### Patch 2

- In `apps/connectshyft-web`, run `npm run build`.
- Trigger a known business refusal in inbox and thread detail.
- Trigger a transport failure path and confirm it still renders differently.

### Patch 3

- In `apps/connectshyft-api`, run `npm test`.
- In `apps/connectshyft-web`, run `npm run build`.
- Manually verify explicit outbound request target, deterministic implicit target, refusal-on-ambiguity, preview-composer send, modal send, and implicit thread-detail SMS flows.

## Final Regression Pass

- Re-run `npm test` in `apps/connectshyft-api`.
- Re-run `npm run build` in `apps/connectshyft-web`.
- Smoke test all three user stories in order:
  1. trustworthy texting preference state
  2. visible refusal state
  3. deterministic SMS behavior
  4. unchanged auth/admin delegation, API binding, shared Postgres authority, and runbook expectations
