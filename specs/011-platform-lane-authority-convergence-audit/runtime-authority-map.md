# Runtime Authority Map

## Evidence Rules

- Public ingress and route delegation win over folder-name intent.
- Mounted runtime surfaces determine what is still live inside each lane.
- Build and packaging paths determine whether a surface is still shipped even when public ingress delegates elsewhere.

## Covered Surfaces

| Surface | Public ingress / serving surface | Mounted runtime surface | Build / package runtime path | Actual runtime authority | Runtime status | Safe patch target now | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `money-api` | `money.shyftunity.com /api/* -> money_api:3000`, except delegated `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin_api` | Registers `/api/v1/platform`, `/api/v1/platform/admin`, `/api/v1/route`, `/api/v1/route-bridge`, `/api/v1/connectshyft`, `/api/v1/auth`, and money-domain routes | `apps/moneyshyft-api/Dockerfile.production` ships `dist/server.js`, `dist`, `knexfile.js`, and `scripts` | Canonical money-domain API authority; also hosts live transitional RouteShyft and mirrored ConnectShyft/admin surfaces | `live` | Patch money-domain behavior in `apps/moneyshyft-api`; do not treat mirrored auth/admin/connect surfaces as canonical | `nginx/host-managed-subdomains.example.conf`, `apps/moneyshyft-api/src/api/registerRoutes.ts`, `apps/moneyshyft-api/src/app.ts`, `apps/moneyshyft-api/src/server.ts`, `apps/moneyshyft-api/Dockerfile.production` |
| `moneyshyft-web` | `money.shyftunity.com -> apps/moneyshyft-web/dist` | Router mounts money views, `/admin/system`, `/admin/tenant`, and `/app/route/requests` | Vite proxies `/api/v1/auth` and `/api/v1/platform/admin` to admin target; all other `/api` to money target | Canonical money UI authority, plus live mirrored admin UI entrypoints and a live RouteShyft page | `live` | Patch money UI in `apps/moneyshyft-web`; mirror-only admin or RouteShyft fixes stay scoped there | `nginx/host-managed-subdomains.example.conf`, `apps/moneyshyft-web/src/router/index.ts`, `apps/moneyshyft-web/vite.config.ts`, `apps/moneyshyft-web/src/services/api.ts`, `apps/moneyshyft-web/src/services/platformAdmin.ts` |
| `connect-api` | `connect.shyftunity.com /api/* -> connect_api:3002`, except delegated `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin_api` | App mounts only `/api/v1/connectshyft` | Docker image runs `dist/server.js`; build script also writes bootstrap `dist/server.js` from `apps/connectshyft-api/src/server.ts` | Canonical connect-lane ingress target, but not the only live ConnectShyft backend host in repo reality | `live` | Patch connect-lane-only behavior in `apps/connectshyft-api`; cross-host ConnectShyft changes require convergence-first handling | `nginx/host-managed-subdomains.example.conf`, `apps/connectshyft-api/src/app.ts`, `apps/connectshyft-api/src/server.ts`, `apps/connectshyft-api/Dockerfile.production`, `apps/connectshyft-api/scripts/writeDistServerEntrypoint.js`, `architecture/connectshyft/runtime-host-reality-contract.md` |
| `admin-api` | `admin.shyftunity.com /api/* -> admin_api:3100` | Registers `/api/v1/platform`, `/api/v1/platform/admin`, and `/api/v1/auth` only | Docker image ships `dist/server.js`; build packages `shared/database/migrations` into `dist/shared/database/migrations` | Canonical auth, platform-admin, and current production migration authority | `live` | Patch `apps/admin-api` for auth, platform-admin, and current production migration runner behavior | `nginx/host-managed-subdomains.example.conf`, `apps/admin-api/src/api/registerRoutes.ts`, `apps/admin-api/src/app.ts`, `apps/admin-api/src/server.ts`, `apps/admin-api/knexfile.js`, `apps/admin-api/scripts/packageSharedMigrations.js`, `apps/admin-api/Dockerfile.production` |
| `migration-runner` | No public ingress | No HTTP surface; one-shot `npm run migrate:latest` container | Docker image flattens `/app/shared/database/migrations` and runs `knexfile.js` from image root | Transitional future runner only; not current production authority | `future_ready` | Do not patch as active production authority; use only for future cutover work or documentation | `apps/migration-runner/package.json`, `apps/migration-runner/knexfile.js`, `apps/migration-runner/Dockerfile`, `architecture/platform/migration-authority-and-runner-audit-note.md` |

## Embedded Live Surfaces Inside Covered Lanes

| Embedded surface | Host lane | Why it matters |
| --- | --- | --- |
| `/api/v1/auth` and `/api/v1/platform/admin` routers inside `money-api` | `money-api` | Public ingress delegates away, but the code is still mounted and shipped; treat as mirrored live baggage, not canonical authority. |
| `/api/v1/connectshyft` inside `money-api` | `money-api` | Still mounted and still named as the current runtime host in the ConnectShyft runtime-host contract. |
| `/api/v1/route` and `/api/v1/route-bridge` inside `money-api` | `money-api` | RouteShyft remains live and dependency-bearing in the money lane. |
| `/admin/system` and `/admin/tenant` inside `moneyshyft-web` | `moneyshyft-web` | Live mirrored admin entrypoints backed by admin APIs. |
| `/app/route/requests` inside `moneyshyft-web` | `moneyshyft-web` | Live RouteShyft frontend artifact backed by money-lane route APIs. |

## Runtime Decisions

- `money-api` is the canonical money-domain runtime, but it also contains live transitional RouteShyft and mirrored ConnectShyft/admin surfaces.
- `admin-api` is the canonical auth and platform-admin authority, and the public ingress contract already delegates those paths there.
- `connect-api` is the public connect-lane API surface, but ConnectShyft backend reality is still split because `money-api` also mounts live ConnectShyft routes.
- `migration-runner` is implemented and packaged, but there is no evidence that production has cut over to it yet.
- `money-api` currently registers `/api/v1/route` twice; keep that anomaly visible in downstream docs because it confirms RouteShyft is still actively wired.

## Canonical Port and Binding Validation

| Surface | Canonical port evidence | Loopback binding evidence | Result |
| --- | --- | --- | --- |
| `admin-api` | `admin-api` server enforces port `3100`; compose maps `127.0.0.1:3100:3100`; nginx upstream points to `127.0.0.1:3100` | `apps/admin-api/src/server.ts` throws in production if host is not local-interface compatible | Pass |
| `money-api` | `money-api` server enforces port `3000`; compose maps `127.0.0.1:3000:3000`; nginx upstream points to `127.0.0.1:3000` | `apps/moneyshyft-api/src/server.ts` throws in production if host is not local-interface compatible | Pass |
| `connect-api` | `connect-api` server enforces port `3002`; compose maps `127.0.0.1:3002:3002`; nginx upstream points to `127.0.0.1:3002` | `apps/connectshyft-api/src/server.ts` throws in production if host is not local-interface compatible | Pass |
