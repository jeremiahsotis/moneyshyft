# Security Boundary Verification

## Purpose
This document records the ingress and port exposure rules for the 001-tighten-deployment-contracts deployment-tightening round. It verifies that production ingress remains centralized at host Nginx and that API/database boundaries are not publicly exposed.

## Ingress Model
- Host Nginx is the public ingress layer.
- Nginx serves static SPA frontend assets.
- Nginx proxies API traffic to localhost-bound upstream services.
- Each lane uses a dedicated subdomain.

## Public Exposure Rules
- Only Nginx listens on public HTTPS.
- API containers must bind to localhost only.
- API service ports must not be publicly reachable.
- Postgres must not be publicly exposed for lane access.

## Canonical Service Ports

| Service | Bind Address | Port | Publicly Exposed |
|--------|--------------|------|------------------|
| admin-api | 127.0.0.1 | 3100 | no |
| money-api | 127.0.0.1 | 3000 | no |
| connect-api | 127.0.0.1 | 3002 | no |
| nginx | public host interface | 443 | yes |

## Lane Boundary Summary

| Domain | Public Entry | Internal Target |
|-------|--------------|----------------|
| admin.shyftunity.com | nginx | admin-api |
| money.shyftunity.com | nginx | admin-api for auth/platform-admin, money-api for lane routes |
| connect.shyftunity.com | nginx | admin-api for auth/platform-admin, connect-api for lane routes |

## Verification Checklist

- [ ] Nginx is the only public ingress
- [ ] No API container ports are publicly exposed
- [ ] Localhost binding is enforced for lane APIs
- [ ] Lane routing flows through Nginx
- [ ] Shared Postgres is not exposed as a public lane dependency

## Validation Steps

1. Confirm only Nginx is publicly listening:
   - `sudo ss -ltnp | rg ":443|:80|:3100|:3000|:3002|:5432"`
   - Expected: public listeners on `:443`/`:80` for Nginx only; API and DB ports not public.
2. Confirm API containers are loopback-bound in compose contract:
   - `rg -n "127\\.0\\.0\\.1:3100|127\\.0\\.0\\.1:3000|127\\.0\\.0\\.1:3002" architecture/contracts/docker-compose.production.shared.yml`
3. Confirm PostgreSQL is not exposed in production compose scope:
   - `rg -n "5432|postgres" architecture/contracts/docker-compose.production.shared.yml`
   - Expected: no public Postgres port publish rule for lane APIs.
4. Confirm ingress routing boundaries are enforced by Nginx config:
   - `rg -n "/api/v1/auth|/api/v1/platform/admin|proxy_pass" architecture/contracts/nginx/shyftunity-admin-money-connect.conf`
   - Expected: delegated auth/platform-admin routes target `admin-api`; lane routes target lane APIs.
5. Confirm no direct external API ingress bypass:
   - `curl -I https://admin.shyftunity.com/api/health`
   - `curl -I https://money.shyftunity.com/api/health`
   - `curl -I https://connect.shyftunity.com/api/health`
   - Expected: responses served through Nginx domain ingress, not direct API port access.

## Evidence Capture
- Save `ss` output proving no public API or Postgres listeners.
- Save compose and nginx grep outputs proving loopback-only API binding and delegated ingress routing.
- Save curl headers proving domain-based ingress through Nginx.
