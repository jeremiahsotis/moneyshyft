# Classification Matrix

## Subsystem Records

| Surface key | Actual runtime authority | Intended authority | Classification | Runtime status | Safe patch location | Remediation recommendation | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `auth_api` | `admin-api` | `admin-api` | `canonical` | `live` | `apps/admin-api/src/routes/api/v1/auth.ts` | `safe_to_patch_live_authority_now` | Auth authority is aligned by ingress, route mount, and constitution. |
| `platform_admin_api` | `admin-api` | `admin-api` | `canonical` | `live` | `apps/admin-api/src/routes/api/v1/platform-admin.ts` | `safe_to_patch_live_authority_now` | Platform-admin authority is aligned by ingress, route mount, and constitution. |
| `money_domain_api` | `money-api` | `money-api` | `canonical` | `live` | `apps/moneyshyft-api/src/routes/api/v1/*` money-domain routes | `safe_to_patch_live_authority_now` | Money lane business routes are money-lane canonical behavior. |
| `money_ui` | `moneyshyft-web` | `moneyshyft-web` | `canonical` | `live` | `apps/moneyshyft-web/src/views/*` money views | `safe_to_patch_live_authority_now` | Money lane SPA is canonical for money-facing UI. |
| `money_host_auth_mirror` | `money-api` code mount only; public ingress delegates away | `admin-api` | `mirrored_diverged` | `delegated` | `do not patch here; patch canonical authority` | `converge_first` | Live shipped mirror exists, but public authority belongs to `admin-api`. |
| `money_host_platform_admin_mirror` | `money-api` code mount only; public ingress delegates away | `admin-api` | `mirrored_diverged` | `delegated` | `do not patch here; patch canonical authority` | `converge_first` | Same delegated-mirror pattern as money-hosted auth. |
| `money_web_admin_ui_mirror` | `moneyshyft-web` | `admin-web` | `mirrored_diverged` | `live` | `legacy-only patch allowed for explicitly scoped host behavior` | `converge_first` | Money lane still mounts admin entrypoints, but canonical admin UI remains `admin-web`. |
| `connect_api_surface` | `connect-api` public ingress | `connect-api` | `canonical` | `live` | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` for connect-lane-only behavior | `safe_to_patch_live_authority_now` | Connect ingress and route mount align for the connect-lane surface itself. |
| `money_host_connectshyft_surface` | `money-api` | `connect-api` | `transitional` | `live` | `legacy-only patch allowed for explicitly scoped host behavior` | `converge_first` | Money lane still hosts live ConnectShyft behavior named by the runtime-host contract. |
| `connectshyft_backend_cross_host` | Split across `money-api` and `connect-api` | `connect-api` | `mirrored_diverged` | `live` | `do not patch here; patch only the explicitly failing live host or converge first` | `converge_first` | Cross-host ConnectShyft behavior remains unresolved and patch-risky. |
| `shared_production_migrations` | `shared/database/migrations` | `shared/database/migrations` | `canonical` | `live` | `shared/database/migrations` | `safe_to_patch_live_authority_now` | Shared migrations are the only canonical production migration source. |
| `admin_api_migration_runner` | `admin-api` | `admin-api` for current production phase | `canonical` | `live` | `apps/admin-api/knexfile.js` and shared migration packaging path | `safe_to_patch_live_authority_now` | Production migration execution still belongs to `admin-api`. |
| `dedicated_migration_runner` | Implemented but inactive | Future dedicated runner | `transitional` | `future_ready` | `do not patch here; patch current authority or document cutover` | `documentation_only_for_now` | Future-ready only until deploy contract authorizes cutover. |
| `lane_local_migration_trees` | Lane-local source trees | Shared authority | `transitional` | `unmounted` | `do not patch here; patch canonical authority` | `fix_now_before_feature_work` | New production-relevant schema changes must not land only in lane-local trees. |
| `admin_api_unmounted_duplicate_trees` | `admin-api` source only | None | `dead_stale` | `unmounted` | `do not patch here; patch canonical authority` | `documentation_only_for_now` | Unmounted money/connect/route trees inside `admin-api` are runtime-dead baggage. |

## Classification Notes

- `blocked` is not a classification value. Blocked-area status is recorded separately in the remediation and blocked-area outputs.
- `connect_api_surface` is canonical only for the connect-lane API surface; the cross-host ConnectShyft backend remains a separate `mirrored_diverged` problem.
- Transitional surfaces may still be live and patchable, but only for narrowly scoped host-specific behavior.
