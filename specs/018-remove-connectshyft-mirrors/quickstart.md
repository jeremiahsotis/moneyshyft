# Quickstart: Slice 10c Execution and Verification

## Goal

Delete the final stale ConnectShyft mirror module trees from MoneyShyft and Admin after every remaining importer anchor is removed or migrated safely.

## Execution Order

1. Reconfirm the current anchor map for:
   - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`
   - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
2. Compare the four top-level identity tests against canonical ConnectShyft coverage and capture any residual assertion gaps.
3. Add any missing legitimate identity assertions to canonical ConnectShyft tests.
4. Delete the four top-level identity tests from MoneyShyft and Admin.
5. Repoint the Admin platform console off mirror `numberMappings`.
6. Update the Admin platform console route test to match the new dependency boundary.
7. Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`.
8. Delete `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`.
9. Update `architecture/LANE_INVENTORY.md` from the final post-delete state.

## Reference Scans

Run these before and after implementation:

```bash
rg -n "modules/connectshyft/neighbors|modules/connectshyft/identityBoundary|modules/connectshyft/numberMappings|platform-admin-console" \
  /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src \
  /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src

rg -n "src/modules/connectshyft|apps/admin-api/src/modules/connectshyft|apps/moneyshyft-api/src/modules/connectshyft" \
  /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
```

## Verification Order

1. Prove no remaining direct importer or mock references either mirror tree.
2. Prove no remaining Admin route registration path reaches the Admin mirror tree.
3. Prove canonical ConnectShyft tests now contain any surviving identity assertions that had to be preserved.
4. Run:
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm test -- --runInBand --testPathPattern=connectshyft`
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npm test -- --runInBand --testPathPattern=platform-admin-console`
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npm test -- --runInBand --runTestsByPath src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts`
5. Run bounded builds:
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npm run build`
   - `cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npm run build`
6. Run `cd /Users/jeremiahotis/projects/connectshyft && node scripts/enforce-workspace-boundaries.js`
7. Verify `architecture/LANE_INVENTORY.md` matches the final state.

## Expected Outcomes

- MoneyShyft no longer contains a ConnectShyft module mirror tree.
- Admin no longer contains a ConnectShyft module mirror tree.
- Canonical ConnectShyft owns any surviving legitimate identity coverage.
- Admin platform console behavior remains intact without importing the Admin mirror tree.
- Inventory no longer describes these trees as unresolved cleanup if deletion succeeded.

## Stop Conditions

- Stop if any residual top-level identity assertion cannot be migrated cleanly into canonical ConnectShyft tests.
- Stop if the Admin platform console still requires an unresolved mirror-only dependency path.
- Stop if post-change scans still show any importer of either deleted mirror tree.
- Stop if inventory cannot be updated to describe the true final state.
