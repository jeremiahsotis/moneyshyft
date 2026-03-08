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
