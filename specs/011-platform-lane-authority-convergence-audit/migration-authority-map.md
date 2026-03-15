# Migration Authority Map

## Authority and Runner Records

| Area | Current state | Decision |
| --- | --- | --- |
| Production migration source | `shared/database/migrations` contains 60 migration files | Treat as the only canonical production migration authority. |
| Current production runner | `admin-api` packages shared migrations into `dist/shared/database/migrations` and the production runbook executes `docker compose run --rm admin-api npm run migrate:latest:prod` | `admin-api` remains the authorized production runner for the current platform phase. |
| Dedicated `migration-runner` | One-shot image exists and expects `/app/shared/database/migrations`, but no deploy contract makes it active | Treat as implemented, future-ready, and non-authoritative for now. |
| `connect-api` lane-local migrations | 60 lane-local files match the 60 shared files exactly | Treat as packaging mirror only, not a separate production authority. |
| `money-api` lane-local migrations | 56 lane-local files mirror 56 shared files; production execution is blocked in `knexfile.js` | Treat as transitional lane-local baggage. |
| `admin-api` lane-local migrations | 56 lane-local files mirror 56 shared files, but packaged shared migrations are the runtime source | Treat as transitional source baggage; packaged shared migrations matter for production. |

## Remaining Lane-Local Assumptions

- `apps/moneyshyft-api/knexfile.js` still points production migrations at `dist/migrations`, even though production execution is blocked there.
- `apps/connectshyft-api/knexfile.js` still points production migrations at `dist/migrations`, even though production execution is blocked there.
- `apps/admin-api/src/migrations`, `apps/moneyshyft-api/src/migrations`, and `apps/connectshyft-api/src/migrations` still exist and can mislead future patch placement unless shared authority is made explicit.

## Build and Packaging Dependence

| Surface | Build/package dependence |
| --- | --- |
| `admin-api` | Packages shared migrations into runtime artifact via `scripts/packageSharedMigrations.js`; this is production-relevant. |
| `money-api` | Ships `knexfile.js` and `scripts`, but production migration execution is blocked by guard logic. |
| `connect-api` | Ships `knexfile.js` and `scripts`, but production migration execution is blocked by guard logic. |
| `migration-runner` | Flattens shared authority directly into `/app/shared/database/migrations`. |

## Migration Decisions

- Answer 1: Yes, `admin-api` is still the current production migration runner.
- Answer 2: `migration-runner` is implemented but not yet authoritative.
- Answer 3: Yes, lane-local migration assumptions still remain in build and source trees.
- Answer 4: Yes, shared migrations are the only authoritative production migration source.
- Answer 5: Yes, build/package paths still depend on lane-local migration logic in some apps even though production authority is shared.

## Shared Postgres and Runner Validation

| Validation target | Evidence | Result |
| --- | --- | --- |
| Shared Postgres remains the production database target | Deployment guide environment examples set `DATABASE_URL` for all three APIs to the shared host Postgres database; compose contract assumes host-managed Postgres | Pass |
| Production migrations run from `admin-api` only | Deployment guide and checklist both instruct `docker compose run --rm admin-api npm run migrate:latest:prod` and prohibit lane-local production execution | Pass |
| Lane APIs do not own independent production migrations | `money-api` and `connect-api` `knexfile.js` files block production migration or seed execution | Pass |
| `migration-runner` is not yet active authority | Dedicated runner exists, but no deployment contract or checklist step swaps execution to it | Pass |
