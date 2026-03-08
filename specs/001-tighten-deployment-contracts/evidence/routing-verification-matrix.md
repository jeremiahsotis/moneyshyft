# Routing Verification Matrix (Spec 001)

## Purpose

Provide executable evidence checks for lane routing ownership across:

- `admin.shyftunity.com`
- `money.shyftunity.com`
- `connect.shyftunity.com`

This matrix aligns with:

- `specs/001-tighten-deployment-contracts/contracts/lane-routing-contract.md`
- `architecture/contracts/production_deployment_contract.md`
- `architecture/contracts/nginx/shyftunity-admin-money-connect.conf`

## Canonical upstream and service targets

| Nginx upstream | Service target | Loopback target |
|---|---|---|
| `admin_api` | `admin-api` | `127.0.0.1:3100` |
| `money_api` | `moneyshyft-api` (money lane API authority) | `127.0.0.1:3000` |
| `connect_api` | `connectshyft-api` (connect lane API authority) | `127.0.0.1:3002` |

## Lane routing verification matrix

| Domain | Route class | Path pattern | Probe request path | Expected upstream | Expected service target |
|---|---|---|---|---|---|
| `admin.shyftunity.com` | Admin API | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `admin.shyftunity.com` | Admin API | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `admin.shyftunity.com` | Admin lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Delegated auth | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Delegated platform admin | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Money lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `money_api` | `moneyshyft-api` |
| `connect.shyftunity.com` | Delegated auth | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `connect.shyftunity.com` | Delegated platform admin | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `connect.shyftunity.com` | Connect lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `connect_api` | `connectshyft-api` |

## Execution steps

1. Generate a unique probe token:

```bash
PROBE="routing-$(date +%s)"
```

2. Execute probe requests for each matrix row:

```bash
curl -skI "https://admin.shyftunity.com/api/v1/auth/__routing_probe__?probe=${PROBE}"
curl -skI "https://admin.shyftunity.com/api/v1/platform/admin/__routing_probe__?probe=${PROBE}"
curl -skI "https://admin.shyftunity.com/api/v1/__routing_probe__?probe=${PROBE}"

curl -skI "https://money.shyftunity.com/api/v1/auth/__routing_probe__?probe=${PROBE}"
curl -skI "https://money.shyftunity.com/api/v1/platform/admin/__routing_probe__?probe=${PROBE}"
curl -skI "https://money.shyftunity.com/api/v1/__routing_probe__?probe=${PROBE}"

curl -skI "https://connect.shyftunity.com/api/v1/auth/__routing_probe__?probe=${PROBE}"
curl -skI "https://connect.shyftunity.com/api/v1/platform/admin/__routing_probe__?probe=${PROBE}"
curl -skI "https://connect.shyftunity.com/api/v1/__routing_probe__?probe=${PROBE}"
```

3. Confirm expected upstream target from Nginx logs (match by probe token):

```bash
sudo rg "probe=${PROBE}" /var/log/nginx/access.log
```

4. Validate each hit routes to the expected loopback target:

- `admin_api` rows resolve to `127.0.0.1:3100`
- `money_api` rows resolve to `127.0.0.1:3000`
- `connect_api` rows resolve to `127.0.0.1:3002`

## Pass criteria

- Every delegated route (`/api/v1/auth/*`, `/api/v1/platform/admin/*`) for money/connect resolves to `admin_api`.
- Every lane-local `/api/*` route resolves to the lane API upstream (`money_api` for money, `connect_api` for connect, `admin_api` for admin).
- No matrix row resolves to an upstream outside the canonical targets above.
