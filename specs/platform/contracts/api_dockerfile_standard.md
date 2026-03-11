# API Dockerfile Standard

## Immediate standard

All production API Dockerfiles must:
- use `node:20-alpine`
- build inside Docker
- prune dev dependencies after build
- set `NODE_ENV=production`
- set `NODE_OPTIONS=--max-old-space-size=384`
- expose the correct canonical port
- start via `node dist/server.js`

## Current required files
- `apps/admin-api/Dockerfile.production`
- `apps/moneyshyft-api/Dockerfile.production`
- `apps/connectshyft-api/Dockerfile.production`

## Current repo caveat

If `connectshyft-api` does not have a `package-lock.json`, `npm ci` cannot be used. That must be corrected if deterministic production installs are required.

## Best-practice next step

Unify all API container builds around one workspace-aware production build path rather than app-local drift.
