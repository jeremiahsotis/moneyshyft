# Database Authority Verification

## Purpose
This document records the database ownership and migration authority rules for the 001-tighten-deployment-contracts deployment-tightening round. It verifies that production database governance remains centralized in the platform authority service.

## Database Topology
- A host-managed PostgreSQL instance serves as the single production database authority.
- One shared database is used by platform and lane services.
- Services connect through environment-based database configuration.

## Migration Authority
- `admin-api` is the only service allowed to execute database migrations in production.
- Lane APIs (`money-api` and `connect-api`) must not execute migrations in production.
- Migration authority remains centralized in `admin-api` for schema control and change governance.

## Lane Database Access
| Service | Role | Migration Permission |
|--------|------|----------------------|
| admin-api | platform authority | allowed |
| money-api | lane service | not allowed |
| connect-api | lane service | not allowed |

## Verification Checklist
- [ ] Postgres instance reachable from containers
- [ ] Lane APIs connect successfully
- [ ] No migration scripts executed by lane APIs
- [ ] Admin API responsible for schema changes
