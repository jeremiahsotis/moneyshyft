# Runtime Authority Audit Contract

Status: Governing contract

## Purpose
The audit must determine actual runtime authority based on evidence, not folder names or intent.

## Rules
1. Do not assume lane authority from repository structure alone.
2. Do not assume duplicated code is dead until routes, imports, build paths, and production runtime are checked.
3. Do not recommend lane convergence remediation until the audit produces an explicit authority map.
4. The audit must distinguish:
   - actual runtime authority
   - intended canonical authority
   - mirrored-identical code
   - mirrored-diverged code
   - dead/stale code
   - transitional code
   - unknown
5. RouteShyft artifacts inside money-api and moneyshyft-web must be classified explicitly, not ignored.

## Covered surfaces
- money-api
- moneyshyft-web
- connect-api
- admin-api
- migration-runner
