# Project Documentation Index

- Generated: 2026-02-17
- Type: monorepo (frontend + backend)
- Primary languages: TypeScript

## Quick Reference
1. Backend
- Root: `src/`
- Stack: Express + TypeScript + Knex + PostgreSQL
- Entry points: `src/src/server.ts`, `src/src/app.ts`

2. Frontend
- Root: `frontend/`
- Stack: Vue 3 + Vite + Pinia + Vue Router
- Entry point: `frontend/src/main.ts`

## Generated Documentation
- [Project Overview](./project-overview.md)
- [Backend Architecture](./architecture-backend.md)
- [Frontend Architecture](./architecture-frontend.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Integration Architecture](./integration-architecture.md)
- [Frontend Component Inventory](./component-inventory-frontend.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)
- [Contribution Guide](./contribution-guide.md)
- [API Contracts - Backend](./api-contracts-backend.md)
- [Data Models - Backend](./data-models-backend.md)
- [Project Parts Metadata](./project-parts.json)
- [Project Scan State](./project-scan-report.json)

## Existing Documentation
- [Setup](../SETUP.md)
- [Production Deployment Guide](../PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Agent Guidelines](../AGENTS.md)
- [Claude Notes](../CLAUDE.md)
- [Product Roadmap](../ROADMAP.md)
- [Git Policy](./policies/git_policy.md)

## RouteShyft Input Docs
- [RouteShyft docs folder](./routeshyft/)

## Monolith Conversion Constraints
- `ROADMAP.md` is a planning constraint source for sequencing and scope.
- `docs/policies/git_policy.md` is mandatory policy input and CI enforcement source.
- Execute conversion in small PRs using canonical sequence:
1. Structure + TS aliases (`src/platform`, `src/modules`, `src/api`, `src/db/migrations`, `src/db/seeds`).
2. Canonical app entry + `registerRoutes`.
3. Mechanical move of money module into `src/modules/money`.
4. Platform kernel extraction (`db`, `tenancy`, envelope helpers, audit logger).
5. Migration centralization and schema strategy.
6. Canary route module with `/api/route/_health`.
7. Minimal internal command bus + one converted write path.
8. `platform.outbox_events` migration.
- Do not mix heavy business refactor with file moves in same PR.

## CI Target-State Constraints
- Pipeline definition target: `.github/workflows/test.yml`.
- Required job order:
1. `policy` (`npm run policy:check`)
2. `lint`
3. `test` (Playwright 4 shards)
4. `burn-in` (10 iterations on PR/scheduled runs)
5. `quality-gates` (`@P0` 100%, `@P1` >=95%)
6. `backend-contracts` (optional `workflow_dispatch` lane)
7. `report`
- Artifact expectations:
- `tests/artifacts/test-results/`
- `tests/artifacts/playwright-report/`
- `tests/artifacts/junit/`
- `tests/artifacts/gates/`
