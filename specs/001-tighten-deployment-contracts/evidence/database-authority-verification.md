# Database Authority Verification

## Purpose
This document records the database ownership and migration authority rules for the 001-tighten-deployment-contracts deployment-tightening round. It verifies that production database governance remains centralized in the platform authority service.

## Database Topology
- A host-managed PostgreSQL instance serves as the single production database authority.
- One shared database is used by platform and lane services.
- Services connect through environment-based database configuration.

## Migration Authority
- `admin-api` is the only service allowed to execute database migrations in production.
- Lane APIs (`moneyshyft-api` and `connectshyft-api`) must not execute migrations in production.
- Migration authority remains centralized in `admin-api` for schema control and change governance.

## Lane Database Access
| Service | Role | Migration Permission |
|--------|------|----------------------|
| admin-api | platform authority | allowed |
| moneyshyft-api | lane service | not allowed |
| connectshyft-api | lane service | not allowed |

## Validation Steps

1. Confirm migration authority language is aligned in contracts:
   - `rg -n "only.*migration|must not run production migrations|admin-api" specs/001-tighten-deployment-contracts/contracts/deployment-verification-contract.md architecture/contracts/database_ownership_and_migration_authority.md architecture/contracts/developer_execution_packet.md`
2. Confirm required DB environment variables exist in all lane API env templates:
   - `rg -n "^DATABASE_(HOST|PORT|NAME|USER|PASSWORD|SSL_MODE)=" architecture/contracts/env/admin-api.env.example architecture/contracts/env/moneyshyft-api.env.example architecture/contracts/env/connectshyft-api.env.example`
3. Verify lane APIs are not configured as migration runners:
   - `rg -n "migrate|migration|seed" architecture/contracts/docker-compose.production.shared.yml architecture/contracts/production_runbook.md`
   - Expected: production migration/seed execution references `admin-api` only.
4. Verify API containers can reach the shared Postgres endpoint:
   - `docker compose -f architecture/contracts/docker-compose.production.shared.yml exec admin-api sh -lc 'getent hosts host.docker.internal'`
   - `docker compose -f architecture/contracts/docker-compose.production.shared.yml exec moneyshyft-api sh -lc 'getent hosts host.docker.internal'`
   - `docker compose -f architecture/contracts/docker-compose.production.shared.yml exec connectshyft-api sh -lc 'getent hosts host.docker.internal'`

## Evidence Capture
- Record command output proving only `admin-api` is authorized for migrations/seeds.
- Record command output proving all lane APIs resolve `host.docker.internal`.
- Record command output proving DB variable contract is present in all env templates.

## Verification Checklist
- [ ] `admin-api` confirmed as migration and seed authority
- [ ] `moneyshyft-api` and `connectshyft-api` confirmed as non-authoritative
- [ ] Shared Postgres endpoint reachable from all API containers
- [ ] Required DB environment variables confirmed in all lane env templates
