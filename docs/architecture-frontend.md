# Frontend Architecture

## Executive Summary
The frontend is a Vue 3 single-page application built with Vite. It uses Pinia stores for domain state and a service-based API layer to communicate with the backend.

## Technology Stack
- Framework: Vue 3
- Build: Vite
- Language: TypeScript
- Routing: Vue Router 4
- State: Pinia
- API client: Axios
- Styling: Tailwind CSS

## Architecture Pattern
Domain-grouped SPA:
1. Views under `frontend/src/views` represent route screens.
2. Reusable components under `frontend/src/components` by feature area.
3. Pinia stores under `frontend/src/stores` maintain domain state.
4. API adapter in `frontend/src/services/api.ts` centralizes HTTP interactions.

## Integration Contract
The frontend relies on backend `/api/v1` endpoints and auth cookies. As RouteShyft bridge phases are introduced, the frontend/WP thin UI boundary should consume bridge endpoints rather than duplicating state writes.
