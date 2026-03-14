# Production Runbook

## Scope

This runbook defines one reproducible production deployment sequence for this round only.

In scope:
- admin lane
- money lane
- connect lane

Deployment model covered in this runbook:
- host-managed Nginx
- shared host-managed Postgres
- Dockerized Node APIs
- static frontend builds published on the host

Out of scope for this runbook:
- future lanes
- future domain architecture changes
- alternate deployment models

## Authoritative migration runner

- Production migrations run once per deployment cycle.
- `admin-api` is the authoritative migration runner.
- `money-api` and `connect-api` must not run production migration commands.

## Reproducible sequence

1. Prerequisites
   - Confirm host access, Docker/Compose availability, and Nginx access.
   - Confirm production env files are present for admin, money, and connect APIs.
   - Confirm the shared host Postgres service is reachable.

2. Environment preparation
   - Pull latest code for this release on the deployment host.
   - Confirm lane-specific frontend publish paths and API env file paths.
   - Confirm Docker host-gateway configuration needed for DB connectivity.

3. Frontend build and publish
   - Build `admin-web`, `moneyshyft-web`, and `connectshyft-web` static bundles.
   - Publish each built `dist/` output to its production host path.

4. API image build
   - Build production Docker images for `admin-api`, `money-api`, and `connect-api`.
   - Ensure each API image uses production Dockerfile and production env contract.

5. Migration execution (single authority)
   - Run production migrations once from `admin-api` only.
   - Record migration success before starting or restarting APIs.

6. Service start or restart
   - Start or restart `admin-api`, `money-api`, and `connect-api` containers.
   - Confirm APIs bind to loopback-only host ports.

7. Nginx validation and reload
   - Validate Nginx configuration syntax.
   - Verify lane routing targets for admin, money, and connect.
   - Reload Nginx after successful validation.

8. Verification checks
   - Verify each lane frontend is served from its host-published static build.
   - Verify health endpoints for `admin-api`, `money-api`, and `connect-api`.
   - Verify delegated route behavior and lane-local API behavior match contract.
   - Verify no undocumented manual correction steps were required.
