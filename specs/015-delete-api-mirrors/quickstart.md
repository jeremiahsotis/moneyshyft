# Quickstart: Slice 10 Verification

## Goal

Delete only individually proven stale API mirror files, verify associated stale tests one by one, update file-level inventory status, and stop before remaining convergence closure work.

## Verification Order

1. Confirm the current deletion and deferral posture still matches inventory and proof:
   - delete-safe now:
     - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
     - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
   - blocked and retained:
     - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
2. Review each associated test file individually:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
3. Run pre-delete import/reference scans proving reviewed files are not still required.
4. Delete only the files that remain individually proven safe.
5. Run affected app builds:
   - `apps/connectshyft-api`
   - `apps/moneyshyft-api`
   - `apps/admin-api` if required for retained entitlement parity or ownership checks
6. Run targeted tests covering surviving entitlement and ConnectShyft boundary behavior.
7. Run post-delete import/reference scans to confirm no deleted file remains referenced.
8. Confirm the following files are still present and explicitly deferred:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
9. Confirm these remain untouched:
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`
   - RouteShyft transitional keepers
   - migration-runner surfaces
10. Update `architecture/LANE_INVENTORY.md` and supporting slice notes from the final file-level state.

## Expected Outcomes

- Only exact reviewed files are deleted.
- The ConnectShyft service mirror and its paired stale service test are removed.
- The reviewed MoneyShyft associated tests are retained with explicit deferral because route/service blockers remain in place.
- The two `converge_first` MoneyShyft route files remain in place.
- No directory-level mirror tree is deleted.
- Builds and targeted tests still pass.

## Stop Here

Do not continue into:

- deletion of `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- deletion of `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- deletion of `apps/admin-api/src/modules/connectshyft`
- deletion of `apps/moneyshyft-api/src/modules/connectshyft`
- RouteShyft cleanup
- migration-runner production cutover
