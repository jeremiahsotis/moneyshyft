# Acceptance Test Matrix

## Scope alignment (Spec 001)
- acceptance evidence for spec 001 is limited to deployment-tightening scope only
- acceptance criteria in this round must not expand into Product Shell, domain architecture, event bus, reusable UI system, or future-lane scope

## Acceptance evidence checkpoints
- checkpoints must cover admin, money, connect, routing, shared Postgres authority, ingress/port exposure, and reproducible deployment flow
- routing checkpoints align with `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`
- shared Postgres authority checkpoints align with `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md`
- ingress/port exposure checkpoints align with `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md`

## Admin

### Web
- `GET https://admin.shyftunity.com` returns HTML and loads the SPA shell.

### API routing
- all `/api/*` requests on `admin.shyftunity.com` reach `admin-api`

## MoneyShyft

### Web
- `GET https://money.shyftunity.com` returns HTML and loads the MoneyShyft SPA.

### Auth routing
- `/api/v1/auth/*` requests reach `admin-api`

### Platform admin routing
- `/api/v1/platform/admin/*` requests reach `admin-api`

### Lane routing
- all other `/api/*` requests reach `money-api`

## ConnectShyft

### Web
- `GET https://connect.shyftunity.com` returns HTML and loads the ConnectShyft SPA.

### Auth routing
- `/api/v1/auth/*` requests reach `admin-api`

### Platform admin routing
- `/api/v1/platform/admin/*` requests reach `admin-api`

### Lane routing
- all other `/api/*` requests reach `connect-api`

## Shared Postgres
- all three API containers show the same target `DATABASE_URL` host and DB name
- `pg_stat_activity` confirms live connections from all three services

## Ingress and port exposure
- public ingress is limited to HTTPS on nginx
- API services are bound for internal/localhost access only and not publicly exposed
- direct non-nginx API access is rejected or unavailable

## Operational checks
- `nginx -t` passes
- all three `/health` endpoints pass
- container logs do not show upstream mismatch or DB connection errors
- reproducible deployment flow evidence is captured in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/runbook-reproducibility.md`
