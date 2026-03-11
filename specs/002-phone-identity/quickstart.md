# Quickstart: CS-002 Phone Identity

## Goal

Validate that ConnectShyft can accept natural phone-number input while storing canonical E.164 through the shared communication domain.

## Implementation sequence

1. Replace the stub implementation in `domains/communication/phone/index.ts` with the shared phone API defined in `contracts/phone-domain-contract.md`.
2. Update `apps/connectshyft-api` build/test configuration so lane API code can import the root shared domain.
3. Replace local phone normalization in ConnectShyft neighbor and identity-boundary flows with the shared phone domain.
4. Shape current ConnectShyft phone persistence toward the canonical contact-point model without creating a second ConnectShyft-only phone store.
5. Add unit coverage for shared phone-domain behavior and regression coverage for ConnectShyft neighbor/identity flows.

## Example verification scenarios

1. Normalize `2605551212` with domestic context and confirm canonical output is `+12605551212`.
2. Normalize `5551212` with default area code `260` and confirm canonical output is `+12605551212`.
3. Normalize `5551212` without a default area code and confirm the request is refused.
4. Submit malformed input with alpha characters and confirm validation refusal.
5. Create or update a ConnectShyft neighbor and confirm stored phone identity uses canonical E.164 plus derived display/parsed fields through the shared-domain contract.
6. Resolve identity-boundary matching by canonical phone identity rather than ConnectShyft-local regex logic.

## Suggested validation commands

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
env NODE_ENV=test npx jest --runInBand --runTestsByPath \
  ../../domains/communication/phone/__tests__/index.test.ts \
  src/modules/connectshyft/__tests__/neighbors.test.ts \
  src/modules/connectshyft/__tests__/identityBoundary.test.ts \
  src/migrations/__tests__/connectShyftNeighborCanonicalPhoneIdentityMigration.test.ts \
  src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts
npm run build
```

```bash
cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js
npm run policy:check
```

## Platform no-regression validation

### T024 Route ownership validation

Result: PASS

- `apps/admin-api/src/api/registerRoutes.ts` continues to register `/api/v1/platform/admin` and `/api/v1/auth` under `admin-api`.
- `apps/connectshyft-api/src/app.ts` continues to mount only `/api/v1/connectshyft` for lane-local ConnectShyft routes.
- The CS-002 feature diff touches shared phone-domain code, ConnectShyft phone-identity consumers, and feature docs, but does not modify `apps/admin-api`, `apps/connectshyft-api/src/app.ts`, `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, or `docker-compose.production.example.yml`.

Validation commands used:

```bash
cd /Users/jeremiahotis/projects/connectshyft
sed -n '26,30p' apps/admin-api/src/api/registerRoutes.ts
sed -n '25,31p' apps/connectshyft-api/src/app.ts
git diff --name-only -- specs/002-phone-identity apps/connectshyft-api apps/admin-api docs docker-compose.production.example.yml domains/communication
```

### T025 API binding and port validation

Result: PASS

- `apps/connectshyft-api/src/server.ts` keeps canonical production port `3002` and rejects non-canonical production ports.
- `apps/connectshyft-api/src/server.ts` allows only local-interface bindings in production (`0.0.0.0`, `127.0.0.1`, or `localhost`).
- `apps/connectshyft-api/.env.example` still documents `PORT=3002` and `HOST=127.0.0.1`.
- `docker-compose.production.example.yml` still publishes ConnectShyft on loopback-only `127.0.0.1:3002:3002`.
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` still declares `upstream connect_api { server 127.0.0.1:3002; }` and loopback health checks on `http://127.0.0.1:3002/health`.

Validation commands used:

```bash
cd /Users/jeremiahotis/projects/connectshyft
sed -n '4,18p' apps/connectshyft-api/src/server.ts
sed -n '1,12p' apps/connectshyft-api/.env.example
sed -n '52,67p' docker-compose.production.example.yml
sed -n '157,199p' docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

### T026 Shared PostgreSQL connectivity and migration authority validation

Result: PASS

- `apps/connectshyft-api/src/knexfile.ts` still requires `DATABASE_URL` or `DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_NAME`/`DATABASE_USER`/`DATABASE_PASSWORD`, preserving the shared-Postgres connectivity contract.
- `apps/connectshyft-api/.env.example` still points production configuration at `host.docker.internal:5432`.
- `apps/connectshyft-api/package.json` still guards `migrate:latest:prod`, `migrate:rollback:prod`, and `seed:run:prod` with `scripts/enforceProdMigrationAuthority.js`.
- `apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js` still hard-fails with `use admin-api instead`.
- `apps/admin-api/package.json` remains the only lane package exposing the authoritative production migration command.
- `docs/DEPLOYMENT_CHECKLIST.md` and `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` still require one shared host Postgres and production migrations executed from `admin-api` only.

Validation commands used:

```bash
cd /Users/jeremiahotis/projects/connectshyft
sed -n '27,45p' apps/connectshyft-api/src/knexfile.ts
sed -n '10,16p' apps/connectshyft-api/package.json
sed -n '1,3p' apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js
sed -n '10,16p' apps/admin-api/package.json
sed -n '18,24p' docs/DEPLOYMENT_CHECKLIST.md
sed -n '174,199p' docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

## Reproducible no-regression runbook

Use this sequence when re-validating CS-002 on a deployment candidate or release branch.

1. Confirm route ownership remains unchanged.
2. Confirm ConnectShyft canonical port and loopback binding expectations remain unchanged.
3. Confirm shared Postgres and production migration authority remain unchanged.
4. Execute the deployment-host smoke checks from the normalized production runbook.

```bash
cd /Users/jeremiahotis/projects/connectshyft

# 1) Route ownership audit
sed -n '26,30p' apps/admin-api/src/api/registerRoutes.ts
sed -n '25,31p' apps/connectshyft-api/src/app.ts
git diff --name-only -- specs/002-phone-identity apps/connectshyft-api apps/admin-api docs docker-compose.production.example.yml domains/communication

# 2) ConnectShyft port/binding audit
sed -n '4,18p' apps/connectshyft-api/src/server.ts
sed -n '1,12p' apps/connectshyft-api/.env.example
sed -n '52,67p' docker-compose.production.example.yml

# 3) Shared Postgres + migration authority audit
sed -n '27,45p' apps/connectshyft-api/src/knexfile.ts
sed -n '10,16p' apps/connectshyft-api/package.json
sed -n '1,3p' apps/connectshyft-api/scripts/enforceProdMigrationAuthority.js
sed -n '10,16p' apps/admin-api/package.json
sed -n '18,24p' docs/DEPLOYMENT_CHECKLIST.md
sed -n '174,199p' docs/PRODUCTION_DEPLOYMENT_GUIDE.md

# 4) Deployment-host smoke sequence (run on the deployment target, not in this workspace)
cd /home/jeremiahotis/projects/shyftunity
docker compose build admin-api money-api connect-api
docker compose run --rm admin-api npm run migrate:latest:prod
docker compose up -d admin-api money-api connect-api
curl -f http://127.0.0.1:3100/health
curl -f http://127.0.0.1:3000/health
curl -f http://127.0.0.1:3002/health
curl -i https://money.shyftunity.com/api/v1/auth/me
curl -i https://connect.shyftunity.com/api/v1/auth/me
```

## Implementation evidence notes

- Shared-domain normalization now returns discriminated success/error results instead of throwing.
- ConnectShyft neighbor persistence writes both legacy `value_e164` and canonical `normalized_e164`-equivalent columns while hydrating derived display/parsed fields.
- Identity-boundary matching now normalizes natural input through the shared domain before canonical lookup on `normalized_e164`.

## Non-goals to enforce during implementation

- do not redesign ConnectShyft UI
- do not add Telnyx integration
- do not pull bridge-session or idempotency work into CS-002
