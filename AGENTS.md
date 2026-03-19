# Repository Guidelines

## Repository Location
- GitHub: https://github.com/jeremiahotis/moneyshyft.git

## Project Structure & Module Organization
MoneyShyft is a full-stack app with a Vue 3 frontend and an Express/TypeScript backend.
- `apps/moneyshyft-web/` houses the Vue app (`apps/moneyshyft-web/src/` for components, views, stores, and router).
- `apps/moneyshyft-api/` houses the Node/Express app; core code lives in `apps/moneyshyft-api/src/` (routes, services, middleware).
- Database migrations and seeds are in `apps/moneyshyft-api/src/migrations/` and `apps/moneyshyft-api/src/seeds/` with numeric prefixes like `001_initial_schema.ts`.
- Infra/config: `docker-compose.example.yml`, `nginx/nginx.conf`, and docs like `SETUP.md` and `PRODUCTION_DEPLOYMENT_GUIDE.md`.

## Build, Test, and Development Commands
Backend (`apps/moneyshyft-api/`):
- `npm run dev` starts the API server with hot reload.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run start` runs the compiled server.
- `npm run migrate:latest` and `npm run seed:run` manage schema and seed data.
- `npm test` runs Jest tests.

Frontend (`apps/moneyshyft-web/`):
- `npm run dev` starts Vite on port 5173.
- `npm run build` builds the production bundle.
- `npm run preview` serves the built app locally.

Docker:
- `docker-compose up -d` starts Postgres and the Node service.

## Coding Style & Naming Conventions
- TypeScript is used across backend and frontend; Vue SFCs live in `apps/moneyshyft-web/src/`.
- Indentation is 2 spaces in TS/Vue files.
- Backend routes follow `apps/moneyshyft-api/src/routes/api/v1/<resource>.ts`; validators live in `apps/moneyshyft-api/src/validators/` with `<resource>.validators.ts`.
- Migrations use ordered numeric prefixes and descriptive names.
- No dedicated formatter or linter is enforced; keep diffs consistent with existing style.

## Testing Guidelines
- Backend uses Jest (`npm test`, `npm test:watch`). No test files are currently checked in, so add tests alongside new backend logic when feasible.
- There is no configured frontend test runner; document manual test steps in PRs when UI changes.
- For TEA/Playwright CLI browser exploration, if sandbox permissions block browser actions of any kind, stop and ask the user for escalation/permission instead of pivoting to non-browser fallback automatically.

## Commit & Pull Request Guidelines
- Recent commits use a short type prefix like `Fix:`, `Docs:`, or `chore:` followed by a concise summary.
- Default PR base branch is `codex/dev` unless the user explicitly requests a different target.
- Prefer PRs that include a clear description, test notes, and UI screenshots or GIFs when frontend changes are involved.

## Configuration Tips
- Backend env lives in `apps/moneyshyft-api/.env` (gitignored). Frontend uses Vite env via `import.meta.env`.
- Do not commit secrets; copy `docker-compose.example.yml` when setting up locally.

## Production Context (MoneyShyft)
- Prod deploy uses Docker Compose with `node` built from `apps/moneyshyft-api/Dockerfile.production` and Postgres in Docker; nginx is host-managed and serves `apps/moneyshyft-web/dist`.
- Prod `docker-compose.yml` uses `NODE_ENV=production` and `apps/moneyshyft-api/.env` via `env_file`.
- Prod nginx config proxies `/api/` to `127.0.0.1:3000` and serves the Vue SPA from `/home/jeremiahotis/projects/moneyshyft/apps/moneyshyft-web/dist`.
- Prod build runs `npm run build` inside `apps/moneyshyft-api/Dockerfile.production` and must succeed with TypeScript strictness.
- Prod migrations should use `npm run migrate:latest:prod` inside the container.

## Required Git Policy & CI Enforcement (Target-State Constraint)
- Git policy at `docs/policies/git_policy.md` is mandatory and repository-wide.
- Policy gate must be enforced in CI via `npm run policy:check` as the first blocking job.
- Workflow guard command is required before story/epic workflow execution:
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --story <story-key-or-story-file>`
  - `npm run branch:ensure-workflow -- --workflow <name-or-path> --epic <epic-number>`
- CI pipeline specification to enforce:
1. `policy` (blocking): `npm run policy:check`
2. `lint`: `npm run lint` (or fallback test-discovery check)
3. `test`: Playwright in 4 shards
4. `burn-in`: 10-iteration loop on PR/scheduled runs
5. `quality-gates`: TEA thresholds (`@P0` 100%, `@P1` >=95%)
6. `backend-contracts`: optional `workflow_dispatch` lane against live API
7. `report`: aggregate and publish CI summary
- Local parity commands:
  - `scripts/ci-local.sh`
  - `npm run policy:check`
  - `scripts/burn-in.sh 10`
  - `scripts/test-changed.sh origin/main`
  - `scripts/quality-gates.sh`
  - `npm run test:contracts:backend`

## Active Technologies
- TypeScript (Node.js APIs), Vue 3 TypeScript frontends + Express APIs, host Nginx reverse proxy, Docker Compose (001-tighten-deployment-contracts)
- Shared host-managed PostgreSQL (single instance) (001-tighten-deployment-contracts)
- TypeScript (ES2022) on Node.js >=20 + Express, Knex, pg, Jest/ts-jest, root-level shared communication domain source under `domains/communication` (002-phone-identity)
- Shared PostgreSQL; current ConnectShyft phone persistence in `connectshyft.cs_neighbor_phones` must evolve toward `communication_contact_point`-equivalent canonical fields (002-phone-identity)
- TypeScript (ES2022) on Node.js >=20 + Jest, ts-jest, Express route test harnesses, shared communication domain modules under `domains/communication`, ConnectShyft module tests under `apps/connectshyft-api`, and repository boundary enforcement via `node scripts/enforce-workspace-boundaries.js` (004-bridge-test-fixture-normalization)
- N/A for new behavior; existing shared PostgreSQL-backed bridge, correlation, and webhook models remain unchanged because CS-004b is test-only cleanup (004-bridge-test-fixture-normalization)
- TypeScript (ES2022) on Node.js >=20 + Express, Knex, `pg`, Jest, ts-jest, shared communication domain modules under `domains/communication`, ConnectShyft route/module services under `apps/connectshyft-api`, and repository boundary enforcement via `node scripts/enforce-workspace-boundaries.js` (005-reliability-idempotency-audit)
- Shared PostgreSQL using existing ConnectShyft bridge-session, message, provider-correlation, and webhook-receipt tables plus new durable `communication_idempotency_record` and `communication_audit_log`-equivalent persistence and minimal retry metadata on reliability-owned records where required (005-reliability-idempotency-audit)
- Markdown planning artifacts for a TypeScript monorepo (Node.js >=20, Vue 3, Express) + Repository source evidence from Express route registration, Vue router registration, Vite proxy config, Knex config, Dockerfiles, nginx contracts, and deployment runbooks (011-platform-lane-authority-convergence-audit)
- Planning artifacts stored in `specs/011-platform-lane-authority-convergence-audit`; audited production storage is shared PostgreSQL (011-platform-lane-authority-convergence-audit)
- TypeScript (ES2022) on Node.js >=20, Vue 3 SFCs + Express, Knex, pg, Jest/ts-jest, Vue 3, Vite, Pinia (012-platform-lane-separation)
- Shared PostgreSQL plus shared migration authority under `shared/database/migrations` (012-platform-lane-separation)
- TypeScript (ES2022) for Vue 3 and Express monorepo surfaces + Vue 3, Vue Router, Pinia, Express, Jest, ripgrep-based reference verification (013-admin-leftovers-cleanup)
- N/A for new persisted data; existing inventory and planning docs only (013-admin-leftovers-cleanup)
- TypeScript (ES2022) on Node.js >=20 + Express, Knex, pg, Jest/ts-jest, existing `libs/platform`, existing `libs/auth`, existing shared communication domain modules under `domains/communication` (014-break-dependency-anchors)
- Shared PostgreSQL (`platform` schema plus existing lane data tables) (014-break-dependency-anchors)
- TypeScript (ES2022) on Node.js >=20 + Express APIs, Jest/ts-jest, shared primitives under `libs/platform`, repository import scans via `rg` (015-delete-api-mirrors)
- Shared PostgreSQL remains unchanged; no new schema work (015-delete-api-mirrors)
- TypeScript (ES2022) on Node.js >=20 + Express, Knex, pg, Jest, ts-jest, shared entitlement primitive under `libs/platform/src/tenantModuleEntitlements.ts` (016-detach-moneyshyft-mirrors)
- Shared PostgreSQL; no schema or migration changes in this slice (016-detach-moneyshyft-mirrors)
- Markdown planning artifacts for a TypeScript/Vue/Express monorepo on Node.js >=20 + `rg`, `diff`, repository boundary script `node scripts/enforce-workspace-boundaries.js`, route ownership script `bash scripts/verify-connectshyft-route-ownership.sh`, app-local `npm run build` commands (017-lane-closure-audit)
- N/A for new persisted data; audit uses repository files and inventory records as evidence (017-lane-closure-audit)
- TypeScript (ES2022) on Node.js >=20 plus Markdown planning artifacts + Express, Jest, ts-jest, Knex, pg, repo search via `rg`, workspace boundary enforcement, lane inventory governance (018-remove-connectshyft-mirrors)
- Shared PostgreSQL remains unchanged; no schema or migration work in this slice (018-remove-connectshyft-mirrors)
- TypeScript (ES2022) on Node.js >=20, Vue 3 SFCs + Express, Knex, pg, Jest/ts-jest, Vue Router, Axios, shared `libs/platform` envelope helpers, shared `domains/communication` telephony contracts (019-connectshyft-master-debugging)
- Shared PostgreSQL plus in-memory ConnectShyft stores and test fixtures (019-connectshyft-master-debugging)
- TypeScript (ES2022) on Node.js >=20 + Express, Jest/ts-jest, shared `domains/communication` telephony contracts, ConnectShyft provider registry, Telnyx adapter (020-connectshyft-sms-handoff)
- Shared PostgreSQL plus in-memory ConnectShyft test fixtures and ledgers (020-connectshyft-sms-handoff)
- TypeScript (ES2022) on Node.js >=20 + Express, Jest/ts-jest, shared `domains/communication` telephony contracts, ConnectShyft route/module services, Telnyx adapter (021-connectshyft-sms-sender-architecture)
- Shared PostgreSQL plus in-memory ConnectShyft thread and number-mapping fixtures in tests (021-connectshyft-sms-sender-architecture)
- TypeScript (ES2022) on Node.js >=20 + Express, Jest/ts-jest, Supertest, shared `domains/communication` phone normalization and telephony contracts, ConnectShyft provider registry, ConnectShyft identity boundary, existing communication audit log (022-inbound-sms-identity-resolution-and-raw-body-capture)
- Shared PostgreSQL `connectshyft` schema, existing communication audit log persistence, in-memory ConnectShyft fixtures in tests, and shared migration authority if a narrow neighbor lifecycle marker is required for deleted-record exclusion (022-inbound-sms-identity-resolution-and-raw-body-capture)
- TypeScript (ES2022) on Node.js >=20 + Express, Knex, `pg`, Jest/ts-jest, shared `domains/communication` phone normalization, ConnectShyft neighbor service/store modules, existing `identityBoundary.ts` and `identityResolver.ts` (023-duplicate-handling-and-phone-uniqueness-enforcement)
- Shared PostgreSQL `connectshyft` schema with canonical phone columns in `cs_neighbor_phones`, canonical production migration authority under `shared/database/migrations`, and lane-local migration mirrors for local build/test compatibility (023-duplicate-handling-and-phone-uniqueness-enforcement)

## Recent Changes
- 001-tighten-deployment-contracts: Added TypeScript (Node.js APIs), Vue 3 TypeScript frontends + Express APIs, host Nginx reverse proxy, Docker Compose
