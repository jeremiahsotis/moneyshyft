# Repository Guidelines

## Repository Location
- GitHub: https://github.com/jeremiahotis/moneyshyft.git

## Project Structure & Module Organization
MoneyShyft is a full-stack app with a Vue 3 frontend and an Express/TypeScript backend.
- `apps/routeshyft-web/` houses the Vue app (`apps/routeshyft-web/src/` for components, views, stores, and router).
- `apps/routeshyft-api/` houses the Node/Express app; core code lives in `apps/routeshyft-api/src/` (routes, services, middleware).
- Database migrations and seeds are in `apps/routeshyft-api/src/migrations/` and `apps/routeshyft-api/src/seeds/` with numeric prefixes like `001_initial_schema.ts`.
- Infra/config: `docker-compose.example.yml`, `nginx/nginx.conf`, and docs like `SETUP.md` and `PRODUCTION_DEPLOYMENT_GUIDE.md`.

## Build, Test, and Development Commands
Backend (`apps/routeshyft-api/`):
- `npm run dev` starts the API server with hot reload.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run start` runs the compiled server.
- `npm run migrate:latest` and `npm run seed:run` manage schema and seed data.
- `npm test` runs Jest tests.

Frontend (`apps/routeshyft-web/`):
- `npm run dev` starts Vite on port 5173.
- `npm run build` builds the production bundle.
- `npm run preview` serves the built app locally.

Docker:
- `docker-compose up -d` starts Postgres and the Node service.

## Coding Style & Naming Conventions
- TypeScript is used across backend and frontend; Vue SFCs live in `apps/routeshyft-web/src/`.
- Indentation is 2 spaces in TS/Vue files.
- Backend routes follow `apps/routeshyft-api/src/routes/api/v1/<resource>.ts`; validators live in `apps/routeshyft-api/src/validators/` with `<resource>.validators.ts`.
- Migrations use ordered numeric prefixes and descriptive names.
- No dedicated formatter or linter is enforced; keep diffs consistent with existing style.

## Testing Guidelines
- Backend uses Jest (`npm test`, `npm test:watch`). No test files are currently checked in, so add tests alongside new backend logic when feasible.
- There is no configured frontend test runner; document manual test steps in PRs when UI changes.
- For TEA/Playwright CLI browser exploration, if sandbox permissions block browser actions of any kind, stop and ask the user for escalation/permission instead of pivoting to non-browser fallback automatically.

## Commit & Pull Request Guidelines
- Recent commits use a short type prefix like `Fix:`, `Docs:`, or `chore:` followed by a concise summary.
- Prefer PRs that include a clear description, test notes, and UI screenshots or GIFs when frontend changes are involved.

## Configuration Tips
- Backend env lives in `apps/routeshyft-api/.env` (gitignored). Frontend uses Vite env via `import.meta.env`.
- Do not commit secrets; copy `docker-compose.example.yml` when setting up locally.

## Production Context (MoneyShyft)
- Prod deploy uses Docker Compose with `node` built from `apps/routeshyft-api/Dockerfile.production` and Postgres in Docker; nginx is host-managed and serves `apps/routeshyft-web/dist`.
- Prod `docker-compose.yml` uses `NODE_ENV=production` and `apps/routeshyft-api/.env` via `env_file`.
- Prod nginx config proxies `/api/` to `127.0.0.1:3000` and serves the Vue SPA from `/home/jeremiahotis/projects/moneyshyft/apps/routeshyft-web/dist`.
- Prod build runs `npm run build` inside `apps/routeshyft-api/Dockerfile.production` and must succeed with TypeScript strictness.
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
