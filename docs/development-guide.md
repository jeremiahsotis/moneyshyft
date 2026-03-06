# Development Guide

## Prerequisites
- Node.js 20+
- npm
- PostgreSQL (local or Docker)

## Backend (`apps/routeshyft-api/`)
```bash
cd apps/routeshyft-api
npm install
npm run dev
npm run migrate:latest
npm test
```

## Frontend (`apps/routeshyft-web/`)
```bash
cd apps/routeshyft-web
npm install
npm run dev
npm run build
```

## Root-level Utilities
```bash
npm install
npm test
```

## Common Local Workflow
1. Start Postgres (docker-compose or local service).
2. Run backend migration(s).
3. Start backend on port 3000.
4. Start frontend on port 5173.
5. Validate API + UI flow.
