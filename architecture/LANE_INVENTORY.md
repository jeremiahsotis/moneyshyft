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
| apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts   | route         | CONNECTSHYFT                  | deleted_after_slice_10   | connectshyft-api                           | dead_stale           | safe_delete_after_convergence | deleted in Slice 10 after the MoneyShyft-only provider-registry, neighbors, and identity-match coverage moved to canonical ConnectShyft tests and no in-repo importer remained |
| apps/moneyshyft-api/src/modules/connectshyft            | module tree   | CONNECTSHYFT                  | unmounted_in_moneyshyft  | connectshyft-api                           | transitional         | converge_first             | closure audit confirmed the tree still diverges from canonical ConnectShyft and remains anchored by `src/__tests__/connectshyft.identity-dedupe.test.ts` and `src/__tests__/connectshyft.identity-boundary.test.ts` |
| apps/moneyshyft-api/src/modules/connectshyft/__tests__  | test mirror   | CONNECTSHYFT                  | non_runtime_test_only    | connectshyft-api canonical tests preferred | transitional         | safe_delete_after_convergence | closure audit confirmed the retained module-test mirror still exists, still diverges from canonical ConnectShyft module tests, and remains part of the bounded final cleanup set |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft*.test.ts except route-ownership | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | documentation_only_for_now | closure audit confirmed Slice 10 deleted every route-test member of this broad glob except the explicitly excluded `connectshyft.route-ownership.test.ts`; this row should no longer be treated as an open blocker |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts | test helper mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after the provider-registry route integration suite moved to `apps/connectshyft-api/src/routes/api/v1/__tests__` and the helper no longer had MoneyShyft dependents |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after its canonical dispatch-and-events assertions moved to `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after its surviving route-level provider guardrail assertions moved to `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`; the DB-backed number-mapping contract case was retired because canonical module tests already cover that behavior |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after review showed its number-mapping and correlation resolution behavior is already covered by canonical module tests in `apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts` and `providerCorrelationMappings.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after review showed its ambiguity/not-found correlation behavior is already covered by canonical module tests in `apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts` and `providerCorrelationMappings.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after review showed its replay suppression and provider-correlation coverage is already represented by canonical module tests in `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after the canonical provider-registry entrypoint retained only the surviving dispatch and guardrail route assertions under `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after proof showed it exercised stale `prefersTexting` passthrough expectations that no longer match canonical ConnectShyft route behavior |
| apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts | test mirror | CONNECTSHYFT | deleted_after_slice_10 | connectshyft-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after its route assertions moved to `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` with canonical entitlement wiring |
| apps/moneyshyft-api/src/services/PlatformAdminService.ts | service mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api for full service behavior; `libs/platform/src/tenantModuleEntitlements.ts` for shared entitlement subset | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, and the duplicate MoneyShyft service test were removed |
| apps/connectshyft-api/src/routes/api/v1/connectshyft.ts | route         | CONNECTSHYFT                  | connectshyft-api         | connectshyft-api                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft API route owner           |
| apps/connectshyft-api/src/modules/connectshyft          | module tree   | CONNECTSHYFT                  | connectshyft-api         | connectshyft-api                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft module tree pending convergence proof |
| apps/connectshyft-api/src/services/PlatformAdminService.ts | service mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api for full service behavior; `libs/platform/src/tenantModuleEntitlements.ts` for shared entitlement subset | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after proof confirmed only the paired stale service test still imported it |
| apps/admin-api/src/routes/api/v1/connectshyft.ts        | route         | CONNECTSHYFT                  | deleted_after_slice_7    | connectshyft-api                           | dead_stale           | safe_delete_after_convergence | deleted in Slice 7 after ConnectShyft canonical owner verification |
| apps/admin-api/src/modules/connectshyft                 | module tree   | CONNECTSHYFT support mirror   | unmounted_in_admin       | connectshyft-api                           | transitional         | converge_first             | closure audit confirmed the tree still diverges from canonical ConnectShyft and remains anchored by `routes/api/v1/platform-admin-console.ts`, its route test, and the admin identity-boundary test pair |
| apps/admin-api/src/modules/connectshyft/__tests__       | test mirror   | CONNECTSHYFT support mirror   | non_runtime_test_only    | connectshyft-api canonical tests preferred | transitional         | safe_delete_after_convergence | closure audit confirmed the retained module-test mirror still exists, still diverges from canonical ConnectShyft module tests, and remains part of the bounded final cleanup set |
| apps/connectshyft-web/src/router/index.ts `/app/connectshyft/*` | web route | CONNECTSHYFT                | connectshyft-web         | connectshyft-web                           | canonical            | safe_to_patch_live_authority_now | canonical ConnectShyft SPA route owner          |
| apps/admin-api/src/routes/api/v1/auth.ts                | route         | ADMIN                         | admin-api                | admin-api                                  | canonical            | safe_to_patch_live_authority_now | canonical auth runtime owner                     |
| apps/admin-api/src/routes/api/v1/platform-admin.ts      | route         | ADMIN                         | admin-api                | admin-api                                  | canonical            | safe_to_patch_live_authority_now | canonical platform-admin API owner               |
| apps/admin-web/src/router/index.ts `/admin/*`           | web route     | ADMIN                         | admin-web                | admin-web                                  | canonical            | safe_to_patch_live_authority_now | canonical admin SPA route owner                  |
| apps/admin-web/src/views/{Accounts,Budget,Dashboard,Debts,Goals,Scenarios,Transactions} | web mirror | MONEYSHYFT support mirror | deleted_after_slice_8 | moneyshyft-web | dead_stale | safe_delete_after_convergence | deleted in Slice 8 after router/import/test proof confirmed no live admin-web dependency |
| apps/moneyshyft-api/src/routes/api/v1/auth.ts           | route         | ADMIN                         | deleted_after_slice_10   | admin-api                                  | dead_stale           | safe_delete_after_convergence | deleted in Slice 10 after `src/__tests__/apiEnvelopeContract.test.ts` stopped mounting the MoneyShyft auth router and `platform-contracts.ts` repointed its auth-path evidence to the admin canonical route |
| apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts | test mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api canonical tests preferred | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after proof showed it was byte-for-byte duplicate coverage of `apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts` |
| apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts | route mirror | ADMIN entitlement mirror | deleted_after_slice_10 | admin-api | dead_stale | safe_delete_after_convergence | deleted in Slice 10 after repo scans confirmed no hidden importer and the file only kept the stale MoneyShyft service mirror alive |
| apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts | route         | ADMIN                         | deleted_after_slice_8    | admin-api                                  | dead_stale           | safe_delete_after_convergence | deleted in Slice 8 after route/import/test proof confirmed no remaining MoneyShyft dependency |
| apps/moneyshyft-web/src/router/index.ts `/admin/*`      | web route     | ADMIN                         | external_redirect_only   | admin-web                                  | resolved_redirect_only | documentation_only_for_now | closure audit confirmed redirect-only handoff to admin-web via `src/utils/adminAppUrl.ts`; no local admin view tree remains under `apps/moneyshyft-web/src` |
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
