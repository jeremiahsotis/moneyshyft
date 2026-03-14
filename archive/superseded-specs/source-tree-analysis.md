# Source Tree Analysis

## High-Level Tree
```text
moneyshyft/
├── apps/routeshyft-web/      # Vue 3 SPA (web client)
│   ├── src/
│   │   ├── components/       # UI components grouped by domain
│   │   ├── views/            # Route-level screens
│   │   ├── stores/           # Pinia stores
│   │   ├── services/         # API client wrappers
│   │   └── router/           # Route definitions
├── apps/routeshyft-api/      # Express API service
│   ├── src/
│   │   ├── routes/api/v1/    # Versioned REST routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth/validation/error middleware
│   │   ├── migrations/       # Knex migrations
│   │   ├── validators/       # Joi schemas
│   │   └── utils/            # Shared helpers
├── docs/routeshyft/          # Imported RouteShyft specs/plans/schema drafts
├── nginx/                    # Reverse-proxy config
└── _bmad/                    # BMAD modules/workflows/config
```

## Critical Folders
- `apps/routeshyft-api/src/routes/api/v1`: backend domain endpoints and route contracts
- `apps/routeshyft-api/src/services`: service layer where business rules currently live
- `apps/routeshyft-api/src/migrations`: schema evolution history and current table shape source
- `apps/routeshyft-web/src/stores`: application state domain boundaries
- `docs/routeshyft`: canonical inputs for monolith migration and RouteShyft phases
- `_bmad`: workflow engine and project process automation

## Entry Points
- Backend runtime: `apps/routeshyft-api/src/server.ts`
- Backend app wiring: `apps/routeshyft-api/src/app.ts`
- Frontend app bootstrap: `apps/routeshyft-web/src/main.ts`
