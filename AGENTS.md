# Repository Guidelines

## Repository Location
- GitHub: https://github.com/jeremiahotis/moneyshyft.git

## GitHub Issues & Milestones Policy
- Always use GitHub Issues and Milestones as the source of truth.
- Always mark items done and add notes with status, plan, and current progress.
- Do not start coding until issues/milestones are reviewed and notes are posted.

## Project Structure & Module Organization
MoneyShyft is a full-stack app with a Vue 3 frontend and an Express/TypeScript backend.
- `frontend/` houses the Vue app (`frontend/src/` for components, views, stores, and router).
- `src/` houses the Node/Express app; core code lives in `src/src/` (routes, services, middleware).
- Database migrations and seeds are in `src/src/migrations/` and `src/src/seeds/` with numeric prefixes like `001_initial_schema.ts`.
- Infra/config: `docker-compose.example.yml`, `nginx/nginx.conf`, and docs like `SETUP.md` and `PRODUCTION_DEPLOYMENT_GUIDE.md`.

## Build, Test, and Development Commands
Backend (`src/`):
- `npm run dev` starts the API server with hot reload.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run start` runs the compiled server.
- `npm run migrate:latest` and `npm run seed:run` manage schema and seed data.
- `npm test` runs Jest tests.

Frontend (`frontend/`):
- `npm run dev` starts Vite on port 5173.
- `npm run build` builds the production bundle.
- `npm run preview` serves the built app locally.

Docker:
- `docker-compose up -d` starts Postgres and the Node service.

## Coding Style & Naming Conventions
- TypeScript is used across backend and frontend; Vue SFCs live in `frontend/src/`.
- Indentation is 2 spaces in TS/Vue files.
- Backend routes follow `src/src/routes/api/v1/<resource>.ts`; validators live in `src/src/validators/` with `<resource>.validators.ts`.
- Migrations use ordered numeric prefixes and descriptive names.
- No dedicated formatter or linter is enforced; keep diffs consistent with existing style.

## Testing Guidelines
- Backend uses Jest (`npm test`, `npm test:watch`). No test files are currently checked in, so add tests alongside new backend logic when feasible.
- There is no configured frontend test runner; document manual test steps in PRs when UI changes.

## Commit & Pull Request Guidelines
- Recent commits use a short type prefix like `Fix:`, `Docs:`, or `chore:` followed by a concise summary.
- Prefer PRs that include a clear description, test notes, and UI screenshots or GIFs when frontend changes are involved.

## Configuration Tips
- Backend env lives in `src/.env` (gitignored). Frontend uses Vite env via `import.meta.env`.
- Do not commit secrets; copy `docker-compose.example.yml` when setting up locally.

## Production Context (MoneyShyft)
- Prod deploy uses Docker Compose with `node` built from `src/Dockerfile` and Postgres in Docker; nginx is host-managed and serves `frontend/dist`.
- Prod `docker-compose.yml` uses `NODE_ENV=production` and `src/.env` via `env_file`.
- Prod nginx config proxies `/api/` to `127.0.0.1:3000` and serves the Vue SPA from `/home/jeremiahotis/projects/moneyshyft/frontend/dist`.
- Prod build runs `npm run build` inside `src/Dockerfile` and must succeed with TypeScript strictness.
- Prod migrations should use `npm run migrate:latest:prod` inside the container.
