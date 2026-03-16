# Slice 9 Research: Cross-Lane Dependency Anchor Cleanup

## Decision: Extract only the entitlement subset of `PlatformAdminService` into a shared primitive

- Decision: Create a narrow shared primitive for tenant-module entitlement evaluation instead of importing the full `PlatformAdminService` across apps.
- Rationale: The live `connectshyft-api` and `moneyshyft-api` consumers only use `PlatformAdminActorContext`, `evaluateActorTenantModuleEntitlement`, and the entitlement decision types. The full service contains additional admin-owned mutation and tenant-management behavior that should remain app-owned.
- Alternatives considered:
  - Import `apps/admin-api/src/services/PlatformAdminService.ts` directly: rejected because app-to-app feature imports violate lane isolation and the user explicitly limited cross-app imports to true shared primitives only.
  - Leave the local mirrored service in place: rejected because it keeps stale mirror trees runtime-live and blocks Slice 10 cleanup.
  - Move the entire service into `libs/`: rejected because that would dump admin feature logic into shared code just to avoid ownership decisions.

## Decision: Treat the live runtime anchor set as two imports, not the whole mirrored service forest

- Decision: Scope the implementation patch to the two live runtime imports that currently keep the stale mirror logic patch-relevant:
  - `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `apps/moneyshyft-api/src/api/registerRoutes.ts`
- Rationale: Static import evidence shows `connectshyft-api` only imports its local `services/PlatformAdminService` from the live route file, and `moneyshyft-api` only imports the same entitlement helper from live route registration. Other references are unmounted or test-only and do not justify widening the patch.
- Alternatives considered:
  - Rewrite every `PlatformAdminService` consumer now: rejected because that widens Slice 9 into stale-tree cleanup and test migration work.
  - Ignore the MoneyShyft live route-registration guard: rejected because it still keeps wrong-lane entitlement logic patch-relevant in a mounted runtime path.

## Decision: Use `libs/platform` as the replacement boundary

- Decision: Add the entitlement primitive under `libs/platform`.
- Rationale: `libs/platform` already exists as an approved shared-platform boundary, while the entitlement helper is a cross-lane platform concern. This avoids creating a new shared package solely for Slice 9.
- Alternatives considered:
  - Put the primitive in `libs/auth`: rejected because the logic is module-entitlement governance, not authentication token handling.
  - Create a new `libs/platform-admin`: rejected because the smallest safe slice does not need a new package boundary.

## Decision: Reclassify mirror surfaces after anchor removal, but defer deletion

- Decision: Update `architecture/LANE_INVENTORY.md` and `specs/012-platform-lane-separation/remediation-map.md` to reflect the removed runtime anchor and deferred Slice 10 deletion.
- Rationale: Slice 9 is about dependency-anchor cleanup only. Once the live import anchor is gone, the stale tree should no longer be treated as runtime-live, but the files themselves stay in place until the next slice.
- Alternatives considered:
  - Delete the stale service trees now: rejected by the slice boundary.
  - Leave classifications unchanged until Slice 10: rejected because the inventory would no longer match reality after the anchor removal.

## Decision: Keep topology and routing verification explicit even though this is an internal dependency slice

- Decision: Include build, runtime-behavior, route-delegation, localhost-binding, shared-Postgres, and runbook checks in the verification order.
- Rationale: The constitution requires deployment-topology and delegation verification for work that affects lane routing or shared platform behavior. The entitlement helper sits on that boundary.
- Alternatives considered:
  - Limit verification to unit tests only: rejected because it would miss lane-boundary regressions.
  - Re-run full stale-tree cleanup verification in Slice 9: rejected because that belongs to Slice 10.

## Reviewed anchor ledger

| Import site | Classification | Slice 9 action | Outcome |
| --- | --- | --- | --- |
| `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` | `runtime_live` | rewired to `apps/connectshyft-api/src/platform/tenantModuleEntitlements.ts` | live wrong-tree anchor removed |
| `apps/moneyshyft-api/src/api/registerRoutes.ts` | `runtime_live` | rewired to `apps/moneyshyft-api/src/platform/tenantModuleEntitlements.ts` | live wrong-tree anchor removed |
| `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` | `unmounted` | deferred | remains unmounted stale mirror pending Slice 10 cleanup |
| `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` | `unmounted` | deferred | remains unmounted wrong-lane admin mirror |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts` | `test_only` | deferred | retained as non-runtime stale mirror test coverage |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts` | `test_only` | deferred | retained as non-runtime stale mirror test coverage |
| `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` | `test_only` | deferred | retained as non-runtime stale mirror test coverage |
| `apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts` | `test_only` | deferred | retained for service parity history only |
| `apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts` | `test_only` | deferred | retained for service parity history only |
| `apps/admin-api/src/routes/api/v1/platform-admin.ts` | `runtime_live` | no change | canonical admin-owned import remains valid |
| `apps/admin-api/src/routes/api/v1/platform-admin-console.ts` | `runtime_live` | no change | canonical admin-owned import remains valid |
| `apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts` | `test_only` | no change | canonical admin service test coverage remains valid |

## Implementation proof

- Shared entitlement primitive added at `libs/platform/src/tenantModuleEntitlements.ts`.
- Thin lane-local wrappers added at:
  - `apps/connectshyft-api/src/platform/tenantModuleEntitlements.ts`
  - `apps/moneyshyft-api/src/platform/tenantModuleEntitlements.ts`
- Live dependency anchors removed from:
  - `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `apps/moneyshyft-api/src/api/registerRoutes.ts`
- Admin-semantic parity proof recorded by preserving the entitlement subset behavior for:
  - invalid tenant id => `missing`
  - missing entitlement row => `missing`
  - disabled row => `disabled`
  - enabled row => `enabled`
  - `SYSTEM_ADMIN` actor => `system-admin-override`

## Verification evidence

- `apps/admin-api`: `npm run build`
- `apps/moneyshyft-api`: `npm run build`
- `apps/connectshyft-api`: `npm run build`
- `apps/admin-api`: `npx jest --runInBand src/services/__tests__/tenantModuleEntitlements.shared.test.ts`
- `apps/moneyshyft-api`: `npx jest --runInBand src/api/__tests__/registerRoutes.test.ts src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts`
- `apps/connectshyft-api`: `npx jest --runInBand src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- Repository import scan shows no reviewed live runtime still imports `apps/connectshyft-api/src/services/PlatformAdminService.ts` or `apps/moneyshyft-api/src/services/PlatformAdminService.ts`.
- Repository import scan shows no new app-to-app feature imports were introduced; the only `apps/...` scan hit was `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js`, which generates a same-app dist entrypoint and is not a cross-app runtime dependency.
- The new cross-lane reuse flows through `libs/platform`.
