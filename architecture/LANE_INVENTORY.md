# Lane Inventory

Status: working inventory template for convergence remediation

## Instructions

For each relevant path:

- classify the lane
- record actual runtime authority
- record intended authority
- classify duplication state
- assign remediation recommendation

## Classification values

### Lane classification

- MONEYSHYFT
- CONNECTSHYFT
- ADMIN
- MIGRATION_RUNNER
- SHARED
- ROUTESHYFT
- UNKNOWN

### Duplication state

- canonical
- mirrored_identical
- mirrored_diverged
- dead_stale
- transitional
- unknown

### Remediation recommendation

- fix_now_before_feature_work
- safe_to_patch_live_authority_now
- converge_first
- documentation_only_for_now
- transitional_keep_for_now
- safe_delete_after_convergence
- unknown_requires_followup

---

## Inventory table

| Path                                                    | Type          | Lane Classification           | Actual Runtime Authority | Intended Authority                         | Duplication State    | Recommendation             | Notes                                                |
| ------------------------------------------------------- | ------------- | ----------------------------- | ------------------------ | ------------------------------------------ | -------------------- | -------------------------- | ---------------------------------------------------- |
| apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts   | route         | CONNECTSHYFT                  | unmounted_in_moneyshyft  | connectshyft-api                           | transitional         | converge_first             | retained in repo but no longer mounted live          |
| apps/moneyshyft-api/src/modules/connectshyft            | module tree   | CONNECTSHYFT                  | unmounted_in_moneyshyft  | connectshyft-api                           | transitional         | converge_first             | retained for later convergence; no longer mounted live |
| apps/moneyshyft-api/src/modules/connectshyft/__tests__  | test mirror   | CONNECTSHYFT                  | non_runtime_test_only    | connectshyft-api canonical tests preferred | transitional         | safe_delete_after_convergence | stale module mirror tests should not gate MoneyShyft CI |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership | test mirror | CONNECTSHYFT | non_runtime_test_only | connectshyft-api canonical tests preferred | transitional | unknown_requires_followup | broad glob remains too coarse for Slice 10; reviewed file-level rows must govern delete-safe decisions |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts | test helper mirror | CONNECTSHYFT | non_runtime_test_only | connectshyft-api canonical tests preferred | transitional | converge_first | retained shared helper imported by multiple provider-registry tests; not delete-safe until dependent tests are individually reviewed |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts | test mirror | CONNECTSHYFT | non_runtime_test_only | connectshyft-api canonical tests preferred | transitional | converge_first | retained in Slice 10 because it exercises the deferred MoneyShyft `connectshyft.ts` mirror and still imports the retained MoneyShyft service mirror |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts | test mirror | CONNECTSHYFT | non_runtime_test_only | connectshyft-api canonical tests preferred | transitional | converge_first | retained in Slice 10 because it exercises the deferred MoneyShyft `connectshyft.ts` mirror and still imports the retained MoneyShyft service mirror |
| apps/moneyshyft-api/src/services/PlatformAdminService.ts | service mirror | ADMIN entitlement mirror | unmounted_and_test_only | admin-api for full service behavior; `libs/platform/src/tenantModuleEntitlements.ts` for shared entitlement subset | transitional | converge_first | Slice 9 removed the live `registerRoutes.ts` anchor, but current in-repo imports from `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` still block deletion |
| apps/connectshyft-api/src/routes/api/v1/connectshyft.ts | route         | CONNECTSHYFT                  | connectshyft-api         | connectshyft-api                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft API route owner           |
| apps/connectshyft-api/src/modules/connectshyft          | module tree   | CONNECTSHYFT                  | connectshyft-api         | connectshyft-api                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft module tree pending convergence proof |
| apps/connectshyft-api/src/services/PlatformAdminService.ts | service mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api for full service behavior; `libs/platform/src/tenantModuleEntitlements.ts` for shared entitlement subset | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after proof confirmed only the paired stale service test still imported it |
| apps/admin-api/src/routes/api/v1/connectshyft.ts        | route         | CONNECTSHYFT                  | deleted_after_slice_7    | connectshyft-api                           | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after ConnectShyft canonical owner verification |
| apps/admin-api/src/modules/connectshyft                 | module tree   | CONNECTSHYFT support mirror   | unmounted_in_admin       | connectshyft-api                           | transitional         | converge_first             | retained as stale mirror until later cleanup proof |
| apps/admin-api/src/modules/connectshyft/__tests__       | test mirror   | CONNECTSHYFT support mirror   | non_runtime_test_only    | connectshyft-api canonical tests preferred | transitional         | safe_delete_after_convergence | stale mirror tests remain deferred to cleanup     |
| apps/connectshyft-web/src/router/index.ts `/app/connectshyft/*` | web route | CONNECTSHYFT                | connectshyft-web         | connectshyft-web                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft SPA route owner          |
| apps/admin-api/src/routes/api/v1/auth.ts                | route         | ADMIN                         | admin-api                | admin-api                                  | canonical            | safe_to_patch_live_authority_now | canonical auth runtime owner                     |
| apps/admin-api/src/routes/api/v1/platform-admin.ts      | route         | ADMIN                         | admin-api                | admin-api                                  | canonical            | safe_to_patch_live_authority_now | canonical platform-admin API owner               |
| apps/admin-web/src/router/index.ts `/admin/*`           | web route     | ADMIN                         | admin-web                | admin-web                                  | canonical            | safe_to_patch_live_authority_now | canonical admin SPA route owner                  |
| apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions} | web mirror | MONEYSHYFT support mirror | deleted_after_slice_8 | moneyshyft-web | dead_stale | safe_delete_after_convergence | deleted in Slice 8 after router/import/test proof confirmed no live admin-web dependency |
| apps/moneyshyft-api/src/routes/api/v1/auth.ts           | route         | ADMIN                         | non_runtime_test_only    | admin-api                                  | transitional         | converge_first             | retained only because `src/__tests__/apiEnvelopeContract.test.ts` still imports it directly; no longer mounted live |
| apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts | test mirror | ADMIN entitlement mirror | non_runtime_test_only | admin-api canonical tests preferred | transitional | converge_first | retained in Slice 10 because the paired MoneyShyft service mirror remains blocked by deferred in-repo importers |
| apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts | route mirror | ADMIN entitlement mirror | unmounted_in_moneyshyft | admin-api | transitional | converge_first | retained stale admin mirror; still imports `apps/moneyshyft-api/src/services/PlatformAdminService.ts`, so it blocks service-file deletion until route-level closure |
| apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts | route         | ADMIN                         | deleted_after_slice_8    | admin-api                                  | dead_stale           | safe_delete_after_convergence | deleted in Slice 8 after route/import/test proof confirmed no remaining MoneyShyft dependency |
| apps/moneyshyft-web/src/router/index.ts `/admin/*`      | web route     | ADMIN                         | external_redirect_only   | admin-web                                  | transitional         | converge_first             | handoff to admin-web; no longer locally mounted   |
| apps/moneyshyft-web/src/views/Admin/**                  | web mirror    | ADMIN                         | deleted_after_slice_7    | admin-web                                  | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after admin-web ownership and redirect handoff were verified |
| apps/migration-runner                                   | app           | MIGRATION_RUNNER              | migration-runner         | migration-runner                           | canonical            | documentation_only_for_now | confirm adoption stage vs admin-api                  |
| apps/admin-api migration execution paths                | migration ops | ADMIN                         | admin-api                | migration-runner transitional to canonical | transitional         | converge_first             | confirm current production authority                 |
| apps/moneyshyft-api/src/routes/api/v1/route.ts          | route         | ROUTESHYFT                    | moneyshyft-api           | transitional follow-up only                | transitional         | transitional_keep_for_now  | live RouteShyft keeper; explicit transitional runtime |
| apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts   | route         | ROUTESHYFT                    | moneyshyft-api           | transitional follow-up only                | transitional         | transitional_keep_for_now  | live RouteShyft bridge keeper; do not treat as canonical MoneyShyft ownership |
| apps/moneyshyft-api/src/modules/route                   | module tree   | ROUTESHYFT                    | moneyshyft-api           | transitional follow-up only                | transitional         | transitional_keep_for_now  | backing module tree for the mounted RouteShyft runtime |
| apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue | web surface | ROUTESHYFT                | moneyshyft-web           | transitional follow-up only                | transitional         | transitional_keep_for_now  | live RouteShyft lifecycle UI remains intentionally mounted |
| apps/admin-api/src/routes/api/v1/route.ts               | route mirror  | ROUTESHYFT                    | deleted_after_slice_7    | none during current remediation            | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after MoneyShyft RouteShyft keepers were verified live |
| apps/admin-api/src/routes/api/v1/route-bridge.ts        | route mirror  | ROUTESHYFT                    | deleted_after_slice_7    | none during current remediation            | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after MoneyShyft RouteShyft keepers were verified live |
| apps/admin-api/src/modules/route                        | module mirror | ROUTESHYFT                    | deleted_after_slice_7    | none during current remediation            | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after stale mirror proof and RouteShyft non-regression verification |
| apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts | test mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 together with the ConnectShyft service mirror because it was the last remaining in-repo dependency |
| libs/platform/src/tenantModuleEntitlements.ts           | shared primitive | SHARED                     | shared                   | shared                                     | canonical            | safe_to_patch_live_authority_now | Slice 9 canonical shared entitlement subset used by ConnectShyft and MoneyShyft without app-to-app imports |
| libs/\*                                                 | shared        | SHARED                        | shared                   | shared                                     | canonical or unknown | documentation_only_for_now | confirm whether true shared infra only               |

---

## Required subsystem rows to add

### MoneyShyft API

- accounts
- transactions
- tags/categories
- debt
- income
- recurring
- RouteShyft artifacts
- any ConnectShyft artifacts

### ConnectShyft API

- routes
- threads
- messaging
- voice
- telnyx
- neighbors
- texting preference
- refusal logic

### Admin API

- tenant/org unit management
- feature/module controls
- migration controls
- any ConnectShyft-related helpers
- any mirrored feature logic

### Migration Runner

- Docker/build path
- knexfile/migration execution path
- shared migration source path

### Web apps

- MoneyShyft feature routes/components/stores
- ConnectShyft feature routes/components/stores
- Admin feature routes/components/stores
- RouteShyft artifacts inside MoneyShyft web

---

## Required outputs after inventory is filled

1. Runtime authority map
2. Duplication/divergence map
3. Intended-vs-actual authority map
4. Safe patch locations
5. Safe delete candidates
6. Areas blocked on convergence first
