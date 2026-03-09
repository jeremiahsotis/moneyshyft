# MoneyShyft Production Deployment Guide

This guide is for the production topology you described:

- Single production server deployment target
- Host-managed Nginx reverse proxy as the public ingress layer
- Shared host-managed Postgres (not containerized)
- Dockerized Node APIs: `admin-api`, `moneyshyft-api`, and `connectshyft-api`
- Static frontend builds produced on the host and served by Nginx
- Small server profile (2 GB RAM, 1 vCPU, 25 GB SSD)

## 0) Capacity Verdict for 2 GB / 1 vCPU

This is feasible, not a giant problem, if you keep the deployment lean:

- Keep Nginx on the host (do not run an extra Nginx container for this app)
- Serve frontend as static files from disk (do not containerize frontend runtime)
- Cap API memory (`NODE_OPTIONS=--max-old-space-size=384`)
- Keep Postgres host-managed and tuned on the server
- Enable swap (recommended 2 GB) to avoid OOM during image/frontend builds
- Keep Docker logs rotated and clean old images regularly

Approximate RAM envelope on this server:

- OS + host Nginx + background services: 350-600 MB
- Three Node API containers combined: 550-1200 MB (workload-dependent)
- Host-managed Postgres service: 250-700 MB (outside Docker)
- Remaining headroom is tight during build/deploy spikes; swap helps.

## 1) One-Time Server Prep

```bash
# Ubuntu/Debian example
sudo apt-get update
sudo apt-get install -y ca-certificates curl git rsync postgresql-client

# Install Docker + Compose plugin if missing
# (skip if already installed)

# Install Node.js 20 on host (required for frontend builds)
# (skip if already installed)

# Optional but strongly recommended on 2 GB RAM:
# create 2 GB swap once
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Create deploy directories
sudo mkdir -p /opt/shyftunity/env /opt/shyftunity/backups /home/jeremiahotis/projects
sudo chown -R "$USER":"$USER" /opt/shyftunity
```

## 2) Clone Repo and Create Deployment Files

```bash
cd /home/jeremiahotis/projects
git clone https://github.com/jeremiahotis/moneyshyft.git shyftunity
cd shyftunity

# Use the normalized three-API production compose contract
cp architecture/contracts/docker-compose.production.shared.yml docker-compose.yml
```

Create a local compose variable file (gitignored):

```bash
cat > .env <<'ENVVARS'
ADMIN_API_ENV_FILE=/opt/shyftunity/env/admin-api.env
MONEYSHYFT_API_ENV_FILE=/opt/shyftunity/env/moneyshyft-api.env
CONNECTSHYFT_API_ENV_FILE=/opt/shyftunity/env/connectshyft-api.env
ENVVARS
```

Create API environment files outside git:

```bash
cat > /opt/shyftunity/env/admin-api.env <<'ENVFILE'
NODE_ENV=production
PORT=3100
DATABASE_URL=postgresql://<user>:<password>@host.docker.internal:5432/<database>
FRONTEND_URL=https://admin.shyftunity.com
COOKIE_DOMAIN=.shyftunity.com
JWT_SECRET=replace-with-openssl-rand-base64-48
JWT_REFRESH_SECRET=replace-with-openssl-rand-base64-48
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
LOG_LEVEL=info
ENVFILE

cat > /opt/shyftunity/env/moneyshyft-api.env <<'ENVFILE'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@host.docker.internal:5432/<database>
FRONTEND_URL=https://money.shyftunity.com
COOKIE_DOMAIN=.shyftunity.com

JWT_SECRET=replace-with-openssl-rand-base64-48
JWT_REFRESH_SECRET=replace-with-openssl-rand-base64-48
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

LOG_LEVEL=info
MONEYSHYFT_WP_CUTOVER_STAGE=monolith_authoritative
ENVFILE

cat > /opt/shyftunity/env/connectshyft-api.env <<'ENVFILE'
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://<user>:<password>@host.docker.internal:5432/<database>
FRONTEND_URL=https://connect.shyftunity.com
COOKIE_DOMAIN=.shyftunity.com
JWT_SECRET=replace-with-openssl-rand-base64-48
JWT_REFRESH_SECRET=replace-with-openssl-rand-base64-48
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
LOG_LEVEL=info
ENVFILE
```

Generate strong JWT secrets:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

## 3) Frontend Build and Publish

Build and publish all lane frontends on the host:

```bash
cd /home/jeremiahotis/projects/shyftunity/apps/admin-web
npm ci
npm run build

cd /home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web
npm ci
npm run build

cd /home/jeremiahotis/projects/shyftunity/apps/connectshyft-web
npm ci
npm run build
```

## 4) Nginx Site Config (Host-Managed)

Nginx remains host-managed and is the only public ingress layer.
Validate that lane roots and API upstreams match the deployment contract for:

- `admin.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/admin-web/dist`
- `money.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web/dist`
- `connect.shyftunity.com` -> `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`

Required upstreams:

```nginx
upstream admin_api { server 127.0.0.1:3100; keepalive 32; }
upstream money_api { server 127.0.0.1:3000; keepalive 32; }
upstream connect_api { server 127.0.0.1:3002; keepalive 32; }
```

For money and connect lanes, delegated routes `/api/v1/auth/*` and `/api/v1/platform/admin/*` must proxy to `admin_api`, and lane-local `/api/*` routes must remain lane-owned.

Enable and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Start Containers and Run Migrations

```bash
cd /home/jeremiahotis/projects/shyftunity

# Build API images
docker compose build admin-api money-api connect-api

# Run production migrations from the authority only
docker compose run --rm admin-api npm run migrate:latest:prod

# Start or restart APIs
docker compose up -d admin-api money-api connect-api
```

## 6) Smoke Checks

```bash
# Containers healthy
cd /home/jeremiahotis/projects/shyftunity
docker compose ps

# API health on loopback
curl -f http://127.0.0.1:3100/health
curl -f http://127.0.0.1:3000/health
curl -f http://127.0.0.1:3002/health

# Public web checks
curl -I https://admin.shyftunity.com
curl -I https://money.shyftunity.com
curl -I https://connect.shyftunity.com

# API routing check (401/403 is acceptable for auth-protected routes)
curl -i https://money.shyftunity.com/api/v1/auth/me
curl -i https://connect.shyftunity.com/api/v1/auth/me

# API logs
docker logs admin-api --tail 100
docker logs moneyshyft-api --tail 100
docker logs connectshyft-api --tail 100
```

## 7) Update / Redeploy Procedure

Run this sequence as the normalized production workflow for every deployment:

1. Prerequisites
   - Confirm single production server access and required tools (`docker`, `docker compose`, `nginx`, `psql` client).
   - Confirm `/opt/shyftunity/env/admin-api.env`, `/opt/shyftunity/env/moneyshyft-api.env`, and `/opt/shyftunity/env/connectshyft-api.env` are present.
   - Confirm shared host Postgres is reachable from host and Docker host-gateway paths.
2. Environment preparation
   - Pull the release commit to `/home/jeremiahotis/projects/shyftunity`.
   - Confirm frontend publish roots and lane domain mappings are unchanged.
   - Confirm `docker-compose.yml` is based on `architecture/contracts/docker-compose.production.shared.yml`.
3. Frontend build and publish
   - Build `admin-web`, `moneyshyft-web`, and `connectshyft-web` on host and publish `dist/` outputs in place.
4. API build and start
   - Build `admin-api`, `moneyshyft-api`, and `connectshyft-api` images.
5. Migration execution from authority
   - Run production migrations once from `admin-api` only.
6. Service start or restart
   - Start or recreate all three API containers.
7. Nginx validation and reload
   - Run `sudo nginx -t` then reload on success.
8. Deployment verification
   - Verify lane frontend responses, API health endpoints, and delegated auth/platform-admin routing behavior.

```bash
cd /home/jeremiahotis/projects/shyftunity

# 1) Pull latest code
git fetch origin
git checkout codex/dev
git pull --ff-only origin codex/dev

# 2) Optional host-managed Postgres backup before migrations
BACKUP_FILE="/opt/shyftunity/backups/shared-postgres-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump "<host-postgres-connection-string>" | gzip > "$BACKUP_FILE"

# 3) Rebuild frontend bundles on host
cd /home/jeremiahotis/projects/shyftunity/apps/admin-web && npm ci && npm run build
cd /home/jeremiahotis/projects/shyftunity/apps/moneyshyft-web && npm ci && npm run build
cd /home/jeremiahotis/projects/shyftunity/apps/connectshyft-web && npm ci && npm run build

# 4) Build API images
cd /home/jeremiahotis/projects/shyftunity
docker compose build admin-api moneyshyft-api connectshyft-api

# 5) Run migrations from authority only
docker compose run --rm admin-api npm run migrate:latest:prod

# 6) Recreate API containers
docker compose up -d --no-deps --force-recreate admin-api moneyshyft-api connectshyft-api

# 7) Validate and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# 8) Verify deployment
curl -f http://127.0.0.1:3100/health
curl -f http://127.0.0.1:3000/health
curl -f http://127.0.0.1:3002/health
curl -I https://admin.shyftunity.com
curl -I https://money.shyftunity.com
curl -I https://connect.shyftunity.com
```

## Rollback Procedure

Rollback Step 1: Identify the last known-good commit and the latest verified backup artifact.

Rollback Step 2: Revert code and restart the API container image.

```bash
# Roll back code to known-good commit
cd /home/jeremiahotis/projects/shyftunity
git checkout <last-known-good-commit>

# Rebuild and restart API with old code
docker compose build admin-api moneyshyft-api connectshyft-api
docker compose up -d --no-deps --force-recreate admin-api moneyshyft-api connectshyft-api
```

Rollback Step 3: Validate API health and key operator journeys.

Rollback Step 4: If migration/data issues are present, restore the database backup.

```bash
cd /home/jeremiahotis/projects/shyftunity
gunzip -c /opt/shyftunity/backups/<backup-file>.sql.gz | psql "<host-postgres-connection-string>"
```

## 9) Operational Guardrails for a Small Droplet

- Keep `3000` bound to loopback only (`127.0.0.1:3000:3000` in compose).
- Keep `3100`, `3000`, and `3002` bound to loopback only.
- Keep shared Postgres host-managed and non-public.
- Prune old images monthly:
  - `docker image prune -af`
- Monitor disk and memory:
  - `df -h`
  - `free -m`
  - `docker stats --no-stream`
- If memory pressure persists, tune host Postgres and API container memory limits first.

## 10) Deployment Model Boundaries

This guide intentionally covers one deployment model only:

- single production server target
- host-managed Nginx ingress
- shared host-managed Postgres
- Dockerized Node APIs for admin, money, and connect
- host-built static frontends served by Nginx

Out of scope in this guide:

- alternate deployment models
- containerized Postgres
- additional deployment lanes
- future domain architecture changes
