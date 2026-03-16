# Research: Slice 8 Stale Admin Leftovers Cleanup

## Decision 1: Treat the named admin-web view groups as unmounted stale cleanup candidates

- **Decision**: Use the seven named `apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions}` targets as the primary deletion candidates for this slice.
- **Rationale**: `apps/admin-web/src/router/index.ts` mounts only admin auth and `/admin/*` routes, and `specs/012-platform-lane-separation/remediation-map.md` already classifies these admin-web MoneyShyft surfaces as an unmounted stale mirror rather than live admin ownership.
- **Alternatives considered**:
  - Keep the view groups indefinitely because they still exist in the repo. Rejected because current router evidence and remediation mapping already identify them as stale baggage.
  - Expand the slice into all matching stores/components immediately. Rejected because the user explicitly requested a narrow, non-blanket cleanup.

## Decision 2: Include stale navigation reference cleanup only when needed to safely remove stale views

- **Decision**: Allow supporting cleanup in `apps/admin-web/src/components/layout/AppHeader.vue` and `AppMobileNav.vue` if those surfaces still link to the stale MoneyShyft paths.
- **Rationale**: The current admin-web layout still contains MoneyShyft navigation items such as `/accounts`, `/budget`, and `/transactions`, even though the admin router no longer mounts those routes. Removing stale views without cleaning those references would preserve a broken navigation experience and undermine the slice’s safety goal.
- **Alternatives considered**:
  - Delete only the view files and leave navigation untouched. Rejected because it leaves live broken links in admin-web.
  - Treat navigation cleanup as out of scope for this slice. Rejected because it is directly caused by the stale view cleanup and remains lane-local to `admin-web`.

## Decision 3: Retain `apps/moneyshyft-api/src/routes/api/v1/auth.ts` unless its direct test dependency is removed or repointed

- **Decision**: Do not assume `auth.ts` is safe to delete in this slice; require explicit proof of no remaining dependency before removal.
- **Rationale**: `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` directly imports `../routes/api/v1/auth`, so the file is still needed by at least one current test surface even though it is no longer mounted live.
- **Alternatives considered**:
  - Delete `auth.ts` based only on runtime unmount evidence. Rejected because the test dependency makes the file still active in repo behavior.
  - Declare `auth.ts` permanently retained. Rejected because the slice must still verify whether the test dependency can be repointed or whether the file should remain explicitly retained.

## Decision 4: Treat `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` as a proof-before-delete candidate

- **Decision**: Verify `platform-admin.ts` for imports, dynamic references, and test dependency; delete it only if that proof is clean.
- **Rationale**: Inventory already marks it as unmounted in MoneyShyft, and current repo scans show no direct import equivalent to the `auth.ts` test dependency. That makes it a valid deletion candidate, but still not safe for assumption-only cleanup.
- **Alternatives considered**:
  - Delete `platform-admin.ts` immediately. Rejected because the slice requires verification, not assumption.
  - Retain `platform-admin.ts` automatically because it resembles `auth.ts`. Rejected because current evidence does not show the same dependency pattern.

## Decision 5: Keep documentation updates inside the slice

- **Decision**: Update `architecture/LANE_INVENTORY.md` and relevant remediation docs in the same slice as any deletion or retention decision.
- **Rationale**: This cleanup is inventory-backed by definition. A target that is removed or retained without updated classification would immediately recreate ambiguity for the next cleanup pass.
- **Alternatives considered**:
  - Defer documentation updates to a later cleanup pass. Rejected because it breaks the stated proof-based workflow.

## Evidence Baseline

### Current inventory and stale classifications

- `architecture/LANE_INVENTORY.md` currently classifies:
  - `apps/admin-api/src/routes/api/v1/auth.ts` as the canonical ADMIN auth runtime owner.
  - `apps/admin-api/src/routes/api/v1/platform-admin.ts` as the canonical ADMIN platform-admin runtime owner.
  - `apps/moneyshyft-api/src/routes/api/v1/auth.ts` as `unmounted_in_moneyshyft`, `transitional`, and `converge_first`.
  - `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` as `unmounted_in_moneyshyft`, `transitional`, and `converge_first`.
- `specs/012-platform-lane-separation/remediation-map.md` currently classifies `apps/admin-web/src/views/Accounts`, `Budget`, `Dashboard`, `Debts`, `Goals`, `Scenarios`, and `Transactions`, plus matching stores/components, as an unmounted stale mirror in `admin-web`.

### Current admin-web route surface

- `apps/admin-web/src/router/index.ts` mounts only:
  - `/login`
  - `/auth/password/forgot`
  - `/auth/password/reset`
  - `/auth/password/first-login-reset`
  - `/admin`
  - `/admin/system`
  - `/admin/tenant`
  - `/admin/forbidden`
- No router mounts exist for `/accounts`, `/transactions`, `/budget`, `/extra-money`, `/debts`, `/goals`, or the named stale view groups.

### Current stale admin-web navigation references

- `apps/admin-web/src/components/layout/AppHeader.vue` still defines MoneyShyft navigation entries for:
  - `/`
  - `/accounts`
  - `/transactions`
  - `/budget`
  - `/extra-money`
  - `/debts`
  - `/goals`
- `apps/admin-web/src/components/layout/AppMobileNav.vue` still defines MoneyShyft navigation entries for:
  - `/`
  - `/accounts`
  - `/budget`
  - `/extra-money`
  - `/transactions`

### Current stale admin-web file targets

- The currently retained stale admin-web view files are:
  - `apps/admin-web/src/views/Accounts/AccountsListView.vue`
  - `apps/admin-web/src/views/Budget/BudgetSetupWizard.vue`
  - `apps/admin-web/src/views/Budget/BudgetView.vue`
  - `apps/admin-web/src/views/DashboardView.vue`
  - `apps/admin-web/src/views/Debts/DebtsView.vue`
  - `apps/admin-web/src/views/Goals/GoalsListView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenarioComparisonView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenarioDetailView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenariosListView.vue`
  - `apps/admin-web/src/views/Transactions/RecurringTransactionsView.vue`
  - `apps/admin-web/src/views/Transactions/TransactionsListView.vue`

### Current likely stale admin API leftovers

- `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` directly imports `../routes/api/v1/auth`, so `apps/moneyshyft-api/src/routes/api/v1/auth.ts` remains test-bound and is not currently safe to delete.
- `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` is not mounted by `V1_ROUTE_REGISTRATIONS`, and current repo scans show no direct route, import, or test dependency on the file itself.
- The MoneyShyft boundary tests for auth and platform-admin only assert that `/api/v1/auth` and `/api/v1/platform/admin` are absent from `V1_ROUTE_REGISTRATIONS`; they do not require the MoneyShyft `platform-admin.ts` file to remain.

### Scope boundary baseline

- `apps/admin-api/src/api/registerRoutes.ts` remains the canonical owner for `/api/v1/auth` and `/api/v1/platform/admin`.
- `apps/admin-web/src/router/index.ts` remains the canonical admin SPA route owner for `/admin`, `/admin/system`, `/admin/tenant`, and `/admin/forbidden`.
- No evidence from the baseline scans requires changes to ConnectShyft ownership, RouteShyft keepers, migration authority, host Nginx delegation, or shared PostgreSQL topology for this slice.

## Final Outcomes

### Admin-web stale view cleanup

- Removed the following unmounted stale admin-web MoneyShyft view files:
  - `apps/admin-web/src/views/Accounts/AccountsListView.vue`
  - `apps/admin-web/src/views/Budget/BudgetSetupWizard.vue`
  - `apps/admin-web/src/views/Budget/BudgetView.vue`
  - `apps/admin-web/src/views/DashboardView.vue`
  - `apps/admin-web/src/views/Debts/DebtsView.vue`
  - `apps/admin-web/src/views/Goals/GoalsListView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenarioComparisonView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenarioDetailView.vue`
  - `apps/admin-web/src/views/Scenarios/ScenariosListView.vue`
  - `apps/admin-web/src/views/Transactions/RecurringTransactionsView.vue`
  - `apps/admin-web/src/views/Transactions/TransactionsListView.vue`
- Post-delete file inventory under `apps/admin-web/src/views` retains only:
  - `Admin/**`
  - `Auth/**`
  - `ExtraMoneyView.vue`
  - `MoneyShyft/RouteRequestLifecycleView.vue`
  - `Settings/HouseholdSettingsView.vue`

### Admin-web navigation cleanup

- Removed the stale MoneyShyft navigation arrays from:
  - `apps/admin-web/src/components/layout/AppHeader.vue`
  - `apps/admin-web/src/components/layout/AppMobileNav.vue`
- The admin shell now exposes only the admin navigation path from these layout surfaces.

### Likely stale MoneyShyft admin leftover outcomes

- Retained `apps/moneyshyft-api/src/routes/api/v1/auth.ts` because `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` still imports it directly.
- Deleted `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` because:
  - it is not mounted by the MoneyShyft `V1_ROUTE_REGISTRATIONS`
  - current repo scans showed no direct import dependency on the file
  - current MoneyShyft boundary tests assert route absence through `V1_ROUTE_REGISTRATIONS`, not through the route module itself

## Verification Results

### Build and targeted boundary tests

- `npm run build` in `apps/admin-web`: passed
- `npx jest --runInBand src/__tests__/app-entrypoint-kernel.test.ts` in `apps/admin-api`: passed
- `npx jest --runInBand src/routes/api/v1/__tests__/auth.refresh.test.ts src/routes/api/v1/__tests__/platform-admin.test.ts src/routes/api/v1/__tests__/platform-admin-console.test.ts` in `apps/moneyshyft-api`: passed

### Canonical admin route verification

- Static router verification confirms `apps/admin-web/src/router/index.ts` still mounts:
  - `/admin`
  - `/admin/system`
  - `/admin/tenant`
  - `/admin/forbidden`
- Built-app preview smoke verification returned HTTP 200 for:
  - `http://127.0.0.1:4173/admin`
  - `http://127.0.0.1:4173/admin/system`
  - `http://127.0.0.1:4173/admin/tenant`
  - `http://127.0.0.1:4173/admin/forbidden`

### Deployment and topology invariants

- Host Nginx delegation references in `nginx/host-managed-subdomains.example.conf` and `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` still point `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin-api`.
- Canonical API bindings remain loopback-only on:
  - `admin-api:3100`
  - `money-api:3000`
  - `connect-api:3002`
- Shared PostgreSQL and migration-authority documentation remains unchanged; no slice edits touched shared DB or migration execution sources.
- Runbook review found no slice-specific deployment adjustments required.

### Stop-boundary proof

- Changed source files are limited to:
  - stale admin-web view deletions
  - stale admin-web navigation cleanup
  - `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts` deletion
  - inventory/remediation/spec artifacts for Slice 8
- No ConnectShyft ownership, RouteShyft keeper, migration-runner, or migration authority source changes were introduced by this slice.
