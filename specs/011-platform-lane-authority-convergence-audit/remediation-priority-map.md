# Remediation Priority Map

## Safe to Patch Live Authority Now

| Area | Patch target | Why safe now |
| --- | --- | --- |
| Auth API | `apps/admin-api/src/routes/api/v1/auth.ts` | Public and intended authority align. |
| Platform-admin API | `apps/admin-api/src/routes/api/v1/platform-admin.ts` | Public and intended authority align. |
| Money domain API | `apps/moneyshyft-api/src/routes/api/v1/*` money-domain routes | Money lane owns these routes publicly and at runtime. |
| Money UI | `apps/moneyshyft-web/src/views/*` money views | Canonical money SPA behavior. |
| Connect-lane-only ConnectShyft API issues | `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` and supporting modules | Connect ingress points there and the host is live. |
| Shared production migrations | `shared/database/migrations` plus `apps/admin-api/scripts/packageSharedMigrations.js` when packaging must change | Shared migrations are canonical and `admin-api` is the current runner. |

## Fix Now Before Feature Work

| Area | Why it blocks later work | Immediate requirement |
| --- | --- | --- |
| Lane-local-only migration changes | Production schema work cannot safely land only in lane-local migration trees | Route new production schema changes through `shared/database/migrations` first |

## Converge First

| Area | Why convergence must happen first | Allowed interim patch scope |
| --- | --- | --- |
| Cross-host ConnectShyft backend behavior | `money-api` and `connect-api` both host live ConnectShyft behavior and diverge | Patch only the explicitly failing live host when the failure is local and well-scoped |
| Money-hosted auth/platform-admin mirrors | Public authority already delegates to `admin-api` | Do not patch mirrors for shared auth/admin behavior |
| Money-web embedded admin UI | Canonical admin UI is `admin-web`, but money web still mounts admin pages | Patch only mirror-specific money-lane regressions |
| RouteShyft removal or relocation | RouteShyft remains live in the money lane | Keep artifacts in place and patch only where the live behavior requires it |

## Documentation Only for Now

| Area | Why docs only |
| --- | --- |
| Dedicated `migration-runner` cutover | Implemented but not authorized by the deploy contract yet |
| Unmounted duplicate trees inside `admin-api` | Runtime-dead baggage should be documented before any cleanup plan |
| Metadata anomalies such as `apps/admin-api/project.json` `lane:connectshyft` tag | Worth recording, not a production patch target by itself |

## Priority Decisions

1. Safe patch targets are explicit and narrow.
2. Shared migration authority is canonical now; lane-local-only schema work is not acceptable.
3. Cross-host ConnectShyft backend work is the highest-risk convergence-first area.
