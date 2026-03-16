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
- `apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` show only the residual proof that must be evaluated

## 2. Verify target directories and likely stale leftovers

```bash
cd /Users/jeremiahotis/projects/connectshyft

find apps/admin-web/src/views -maxdepth 2 -type f | rg '/(Accounts|Budget|Dashboard|Debts|Goals|Scenarios|Transactions)/'
rg -n "auth\\.ts|platform-admin\\.ts" architecture/LANE_INVENTORY.md specs/012-platform-lane-separation/remediation-map.md
```

Expected outcome:

- candidate targets exist in the repo before cleanup
- documentation reflects their stale or transitional status before reclassification

## 3. Build, boundary, and route verification after cleanup

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-web && npm run build
cd /Users/jeremiahotis/projects/connectshyft/apps/admin-api && npx jest --runInBand src/__tests__/app-entrypoint-kernel.test.ts
cd /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api && npx jest --runInBand src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts
```

Expected outcome:

- admin-web still builds successfully
- admin-api still exposes the canonical admin route surface
- MoneyShyft boundary tests still prove wrong-lane admin mounts remain absent
- `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden` remain the expected admin-web route surface and must be manually smoke-checked in the normal local verification flow

## 4. Verify deployment and topology invariants

```bash
cd /Users/jeremiahotis/projects/connectshyft

rg -n "server 127\\.0\\.0\\.1:(3100|3000|3002)|/api/v1/auth/|/api/v1/platform/admin/" nginx/host-managed-subdomains.example.conf docs/PRODUCTION_DEPLOYMENT_GUIDE.md
rg -n "3000|3002|3100|127\\.0\\.0\\.1" docker-compose.production.example.yml apps/admin-api/Dockerfile.production apps/moneyshyft-api/Dockerfile.production apps/connectshyft-api/Dockerfile.production
rg -n "shared Postgres|migration" docs/PRODUCTION_DEPLOYMENT_GUIDE.md docker-compose.production.example.yml shared/database
```

Expected outcome:

- delegated auth/admin ownership still points to `admin-api`
- canonical API bindings remain localhost-only on the documented ports
- no shared PostgreSQL connectivity or migration-authority changes are introduced by this slice
- the deployment runbook remains usable without slice-specific manual adjustments

## 5. Confirm stop-boundary protections

```bash
cd /Users/jeremiahotis/projects/connectshyft

git diff --name-only
rg -n "ROUTESHYFT|migration-runner|/api/v1/connectshyft" architecture/LANE_INVENTORY.md specs/013-admin-leftovers-cleanup apps
```

Expected outcome:

- only the targeted stale admin-web leftovers, their required supporting references, and documentation updates are changed
- no ConnectShyft runtime, migration authority, or RouteShyft keeper changes are included

## 6. Final observed verification results for this slice

- `npm run build` in `apps/admin-web`: passed
- `npx jest --runInBand src/__tests__/app-entrypoint-kernel.test.ts` in `apps/admin-api`: passed
- `npx jest --runInBand src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts` in `apps/moneyshyft-api`: passed
- built preview route probes returned HTTP 200 for:
  - `/admin`
  - `/admin/system`
  - `/admin/tenant`
  - `/admin/forbidden`
- final classification outcome:
  - retained: `apps/moneyshyft-api/src/routes/api/v1/auth.ts`
  - deleted: `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts`
