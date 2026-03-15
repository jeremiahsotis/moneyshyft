# Evidence Index

## Runtime and Ingress Sources

| Category | Primary Evidence |
| --- | --- |
| Public ingress and lane delegation | `nginx/host-managed-subdomains.example.conf` |
| Container topology and canonical loopback ports | `specs/platform/contracts/docker-compose.production.shared.yml` |
| Production deployment contract | `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` |
| Deployment checklist and validation targets | `docs/DEPLOYMENT_CHECKLIST.md` |

## Lane Runtime Sources

| Surface | Primary Evidence |
| --- | --- |
| `money-api` | `apps/moneyshyft-api/src/app.ts`, `apps/moneyshyft-api/src/server.ts`, `apps/moneyshyft-api/src/api/registerRoutes.ts` |
| `connect-api` | `apps/connectshyft-api/src/app.ts`, `apps/connectshyft-api/src/server.ts`, `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` |
| `admin-api` | `apps/admin-api/src/app.ts`, `apps/admin-api/src/server.ts`, `apps/admin-api/src/api/registerRoutes.ts` |
| `moneyshyft-web` | `apps/moneyshyft-web/src/router/index.ts`, `apps/moneyshyft-web/vite.config.ts`, `apps/moneyshyft-web/src/services/api.ts` |
| `migration-runner` | `apps/migration-runner/package.json`, `apps/migration-runner/knexfile.js`, `apps/migration-runner/Dockerfile` |

## Build and Packaging Sources

| Surface | Primary Evidence |
| --- | --- |
| `money-api` packaging | `apps/moneyshyft-api/Dockerfile.production`, `apps/moneyshyft-api/package.json`, `apps/moneyshyft-api/knexfile.js` |
| `connect-api` packaging | `apps/connectshyft-api/Dockerfile.production`, `apps/connectshyft-api/package.json`, `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js`, `apps/connectshyft-api/tsconfig.json` |
| `admin-api` packaging | `apps/admin-api/Dockerfile.production`, `apps/admin-api/package.json`, `apps/admin-api/scripts/packageSharedMigrations.js`, `apps/admin-api/knexfile.js` |
| Web build paths | `apps/moneyshyft-web/package.json`, `apps/admin-web/package.json`, `apps/connectshyft-web/package.json`, `apps/moneyshyft-web/vite.config.ts` |

## Migration Sources

| Category | Primary Evidence |
| --- | --- |
| Shared production authority | `shared/database/migrations` |
| Current production runner | `apps/admin-api/knexfile.js`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` |
| Transitional future runner | `apps/migration-runner/knexfile.js`, `apps/migration-runner/Dockerfile` |
| Lane-local migration assumptions | `apps/moneyshyft-api/knexfile.js`, `apps/connectshyft-api/knexfile.js`, `apps/admin-api/src/migrations`, `apps/moneyshyft-api/src/migrations`, `apps/connectshyft-api/src/migrations` |

## RouteShyft Sources

| Category | Primary Evidence |
| --- | --- |
| Backend route entrypoints | `apps/moneyshyft-api/src/routes/api/v1/route.ts`, `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts` |
| Backend module tree | `apps/moneyshyft-api/src/modules/route` |
| Frontend surface | `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`, `apps/moneyshyft-web/src/router/index.ts` |
| RouteShyft schema traces | `apps/moneyshyft-api/src/migrations/20260224153000_create_route_commitments_and_transition_audit.ts`, `apps/moneyshyft-api/src/migrations/20260225120000_create_route_commitments_and_intake_requests.ts`, `apps/moneyshyft-api/src/migrations/20260227170000_create_route_refusal_persistence.ts` |

## Duplication Quantification Sources

| Comparison | Method |
| --- | --- |
| `money-api` vs `admin-api` | Relative-path overlap count plus `cmp` identical-file count across `src/` trees |
| `money-api` vs `connect-api` | Relative-path overlap count plus `cmp` identical-file count across `src/` trees |
| `moneyshyft-web` vs `admin-web` | Relative-path overlap count plus `cmp` identical-file count across `src/` trees |
