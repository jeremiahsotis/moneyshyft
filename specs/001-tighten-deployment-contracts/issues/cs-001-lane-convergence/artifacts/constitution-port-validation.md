# Constitution Port and Bind Validation (T048)

Date: 2026-03-10
Scope: CS-001 lane convergence
Method: Repository contract validation (production compose + Nginx upstreams + runbook)

## Sources Checked

- `docker-compose.production.example.yml`
- `nginx/host-managed-subdomains.example.conf`
- `PRODUCTION_DEPLOYMENT_GUIDE.md`

## Validation Checks

1. `admin-api` binds localhost only on canonical port
- Evidence: compose line 15 `127.0.0.1:3100:3100`
- Result: PASS

2. `money-api` binds localhost only on canonical port
- Evidence: compose line 40 `127.0.0.1:3000:3000`
- Result: PASS

3. `connect-api` binds localhost only on canonical port
- Evidence: compose line 65 `127.0.0.1:3002:3002`
- Result: PASS

4. Nginx upstream targets match canonical loopback API ports
- Evidence: Nginx lines 7, 12, 17
- Result: PASS

5. Deployment guide operational guardrails reiterate loopback-only binding
- Evidence: `PRODUCTION_DEPLOYMENT_GUIDE.md` lines 307-309
- Result: PASS

## Conclusion

Canonical API bind/port contract is satisfied by repository deployment artifacts.
