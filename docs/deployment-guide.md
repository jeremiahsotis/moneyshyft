# Deployment Guide

## Deployment Context
Current production guidance in repo indicates:
- Backend runs in Docker with production env from `src/.env`.
- Postgres runs via Docker Compose.
- nginx is host-managed and proxies `/api/` to backend.
- Frontend is built and served as static assets.

## Key Files
- `docker-compose.example.yml`
- `apps/routeshyft-api/Dockerfile.production`
- `nginx/nginx.conf`
- `PRODUCTION_DEPLOYMENT_GUIDE.md`
- `DEPLOYMENT_CHECKLIST.md`

## Baseline Steps
1. Build backend image and install production deps.
2. Run DB migrations (`npm run migrate:latest:prod`) in backend container.
3. Build frontend assets (`apps/routeshyft-web/dist`).
4. Ensure nginx serves frontend and proxies backend API.
5. Run smoke checks for auth, budgeting core flows, and migration integrity.
