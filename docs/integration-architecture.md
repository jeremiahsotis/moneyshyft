# Integration Architecture

## Internal Part Integrations
1. Frontend -> Backend
- Protocol: HTTPS/HTTP JSON REST
- Client: Axios service + Pinia store actions
- API namespace: `/api/v1/*`
- Auth: cookie-based JWT flows

2. Backend -> PostgreSQL
- Protocol: SQL through Knex
- Migrations: `src/src/migrations/*.ts`
- Seeds: `src/src/seeds/**/*.ts`

## Planned RouteShyft Integration Direction
- Add RouteShift bridge endpoints in backend monolith.
- Keep WordPress as thin UI consumer where specified.
- Enforce no direct cross-module calls; use event/outbox contracts.
