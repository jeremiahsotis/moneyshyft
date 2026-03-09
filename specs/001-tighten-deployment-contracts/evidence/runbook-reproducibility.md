# Runbook Reproducibility Execution Proof

## Purpose
This document is the execution evidence template for proving the production deployment runbook can be executed reproducibly for admin, money, and connect lanes without undocumented manual corrections.

## Execution Metadata
- Date:
- Operator:
- Environment:
- Release/Commit:
- Host:
- Execution ID:

## Preconditions Checklist
- [ ] Host Nginx access confirmed
- [ ] Docker Engine and Compose available
- [ ] Shared host Postgres reachable
- [ ] Production env artifacts present for `admin-api`, `money-api`, `connect-api`
- [ ] Canonical ports reserved: `admin-api:3100`, `money-api:3000`, `connect-api:3002`

## Runbook Execution Record

| Seq | Runbook Step | Evidence (command/log/path) | Result (pass/fail) | Notes |
|---|---|---|---|---|
| 1 | Prerequisites validation |  |  |  |
| 2 | Environment preparation |  |  |  |
| 3 | Frontend build and publish (`admin-web`, `moneyshyft-web`, `connectshyft-web`) |  |  |  |
| 4 | API image build (`admin-api`, `money-api`, `connect-api`) |  |  |  |
| 5 | Migration execution from `admin-api` only |  |  |  |
| 6 | Service start/restart and loopback binding verification |  |  |  |
| 7 | Nginx config validation and reload |  |  |  |
| 8 | Verification checks (web, routing, health, DB, security) |  |  |  |

## Packaging Contract Verification

| Lane | Dockerfile Evidence | Dependency Install Pattern | Build/Prune Pattern | Runtime Port |
|---|---|---|---|---|
| admin-api |  | `npm ci` with lockfile | `npm run build` then `npm prune --omit=dev` | `3100` |
| money-api |  | `npm ci` with lockfile | `npm run build` then `npm prune --omit=dev` | `3000` |
| connect-api |  | `npm ci` with lockfile | `npm run build` then `npm prune --omit=dev` | `3002` |

## Acceptance Evidence Mapping

| Requirement | Evidence Reference | Result (pass/fail) |
|---|---|---|
| Lane web availability (admin/money/connect) |  |  |
| Delegated route correctness (`/api/v1/auth/*`, `/api/v1/platform/admin/*`) |  |  |
| Lane-local API routing correctness (other `/api/*`) |  |  |
| API health checks for all services |  |  |
| Shared Postgres connectivity for all APIs |  |  |
| No public API port exposure |  |  |

## Re-run Determinism Check
- Re-run timestamp:
- Compared against prior execution ref:
- Outcome equivalence confirmed: [ ] yes [ ] no
- Undocumented manual intervention required: [ ] no [ ] yes
- If yes, describe deviation:
- Verification diffs reviewed (routes/health/ports/images): [ ] yes [ ] no

## Final Outcome
- Overall reproducibility result: [ ] pass [ ] fail
- Sign-off:
- Follow-up actions:
