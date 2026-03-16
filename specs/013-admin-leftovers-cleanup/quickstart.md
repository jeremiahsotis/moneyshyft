# Quickstart: Slice 8 Stale Admin Leftovers Cleanup

## 1. Confirm target usage before deletion

```bash
cd /Users/jeremiahotis/projects/connectshyft

rg -n "views/(Accounts|Budget|Dashboard|Debts|Goals|Scenarios|Transactions)" apps/admin-web/src
rg -n "@/views/(Accounts|Budget|Dashboard|Debts|Goals|Scenarios|Transactions)" apps/admin-web/src
rg -n "routes/api/v1/(auth|platform-admin)" apps/moneyshyft-api/src apps/admin-api/src
```

Expected outcome:

- the stale admin-web view groups are not mounted by `apps/admin-web/src/router/index.ts`
- any remaining references are supporting stale references that must be cleaned or documented
- `auth.ts` and `platform-admin.ts` show only the residual proof that must be evaluated

## 2. Verify target directories and likely stale leftovers

```bash
cd /Users/jeremiahotis/projects/connectshyft

find apps/admin-web/src/views -maxdepth 2 -type f | rg '/(Accounts|Budget|Dashboard|Debts|Goals|Scenarios|Transactions)/'
rg -n "auth\\.ts|platform-admin\\.ts" architecture/LANE_INVENTORY.md specs/012-platform-lane-separation/remediation-map.md
```

Expected outcome:

- candidate targets exist in the repo before cleanup
- documentation reflects their stale or transitional status before reclassification

## 3. Build and route verification after cleanup

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-web && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npx jest --runInBand src/__tests__/app-entrypoint-kernel.test.ts
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts
```

Expected outcome:

- admin-web still builds successfully
- admin-api still exposes the canonical admin route surface
- MoneyShyft boundary tests still prove wrong-lane admin mounts remain absent

## 4. Confirm stop-boundary protections

```bash
cd /Users/jeremiahotis/projects/connectshyft

git diff --name-only
rg -n "ROUTESHYFT|migration-runner|/api/v1/connectshyft" architecture/LANE_INVENTORY.md specs/013-admin-leftovers-cleanup apps
```

Expected outcome:

- only the targeted stale admin-web leftovers, their required supporting references, and documentation updates are changed
- no ConnectShyft runtime, migration authority, or RouteShyft keeper changes are included
