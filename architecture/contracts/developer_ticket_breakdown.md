# Developer Ticket Breakdown

## Ticket 1: Normalize production names, ports, and paths

### Deliverables
- repo, docs, env files, compose, and Nginx examples all use the same canonical names
- connect API port normalized to `3002`
- frontend dist paths normalized to `admin-web`, `moneyshyft-web`, `connectshyft-web`

### Done when
- no deployment file references `money-web` or `connect-web`
- no deployment file routes connect API to `3001`

## Ticket 2: Standardize production API Dockerfiles

### Deliverables
- `apps/connectshyft-api/Dockerfile.production`
- corrected `apps/admin-api/Dockerfile.production`
- corrected `apps/moneyshyft-api/Dockerfile.production`
- deterministic install/build/start pattern documented

### Done when
- all three API images build successfully via the shared production compose file

## Ticket 3: Correct Nginx routing contract for Admin, Money, and Connect

### Deliverables
- corrected Nginx example for admin, money, and connect
- money and connect route auth and platform-admin paths to `admin_api`
- lane routes stay on their lane upstreams

### Done when
- route tests confirm correct upstream behavior

## Ticket 4: Shared host Postgres connectivity

### Deliverables
- env file pattern using `host.docker.internal`
- compose file includes `extra_hosts: host-gateway`
- docs explain why container-local `127.0.0.1` is wrong for host DB access
- host Postgres setup steps documented

### Done when
- all three containers connect successfully to the same host Postgres DB

## Ticket 5: Shared production compose file

### Deliverables
- one compose file for admin, money, and connect APIs
- loopback-only bindings
- health checks
- restart policies
- log rotation settings

### Done when
- `docker compose -f docker-compose.production.shared.yml up -d` works on a clean host after env setup

## Ticket 6: Replace money-only deployment docs

### Deliverables
- platform deployment guide for admin + money + connect
- deployment checklist
- env templates
- rollback instructions

### Done when
- a clean server deploy can be completed from docs without guessing

## Ticket 7: Temporary migration authority lock and permanent DB centralization plan

### Deliverables
- docs lock `admin-api` as temporary production migration runner
- permanent centralization proposal for shared DB package or top-level `/db`
- CI guardrail proposal blocking new app-local migration drift

### Done when
- production deploy path runs one migration command only
