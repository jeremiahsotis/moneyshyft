# Developer Execution Packet

This is the work order for the current round.

## Objective

Tighten production deployment for:
- `admin`
- `money`
- `connect`

Using:
- host Nginx
- host shared Postgres
- Dockerized Node APIs
- static frontends served by Nginx

## Non-negotiable architecture contract

- Host Nginx remains the reverse proxy and static file server.
- Host Postgres remains the shared production database.
- APIs run in Docker containers bound to loopback only.
- Frontends are built to static `dist/` output and served by host Nginx.
- `admin.shyftunity.com` is the temporary shell host and platform auth authority.
- `money.shyftunity.com` and `connect.shyftunity.com` must delegate `/api/v1/auth/*` and `/api/v1/platform/admin/*` to `admin-api`.
- Lane-specific `/api/*` traffic routes to the lane API.
- No Postgres container in production for these lanes.

## Canonical ports and paths

### API ports
- `admin-api` -> `3100`
- `moneyshyft-api` -> `3000`
- `connectshyft-api` -> `3002`

### Required environment artifacts (spec 001 deployment-tightening scope only)
This list is explicit and complete for this round. It is limited to the current three-lane deployment model and must not expand into future lanes, future domains, or unrelated infrastructure.

#### Lane API env files (required)
- `/opt/shyftunity/env/admin-api.env`
- `/opt/shyftunity/env/moneyshyft-api.env`
- `/opt/shyftunity/env/connectshyft-api.env`

#### Required lane API env posture
- Shared host Postgres connectivity is required via `host.docker.internal` with host-gateway mapping.
- Each lane API env must set its canonical lane API port: `admin-api=3100`, `moneyshyft-api=3000`, `connectshyft-api=3002`.
- Scope remains the three lanes only: `admin`, `money`, and `connect`.

#### Current lane frontend URLs and static roots (where relevant)
- `https://admin.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/admin-web/dist`
- `https://money.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web/dist`
- `https://connect.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`

This artifact contract remains aligned to the current deployment model only: host Nginx, host Postgres, Dockerized Node APIs, static frontend builds, and the three-lane scope.

## Required implementation work

### 1. Normalize names and paths
Current deployment assets must stop mixing:
- `money-web` vs `moneyshyft-web`
- `connect-web` vs `connectshyft-web`

Canonical names must match the repo and deployment docs.

### 2. Standardize production Dockerfiles
Deliver or correct:
- `apps/admin-api/Dockerfile.production`
- `apps/moneyshyft-api/Dockerfile.production`
- `apps/connectshyft-api/Dockerfile.production`

All three must follow the same install, build, prune, and start pattern.

### 3. Add missing ConnectShyft production container support
Deliver:
- `apps/connectshyft-api/Dockerfile.production`
- deterministic dependency install for `connectshyft-api`
- correct exposed port and runtime start command

### 4. Correct Nginx routing behavior for Money and Connect
Add explicit admin/auth route delegation.

#### Money domain routing
- `/api/v1/auth/*` -> `admin-api`
- `/api/v1/platform/admin/*` -> `admin-api`
- other `/api/*` -> `moneyshyft-api`

#### Connect domain routing
- `/api/v1/auth/*` -> `admin-api`
- `/api/v1/platform/admin/*` -> `admin-api`
- other `/api/*` -> `connectshyft-api`

### 5. Produce shared production compose file
Deliver one production compose file for:
- `admin-api`
- `moneyshyft-api`
- `connectshyft-api`

Requirements:
- loopback-only bindings
- host gateway mapping for shared Postgres
- health checks
- log rotation
- restart policy

### 6. Lock shared host Postgres connectivity
Containers must connect to host Postgres using host gateway mapping.

Required posture:
- use `host.docker.internal` plus `extra_hosts: host-gateway`
- do not use container-local `127.0.0.1` for DB access
- docs must explain this clearly

### 7. Temporary migration authority
Until DB centralization is done:
- `admin-api` is the only migration runner in production
- MoneyShyft and ConnectShyft do not run their own production migrations

### 8. Centralize DB ownership next
Developer must also provide the design for the next step:
- one shared DB package or top-level `/db`
- one authoritative migration tree
- one authoritative seed tree
- one root-level production migration command
- CI guardrails preventing new migration drift under `apps/*`

## Acceptance criteria

### Admin
- `https://admin.shyftunity.com` serves admin web
- `/api/*` on admin routes to `admin-api`
- login and platform-admin endpoints resolve correctly

### Money
- `https://money.shyftunity.com` serves MoneyShyft web
- `/api/v1/auth/*` on money routes to `admin-api`
- `/api/v1/platform/admin/*` on money routes to `admin-api`
- lane-specific `/api/*` routes to `moneyshyft-api`

### Connect
- `https://connect.shyftunity.com` serves ConnectShyft web
- `/api/v1/auth/*` on connect routes to `admin-api`
- `/api/v1/platform/admin/*` on connect routes to `admin-api`
- lane-specific `/api/*` routes to `connectshyft-api`

### Database
- all three APIs connect to the same shared Postgres database
- production migrations run once from one source only
- database backup and restore commands are documented and verified

### Operations
- no API port is publicly exposed beyond loopback
- `nginx -t` passes
- all API health endpoints pass
- deployment guide can be followed from scratch without guessing

## Deliverables expected from developer

- corrected deployment documentation
- corrected Nginx production examples
- shared production compose file
- production env templates
- standardized API Dockerfiles
- migration authority and centralization plan
- acceptance test proof

## Counterpoint

Do not let the developer overbuild toward the full future platform in this round. The job here is to stop deployment drift and lock the production contract.
