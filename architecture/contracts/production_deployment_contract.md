# Production Deployment Contract

## Scope

This contract applies to the current production deployment round for:
- Admin
- MoneyShyft
- ConnectShyft

It does not yet cover the rest of the commented-out lanes except where future-safe naming and port discipline matter.

## Runtime topology

- Host Nginx serves all SPAs and proxies API traffic.
- Host Postgres is a shared service.
- Node APIs run in Docker containers.
- Frontends are static builds served from disk.
- All API containers bind to `127.0.0.1` only.
- No per-lane production Postgres containers.

## Temporary platform authority

- `admin-web` is the temporary shell host.
- `admin-api` is the temporary auth and platform-admin authority.
- lane apps must delegate auth and platform-admin traffic to `admin-api`.

## Canonical service map

### Domains
- `admin.shyftunity.com`
- `money.shyftunity.com`
- `connect.shyftunity.com`

### Frontend build roots
- `/home/jeremiahotis/projects/shyftunity/apps/admin-web/dist`
- `/home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web/dist`
- `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`

### API loopback ports
- `admin-api` -> `127.0.0.1:3100`
- `money-api` -> `127.0.0.1:3000`
- `connect-api` -> `127.0.0.1:3002`

## Routing contract

### Admin
- `/api/*` -> `admin-api`

### Money
- `/api/v1/auth/*` -> `admin-api`
- `/api/v1/platform/admin/*` -> `admin-api`
- all other `/api/*` -> `money-api`

### Connect
- `/api/v1/auth/*` -> `admin-api`
- `/api/v1/platform/admin/*` -> `admin-api`
- all other `/api/*` -> `connect-api`

### Route matching order

Apply route ownership matching in this order for each lane host:

1. `/api/v1/auth/*`
2. `/api/v1/platform/admin/*`
3. all other `/api/*`

### Routing validation requirements

- Delegated auth and platform-admin routes on money and connect must resolve to `admin-api`.
- Lane-local API routes must resolve to the lane API (`money-api` or `connect-api`).
- Any routing policy deviation requires contract amendment before rollout.

## Shared Postgres contract

- one shared database is used by Admin, MoneyShyft, and ConnectShyft
- DB connection from containers uses `host.docker.internal` with host-gateway mapping
- Postgres must listen for host and Docker bridge traffic as needed
- production secrets live outside git in `/opt/shyftunity/env/*.env`

## Migration and seed contract

### Current temporary rule
- `admin-api` is the only production migration runner
- `admin-api` is the only production seed runner
- MoneyShyft and ConnectShyft do not run their own production migration commands

### Future permanent rule
- one centralized shared DB package owns migrations and seeds
- one root-level production migration command exists
- CI blocks new app-local migration drift

## Capability and access contract

- top-level visibility depends on tenant enablement plus relevant read capability
- auth, tenant resolution, and platform-admin capability evaluation resolve through `admin-api`
- deployment acceptance tests must verify both route wiring and visibility behavior

## Standardized API packaging contract

Every deployable API must provide:
- `Dockerfile.production`
- deterministic dependency installation
- build step
- production start command
- health endpoint
- explicit port
- memory cap via `NODE_OPTIONS=--max-old-space-size=384`
- external env file support

## Standardized frontend packaging contract

Every deployable frontend must provide:
- `npm ci` clean install
- build output to `dist/`
- static SPA compatibility with Nginx `try_files`

## Deferred items

These are not part of this deployment contract round:
- permanent shell extraction into a dedicated shell app
- full People / Household / Address / Finance domain rollout
- event bus implementation
- full shared UI package rollout
- full token system rollout
