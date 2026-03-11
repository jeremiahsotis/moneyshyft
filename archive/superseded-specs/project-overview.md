# Project Overview

## Summary
MoneyShyft is a family budgeting platform with a Vue 3 frontend and Express + TypeScript backend. The repository is currently a practical monorepo/multi-part layout with separate `apps/routeshyft-web/` and `apps/routeshyft-api/` applications.

## Repository Classification
- Type: Monorepo (2 parts)
- Primary languages: TypeScript (frontend and backend)
- Data store: PostgreSQL
- Delivery model: Docker Compose for backend+DB and static frontend hosting

## Parts
1. Backend (`apps/routeshyft-api/`)
- Express API with modular route files under `apps/routeshyft-api/src/routes/api/v1`
- Domain services under `apps/routeshyft-api/src/services`
- Knex migrations and seeds under `apps/routeshyft-api/src/migrations` and `apps/routeshyft-api/src/seeds`

2. Frontend (`apps/routeshyft-web/`)
- Vue 3 SPA with Vue Router and Pinia
- Domain-specific stores for budgeting, debts, goals, income, transactions, scenarios
- Axios API adapter in `apps/routeshyft-web/src/services/api.ts`

## Current Objective Context
RouteShyft artifacts are staged under `docs/routeshyft/` and define a phased monolith migration path focused on a hardened platform kernel, then feature modules (OperationShift, RouteShift bridge, ResourceShift, etc.).

## Planning Constraint Sources
- `ROADMAP.md` (product roadmap and prioritization constraints)
- RouteShyft specs and migration docs in `docs/routeshyft/`
- `AGENTS.md` repository implementation guardrails
- `docs/policies/git_policy.md` mandatory git/branch workflow policy
- RouteShyft CI pipeline specification (required target-state) for policy gating and quality gates

## Canonical Conversion Sequence (Small PRs, No Deploy Breaks)
1. Phase A: add target structure only (no moves)
- Create folders: `apps/routeshyft-api/src/platform`, `apps/routeshyft-api/src/modules`, `apps/routeshyft-api/src/api`, `apps/routeshyft-api/src/db/migrations`, `apps/routeshyft-api/src/db/seeds`.
- Add TS aliases in root `tsconfig.json`:
  - `@platform/*` -> `apps/routeshyft-api/src/platform/*`
  - `@modules/*` -> `apps/routeshyft-api/src/modules/*`
  - `@api/*` -> `apps/routeshyft-api/src/api/*`

2. Phase B: canonical app entry and route registry
- Add canonical `apps/routeshyft-api/src/app.ts` (create app, shared middleware, `registerRoutes(app)`).
- Add `apps/routeshyft-api/src/api/registerRoutes.ts` and mount existing routes through it.
- Keep existing entrypoint temporarily, but delegate to new app path.

3. Phase C: move MoneyShyft into `apps/routeshyft-api/src/modules/money` mechanically
- Create module skeleton: `api`, `application`, `domain`, `infrastructure`.
- Move existing money routes/handlers with zero behavior change.
- Keep URL paths stable to avoid client breaks.

4. Phase D: extract platform kernel
- Add `@platform/db/knex.ts`, `@platform/tenancy/context.ts`, `@platform/envelopes/response.ts`, `@platform/audit/logger.ts`.
- Refactor module usage toward platform helpers incrementally.

5. Phase E: centralize migrations
- Move migration source of truth to `apps/routeshyft-api/src/db/migrations` (and seeds to `apps/routeshyft-api/src/db/seeds`).
- Update knex config to point to new paths.
- Introduce Postgres schemas (`platform`, `money`) before Route/Operations expansion.

6. Phase F: add canary second module
- Add `apps/routeshyft-api/src/modules/route/api/registerRouteRoutes.ts`.
- Provide `GET /api/route/_health` as structural proof.

7. Phase G: add minimal internal command bus
- Add `@platform/bus/commandBus.ts` (handler registration, transaction execution, audit, tenancy enforcement).
- Convert one Money write path first.

8. Phase H: prepare integration spine
- Add `platform.outbox_events` migration now.

## Explicit Non-Goals During Conversion
- Do not split services prematurely.
- Do not add complex CQRS yet.
- Do not add workflow builder complexity.
- Do not combine business-logic refactors with large file moves in one PR.

## Required CI / Policy Integration (Target-State)
- CI must block downstream work when policy fails via `npm run policy:check`.
- Required CI job topology:
1. `policy`
2. `lint`
3. `test` (Playwright sharded)
4. `burn-in`
5. `quality-gates`
6. `backend-contracts` (workflow-dispatch optional)
7. `report`
- Required local validation commands:
- `scripts/ci-local.sh`
- `npm run policy:check`
- `scripts/burn-in.sh 10`
- `scripts/test-changed.sh origin/main`
- `scripts/quality-gates.sh`
- Backend contract lane details:
- Trigger only by `workflow_dispatch` with `run_backend_contracts=true`.
- Requires repository variable `API_URL`.
- Optional variables: `RS_CONTRACT_PICKUP_PATH`, `RS_CONTRACT_PUBLISH_PATH`, `RS_CONTRACT_COMPLETE_PATH`, `WP_TEST_CAPABILITY`.
- Optional secrets: `WP_TEST_NONCE`, `WP_TEST_AUTHORIZATION`.
- Optional Slack failure notifications via `SLACK_WEBHOOK_URL`.
- CI secrets checklist baseline: no required secrets for baseline test execution; Slack and external integration secrets are optional.

## Core Technical Stack
- Backend: Node.js, Express, TypeScript, Knex, PostgreSQL, Jest
- Frontend: Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS
- Operations: Docker Compose, nginx reverse proxy (production context docs present)

## Key Existing Documentation
- `SETUP.md`
- `PRODUCTION_DEPLOYMENT_GUIDE.md`
- `DEPLOYMENT_CHECKLIST.md`
- `AGENTS.md`
- `ROADMAP.md`
- RouteShyft planning/spec docs in `docs/routeshyft/`
