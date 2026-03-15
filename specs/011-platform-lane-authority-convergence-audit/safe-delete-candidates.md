# Safe-Delete Candidates

## Safe-Delete Framework

A path is a safe-delete-after-convergence candidate only if all of the following are true:

1. No runtime route mount remains.
2. No frontend route or direct service dependency remains.
3. No build, packaging, or test harness depends on the path for live behavior verification.
4. A canonical replacement is already identified and is the only approved patch target.

## Current Candidate List

| Candidate | Current status | Preconditions before safe deletion |
| --- | --- | --- |
| Unmounted money/connect/route source trees inside `apps/admin-api/src` | `safe_after_convergence` as future cleanup only | Verify no imports, build inclusion, or runtime mounts remain; document canonical replacement paths. |
| Embedded admin views in `apps/moneyshyft-web/src/views/Admin` | `safe_after_convergence` as future cleanup only | Remove money-lane admin routes, keep `admin-web` as sole admin UI entry, and confirm no service dependency remains. |
| Money-hosted ConnectShyft API surface in `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` | `not_safe_now` | Resolve cross-host ConnectShyft authority and remove legacy runtime-host dependency first. |
| Money-lane RouteShyft backend and frontend artifacts | `not_safe_now` | Remove live mounts, live callers, schema dependence, and confirm canonical replacement. |

## Deletion Decisions

- Nothing in RouteShyft is safe to delete now.
- `admin-api` runtime-dead duplicate trees are the clearest future cleanup target, but still require a deliberate convergence pass.
- Money-lane embedded admin UI is a future cleanup target only after route and service delegation are reduced to canonical admin surfaces.
