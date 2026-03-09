# MoneyShyft Production Deployment Checklist

Use this with [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md).
This checklist is scoped to one reproducible deployment flow for this round and matches the normalized workflow in the production runbook and top-level deployment guide.
Deployment model in scope only: host-managed Nginx, shared host-managed Postgres, Dockerized `admin-api`/`moneyshyft-api`/`connectshyft-api`, and host-built static frontends (`admin-web`/`moneyshyft-web`/`connectshyft-web`).

## Preflight

- [ ] Server meets minimum profile (2 GB RAM / 1 vCPU / 25 GB SSD)
- [ ] Optional swap configured (recommended on 2 GB)
- [ ] Docker and Docker Compose plugin installed
- [ ] Host Nginx installed and serving other sites normally
- [ ] Host Postgres is installed/running and reachable from host and Docker host-gateway paths
- [ ] Domains + TLS certs ready for `admin.shyftunity.com`, `money.shyftunity.com`, and `connect.shyftunity.com`

## Config

- [ ] Repo cloned to `/home/jeremiahotis/projects/shyftunity`
- [ ] `docker-compose.yml` created from `architecture/contracts/docker-compose.production.shared.yml`
- [ ] Local `.env` created with `ADMIN_API_ENV_FILE`, `MONEYSHYFT_API_ENV_FILE`, and `CONNECTSHYFT_API_ENV_FILE`
- [ ] API env files created at `/opt/shyftunity/env/admin-api.env`, `/opt/shyftunity/env/moneyshyft-api.env`, and `/opt/shyftunity/env/connectshyft-api.env`
- [ ] `NODE_ENV=production`
- [ ] Each API `DATABASE_URL` points to the shared host Postgres database
- [ ] Each API `FRONTEND_URL` matches its lane domain
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set to strong random values

## Frontend

- [ ] Frontends built on host (`apps/admin-web/dist`, `apps/moneyshyft-web/dist`, `apps/connectshyft-web/dist`)
- [ ] Nginx lane roots point to `/home/jeremiahotis/projects/shyftunity/apps/admin-web/dist`, `/home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web/dist`, and `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`
- [ ] Nginx upstreams `admin_api`, `money_api`, and `connect_api` point to `127.0.0.1:3100`, `127.0.0.1:3000`, and `127.0.0.1:3002`
- [ ] Delegated routing configured: money/connect `/api/v1/auth/*` and `/api/v1/platform/admin/*` proxy to `admin_api`; lane-local `/api/*` remains lane-owned
- [ ] `sudo nginx -t` passes
- [ ] Nginx reloaded

## Backend + DB

- [ ] API images built (`docker compose build admin-api moneyshyft-api connectshyft-api`)
- [ ] Backup created before migrations
- [ ] Migrations executed once from authority only (`docker compose run --rm admin-api npm run migrate:latest:prod`)
- [ ] API containers started (`docker compose up -d admin-api moneyshyft-api connectshyft-api`)

## Verification

- [ ] `docker compose ps` shows healthy services
- [ ] `curl -f http://127.0.0.1:3100/health`, `curl -f http://127.0.0.1:3000/health`, and `curl -f http://127.0.0.1:3002/health` succeed
- [ ] `curl -I https://admin.shyftunity.com`, `curl -I https://money.shyftunity.com`, and `curl -I https://connect.shyftunity.com` return `200` or `304`
- [ ] Routing delegation verifies correctly for money/connect delegated auth/platform-admin paths via Nginx
- [ ] Lane-local API routes remain lane-owned (not delegated) through Nginx
- [ ] Shared host Postgres receives connections for all three APIs
- [ ] API ports are loopback-only and not publicly exposed
- [ ] Login/signup flow works from browser
- [ ] No critical errors in `docker logs admin-api --tail 100`, `docker logs moneyshyft-api --tail 100`, and `docker logs connectshyft-api --tail 100`

## Post-Deploy

- [ ] Monitor memory/disk (`free -m`, `df -h`, `docker stats --no-stream`)
- [ ] Confirm backups exist in `/opt/shyftunity/backups`
- [ ] Confirm rollback target (commit/tag + backup file)
- [ ] Remove unused Docker images if disk is tight

## Quick Rollback:

- [ ] Revert to the last known-good commit and redeploy API container image.
- [ ] Restore the latest verified database backup if migration/data issues are detected.
- [ ] See PRODUCTION_DEPLOYMENT_GUIDE.md → Rollback Step 4
