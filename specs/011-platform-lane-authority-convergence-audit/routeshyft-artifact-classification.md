# RouteShyft Artifact Classification

## Artifact Records

| Artifact key | Repo path | Artifact type | Actual runtime status | Dependency status | Classification | Safe patch location | Removal gate | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `route_api` | `apps/moneyshyft-api/src/routes/api/v1/route.ts` | `api_route` | `live` | Called by money-lane RouteShyft frontend and covered by route tests | `transitional_keep_for_now` | `apps/moneyshyft-api/src/routes/api/v1/route.ts` | Unmount the route, remove frontend callers, remove live schema dependency, and confirm canonical replacement | Keep for now; patch only for live route behavior. |
| `route_bridge_api` | `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` | `api_route` | `live` | Backed by route-bridge tests and cutover logic | `transitional_keep_for_now` | `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` | Remove bridge callers, cutover dependency, and live route mount before deletion | Keep for now; bridge logic is still live. |
| `route_module_tree` | `apps/moneyshyft-api/src/modules/route` | `module_tree` | `live` | Required by route and route-bridge entrypoints | `transitional_keep_for_now` | `apps/moneyshyft-api/src/modules/route/...` | Remove live route mounts and dependent imports first | Keep for now; backend routes depend on it directly. |
| `route_frontend_view` | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue` | `frontend_view` | `live` | Mounted at `/app/route/requests` | `transitional_keep_for_now` | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue` | Remove router mount and API dependencies, then confirm replacement | Keep for now; still a live frontend route. |
| `route_schema_traces` | `apps/moneyshyft-api/src/migrations/20260224153000_create_route_commitments_and_transition_audit.ts`, `20260225120000_create_route_commitments_and_intake_requests.ts`, `20260227170000_create_route_refusal_persistence.ts` | `migration` | `live` | Schema still underpins live RouteShyft behavior | `transitional_keep_for_now` | `shared/database/migrations` for canonical schema follow-up; do not patch lane-local-only | Remove live route behavior and shared schema dependency before deletion | Keep for now; schema is still live. |

## RouteShyft Decisions

- No RouteShyft artifact currently qualifies for `safe_delete_after_convergence`.
- RouteShyft remains a live money-lane concern, not dead code.
- Safe patching is allowed only in the live host artifact itself and only for narrowly scoped behavior.
