# Deployment Guide Index

Canonical production deployment docs for MoneyShyft:

- Full runbook: [`PRODUCTION_DEPLOYMENT_GUIDE.md`](../PRODUCTION_DEPLOYMENT_GUIDE.md)
- Quick checklist: [`DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md)
- Compose template: [`docker-compose.production.example.yml`](../docker-compose.production.example.yml)

## Production Topology (Current)

- Host-managed Nginx handles TLS and reverse proxy.
- MoneyShyft API runs in Docker (`apps/moneyshyft-api/Dockerfile.production`).
- Postgres runs in Docker (or shared external Postgres).
- MoneyShyft frontend is built to static assets and served by host Nginx.
