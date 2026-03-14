# Deployment Verification Contract

## Topology Requirements

- Host Nginx is the single external ingress and static asset server.
- API services run in containers bound to localhost only.
- Frontends are static SPA builds served by host Nginx.
- One shared host-managed Postgres instance is used by in-scope lanes.

## Database Authority Requirements

- Host-managed shared PostgreSQL is the authoritative production database for in-scope lanes.
- `admin-api` is the only production migration and seed runner for this phase.
- Lane APIs (`moneyshyft-api`, `connectshyft-api`) MUST NOT run production migrations or seeds.
- All API containers connect to the shared database through environment-defined database variables.

## Security Requirements

- No API service is publicly exposed.
- All external API traffic enters through Nginx.
- PostgreSQL is not publicly exposed and is reachable by internal services only.
- Shared session behavior across lanes remains functional.

## Runbook Reproducibility Requirements

- Deployment steps are executable in documented order without ad hoc edits.
- Required environment artifacts are externalized and present before execution.
- Re-run of deployment workflow produces equivalent runtime contract outcomes.

## Acceptance Evidence Requirements

A deployment is accepted only if evidence exists for:

1. Lane web availability for admin, money, and connect domains.
2. Route delegation correctness for auth/platform-admin paths.
3. Lane API routing correctness for non-delegated API paths.
4. Health checks for all API services.
5. Shared Postgres connectivity for all in-scope APIs.
6. Database migration authority enforced to `admin-api` only.
7. No public API or database port exposure.
