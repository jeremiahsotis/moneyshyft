# Audit Scope

## Lane Name Normalization

| Requested Label | Repo Path | Runtime Label | Notes |
| --- | --- | --- | --- |
| `money-api` | `apps/moneyshyft-api` | `money-api` | Requested lane label differs from repo directory name. |
| `moneyshyft-web` | `apps/moneyshyft-web` | `moneyshyft-web` | Money lane SPA served by host Nginx. |
| `connect-api` | `apps/connectshyft-api` | `connect-api` | Requested lane label differs from repo directory name. |
| `admin-api` | `apps/admin-api` | `admin-api` | Canonical auth and platform-admin API authority. |
| `migration-runner` | `apps/migration-runner` | `migration-runner` | Execution-only surface; no public HTTP route. |

## Auxiliary Surfaces Referenced by the Audit

| Surface | Repo Path | Why Referenced |
| --- | --- | --- |
| `admin-web` | `apps/admin-web` | Platform shell and canonical admin UI authority. |
| `connectshyft-web` | `apps/connectshyft-web` | Needed to confirm connect-lane ingress and deployment shape. |
| `shared migrations` | `shared/database/migrations` | Canonical production migration authority. |
| `host nginx` | `nginx/host-managed-subdomains.example.conf` | Public ingress and route delegation contract. |

## In-Scope Coverage Buckets

- Runtime routes and serving surfaces
- Mirrored, duplicated, or diverged modules and services
- Validators
- Lane-local and shared scripts used for build, packaging, or migration authority
- Build and packaging paths
- Migration authority and runner state
- RouteShyft artifacts embedded inside the money lane

## Out-of-Scope Activities

- Convergence remediation
- Code movement between lanes
- RouteShyft deletion
- Runtime authority changes
- Direct feature bug fixes
