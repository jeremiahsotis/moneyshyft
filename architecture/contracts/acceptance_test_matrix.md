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
- `GET https://admin.shyftunity.com/api/v1/auth/me` reaches `admin-api`
- `GET https://admin.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

## MoneyShyft

### Web
- `GET https://money.shyftunity.com` returns HTML and loads the MoneyShyft SPA.

### Auth routing
- `GET https://money.shyftunity.com/api/v1/auth/me` reaches `admin-api`

### Platform admin routing
- `GET https://money.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

### Lane routing
- lane-specific `/api/*` requests reach `moneyshyft-api`

## ConnectShyft

### Web
- `GET https://connect.shyftunity.com` returns HTML and loads the ConnectShyft SPA.

### Auth routing
- `GET https://connect.shyftunity.com/api/v1/auth/me` reaches `admin-api`

### Platform admin routing
- `GET https://connect.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

### Lane routing
- lane-specific `/api/*` requests reach `connectshyft-api`

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
