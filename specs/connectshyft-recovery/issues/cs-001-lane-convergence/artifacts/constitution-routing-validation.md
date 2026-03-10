# Constitution Routing Validation (T047)

Date: 2026-03-10
Scope: CS-001 lane convergence
Method: Repository contract validation (host Nginx config + deployment guide)

## Sources Checked

- `nginx/host-managed-subdomains.example.conf`
- `PRODUCTION_DEPLOYMENT_GUIDE.md`

## Validation Checks

1. Delegation of `/api/v1/auth/*` to `admin_api` for money lane
- Evidence: `nginx/host-managed-subdomains.example.conf` lines 69-78
- Result: PASS

2. Delegation of `/api/v1/platform/admin/*` to `admin_api` for money lane
- Evidence: `nginx/host-managed-subdomains.example.conf` lines 80-89
- Result: PASS

3. Delegation of `/api/v1/auth/*` to `admin_api` for connect lane
- Evidence: `nginx/host-managed-subdomains.example.conf` lines 119-128
- Result: PASS

4. Delegation of `/api/v1/platform/admin/*` to `admin_api` for connect lane
- Evidence: `nginx/host-managed-subdomains.example.conf` lines 130-139
- Result: PASS

5. Lane-local `/api/*` ownership remains lane-routed
- Money lane evidence: lines 91-100 (`proxy_pass http://money_api`)
- Connect lane evidence: lines 141-150 (`proxy_pass http://connect_api`)
- Result: PASS

6. Deployment contract statement matches config behavior
- Evidence: `PRODUCTION_DEPLOYMENT_GUIDE.md` line 165
- Result: PASS

## Conclusion

Routing delegation contract is satisfied in repository-hosted Nginx/deployment artifacts.
