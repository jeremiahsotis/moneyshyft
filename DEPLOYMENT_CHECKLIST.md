# MoneyShyft Production Deployment Checklist

Use this with [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md).

## Preflight

- [ ] Server meets minimum profile (2 GB RAM / 1 vCPU / 25 GB SSD)
- [ ] Optional swap configured (recommended on 2 GB)
- [ ] Docker and Docker Compose plugin installed
- [ ] Host Nginx installed and serving other sites normally
- [ ] Domain + TLS cert ready for `money.shyftunity.com` (wildcard cert is fine)

## Config

- [ ] Repo cloned to `/home/jeremiahotis/projects/connectshyft`
- [ ] `docker-compose.yml` created from `docker-compose.production.example.yml`
- [ ] Local `.env` created with `POSTGRES_*` and `MONEYSHYFT_API_ENV_FILE`
- [ ] API env file created at `/opt/moneyshyft/env/moneyshyft-api.env`
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` points to correct database
- [ ] `FRONTEND_URL=https://money.shyftunity.com`
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set to strong random values

## Frontend

- [ ] Frontend built (`apps/moneyshyft-web/dist`)
- [ ] Nginx `money.shyftunity.com` root points to `/home/jeremiahotis/projects/connectshyft/apps/moneyshyft-web/dist`
- [ ] Nginx upstream `money_api` points to `127.0.0.1:3000`
- [ ] Nginx `/api/` proxy points to `http://127.0.0.1:3000`
- [ ] `sudo nginx -t` passes
- [ ] Nginx reloaded

## Backend + DB

- [ ] API image built (`docker compose build node`)
- [ ] Postgres running (compose or shared external)
- [ ] Backup created before migrations
- [ ] Migrations executed (`docker compose run --rm node npm run migrate:latest:prod`)
- [ ] API container started (`docker compose up -d node`)

## Verification

- [ ] `docker compose ps` shows healthy services
- [ ] `curl -f http://127.0.0.1:3000/health` succeeds
- [ ] `curl -I https://money.shyftunity.com` returns `200` (or `304`)
- [ ] `https://money.shyftunity.com/api/...` routes through Nginx correctly
- [ ] Login/signup flow works from browser
- [ ] No critical errors in `docker logs moneyshyft-api --tail 100`

## Post-Deploy

- [ ] Monitor memory/disk (`free -m`, `df -h`, `docker stats --no-stream`)
- [ ] Confirm backups exist in `/opt/moneyshyft/backups`
- [ ] Confirm rollback target (commit/tag + backup file)
- [ ] Remove unused Docker images if disk is tight

## Quick Rollback:

- [ ] Revert to the last known-good commit and redeploy API container image.
- [ ] Restore the latest verified database backup if migration/data issues are detected.
- [ ] See PRODUCTION_DEPLOYMENT_GUIDE.md → Rollback Step 4
