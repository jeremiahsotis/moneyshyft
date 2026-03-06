# Source Tree Analysis

## High-Level Tree
```text
moneyshyft/
├── frontend/                 # Vue 3 SPA (web client)
│   ├── src/
│   │   ├── components/       # UI components grouped by domain
│   │   ├── views/            # Route-level screens
│   │   ├── stores/           # Pinia stores
│   │   ├── services/         # API client wrappers
│   │   └── router/           # Route definitions
├── src/                      # Express API service
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
- `src/src/routes/api/v1`: backend domain endpoints and route contracts
- `src/src/services`: service layer where business rules currently live
- `src/src/migrations`: schema evolution history and current table shape source
- `frontend/src/stores`: application state domain boundaries
- `docs/routeshyft`: canonical inputs for monolith migration and RouteShyft phases
- `_bmad`: workflow engine and project process automation

## Entry Points
- Backend runtime: `src/src/server.ts`
- Backend app wiring: `src/src/app.ts`
- Frontend app bootstrap: `frontend/src/main.ts`
