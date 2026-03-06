# MoneyShyft Production Deployment Guide

This guide is for the production topology you described:
- Host-managed Nginx reverse proxy (shared with other sites)
- Dockerized MoneyShyft API and Postgres
- Static frontend files served by host Nginx
- Small server profile (2 GB RAM, 1 vCPU, 25 GB SSD)
- Domain lane: `money.shyftunity.com`

## 0) Capacity Verdict for 2 GB / 1 vCPU

This is feasible, not a giant problem, if you keep the deployment lean:
- Keep Nginx on the host (do not run an extra Nginx container for this app)
- Serve frontend as static files from disk (do not containerize frontend runtime)
- Cap API memory (`NODE_OPTIONS=--max-old-space-size=384`)
- Use conservative Postgres settings (included in the compose template)
- Enable swap (recommended 2 GB) to avoid OOM during image/frontend builds
- Keep Docker logs rotated and clean old images regularly

Approximate RAM envelope on this server:
- OS + host Nginx + background services: 350-600 MB
- MoneyShyft API container: 180-450 MB
- Postgres container (tuned): 250-700 MB
- Remaining headroom is tight during build/deploy spikes; swap helps.

## 1) One-Time Server Prep

```bash
# Ubuntu/Debian example
sudo apt-get update
sudo apt-get install -y ca-certificates curl git rsync

# Install Docker + Compose plugin if missing
# (skip if already installed)

# Optional but strongly recommended on 2 GB RAM:
# create 2 GB swap once
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Create deploy directories
sudo mkdir -p /opt/moneyshyft/env /opt/moneyshyft/backups /home/jeremiahotis/projects
sudo chown -R "$USER":"$USER" /opt/moneyshyft
```

## 2) Clone Repo and Create Deployment Files

```bash
cd /home/jeremiahotis/projects
git clone https://github.com/jeremiahotis/moneyshyft.git connectshyft
cd connectshyft

# Use the production compose template from this repo
cp docker-compose.production.example.yml docker-compose.yml
```

Create a local compose variable file (gitignored):

```bash
cat > .env <<'ENVVARS'
POSTGRES_USER=moneyshyft
POSTGRES_PASSWORD=change-this-strong-password
POSTGRES_DB=moneyshyft
MONEYSHYFT_API_ENV_FILE=/opt/moneyshyft/env/moneyshyft-api.env
ENVVARS
```

Create the API environment file outside git:

```bash
cat > /opt/moneyshyft/env/moneyshyft-api.env <<'ENVFILE'
NODE_ENV=production
PORT=3000

# Option A (recommended on small servers): point to your existing shared Postgres instance.
# Option B: use the Postgres service in docker-compose.yml (host=postgres).
DATABASE_URL=postgresql://moneyshyft:change-this-strong-password@postgres:5432/moneyshyft

FRONTEND_URL=https://money.shyftunity.com
COOKIE_DOMAIN=money.shyftunity.com

JWT_SECRET=replace-with-openssl-rand-base64-48
JWT_REFRESH_SECRET=replace-with-openssl-rand-base64-48
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

LOG_LEVEL=info
MONEYSHYFT_WP_CUTOVER_STAGE=monolith_authoritative
ENVFILE
```

Generate strong JWT secrets:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

## 3) Frontend Build and Publish

Recommended on this droplet: build in CI/local machine and upload `dist/`.
If you build directly on server, install Node.js 20 first, then:

```bash
cd /home/jeremiahotis/projects/connectshyft/apps/moneyshyft-web
npm ci
npm run build
```

## 4) Nginx Site Config (Host-Managed)

Your server already has shared `shyftunity.com` Nginx config. Do not add a new global redirect block.
Only verify/update the `money` lane to point at this repo's frontend dist and `money_api` upstream.

Required upstream (you already have this):

```nginx
upstream money_api { server 127.0.0.1:3000; keepalive 32; }
```

Money lane server block:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name money.shyftunity.com;

    ssl_certificate     /etc/letsencrypt/live/shyftunity.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shyftunity.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    root /home/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://money_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

If you keep your current deploy path layout (`/home/jeremiahotis/projects/shyft/...`), set `root` to that location instead. The important part is that it points at this app's built `dist` directory.

Enable and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Start Containers and Run Migrations

```bash
cd /home/jeremiahotis/projects/connectshyft

# Build API image
docker compose build node

# Start database first (skip if using external/shared Postgres)
docker compose up -d postgres

# Run production migrations
docker compose run --rm node npm run migrate:latest:prod

# Start or restart API
docker compose up -d node
```

## 6) Smoke Checks

```bash
# Containers healthy
cd /home/jeremiahotis/projects/connectshyft
docker compose ps

# API health on loopback
curl -f http://127.0.0.1:3000/health

# Public web check
curl -I https://money.shyftunity.com

# API routing check (401/403 is acceptable for auth-protected routes)
curl -i https://money.shyftunity.com/api/v1/auth/me

# API logs
docker logs moneyshyft-api --tail 100
```

## 7) Update / Redeploy Procedure

```bash
cd /home/jeremiahotis/projects/connectshyft

# 1) Pull latest code
git fetch origin
git checkout main
git pull --ff-only origin main

# 2) Rebuild API image
docker compose build node

# 3) Backup DB before migrations (if using local postgres container)
BACKUP_FILE="/opt/moneyshyft/backups/moneyshyft-$(date +%Y%m%d-%H%M%S).sql.gz"
set -a; source .env; set +a
docker exec moneyshyft-postgres pg_dump -U "${POSTGRES_USER:-moneyshyft}" "${POSTGRES_DB:-moneyshyft}" | gzip > "$BACKUP_FILE"

# 4) Run migrations
docker compose run --rm node npm run migrate:latest:prod

# 5) Recreate API container
docker compose up -d --no-deps --force-recreate node

# 6) Rebuild + republish frontend
cd /home/jeremiahotis/projects/connectshyft/apps/moneyshyft-web
npm ci
npm run build

# 7) Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Rollback Procedure

Rollback Step 1: Identify the last known-good commit and the latest verified backup artifact.

Rollback Step 2: Revert code and restart the API container image.

```bash
# Roll back code to known-good commit
cd /home/jeremiahotis/projects/connectshyft
git checkout <last-known-good-commit>

# Rebuild and restart API with old code
docker compose build node
docker compose up -d --no-deps --force-recreate node
```

Rollback Step 3: Validate API health and key operator journeys.

Rollback Step 4: If migration/data issues are present, restore the database backup.

```bash
cd /home/jeremiahotis/projects/connectshyft
set -a; source .env; set +a
gunzip -c /opt/moneyshyft/backups/<backup-file>.sql.gz | docker exec -i moneyshyft-postgres psql -U "${POSTGRES_USER:-moneyshyft}" "${POSTGRES_DB:-moneyshyft}"
```

## 9) Operational Guardrails for a Small Droplet

- Keep `3000` bound to loopback only (`127.0.0.1:3000:3000` in compose).
- Do not publish Postgres (`5432`) publicly unless absolutely required.
- Prune old images monthly:
  - `docker image prune -af`
- Monitor disk and memory:
  - `df -h`
  - `free -m`
  - `docker stats --no-stream`
- If memory pressure persists, first move Postgres to a managed/external instance.

## 10) Existing Shared Postgres Instead of Compose Postgres

If your server already has a shared Postgres container/service, that is usually better on 2 GB RAM.

- Set `DATABASE_URL` in `/opt/moneyshyft/env/moneyshyft-api.env` to that shared DB.
- Remove/disable the `postgres` service and `depends_on.postgres` in `docker-compose.yml`.
- Run only the `node` service with `docker compose up -d node`.

This reduces RAM usage and startup overhead while preserving the same Nginx/API routing model.
