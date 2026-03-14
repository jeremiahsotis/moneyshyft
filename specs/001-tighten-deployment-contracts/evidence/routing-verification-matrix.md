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
| `money_api` | `money-api` (money lane API authority) | `127.0.0.1:3000` |
| `connect_api` | `connect-api` (connect lane API authority) | `127.0.0.1:3002` |

## Lane routing verification matrix

| Domain | Route class | Path pattern | Probe request path | Expected upstream | Expected service target |
|---|---|---|---|---|---|
| `admin.shyftunity.com` | Admin API | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `admin.shyftunity.com` | Admin API | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `admin.shyftunity.com` | Admin lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Delegated auth | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Delegated platform admin | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `money.shyftunity.com` | Money lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `money_api` | `money-api` |
| `connect.shyftunity.com` | Delegated auth | `/api/v1/auth/*` | `/api/v1/auth/__routing_probe__` | `admin_api` | `admin-api` |
| `connect.shyftunity.com` | Delegated platform admin | `/api/v1/platform/admin/*` | `/api/v1/platform/admin/__routing_probe__` | `admin_api` | `admin-api` |
| `connect.shyftunity.com` | Connect lane-local API | other `/api/*` | `/api/v1/__routing_probe__` | `connect_api` | `connect-api` |

## Execution steps

1. Generate a unique probe token and output directory:

```bash
PROBE="routing-$(date +%s)"
OUT_DIR="/tmp/${PROBE}"
mkdir -p "${OUT_DIR}"
echo "Probe token: ${PROBE}"
echo "Output dir: ${OUT_DIR}"
```

2. Execute probe requests for each matrix row and capture response headers:

```bash
set -euo pipefail

declare -a ROUTES=(
  "admin.shyftunity.com|/api/v1/auth/__routing_probe__|admin_api|admin-api"
  "admin.shyftunity.com|/api/v1/platform/admin/__routing_probe__|admin_api|admin-api"
  "admin.shyftunity.com|/api/v1/__routing_probe__|admin_api|admin-api"
  "money.shyftunity.com|/api/v1/auth/__routing_probe__|admin_api|admin-api"
  "money.shyftunity.com|/api/v1/platform/admin/__routing_probe__|admin_api|admin-api"
  "money.shyftunity.com|/api/v1/__routing_probe__|money_api|money-api"
  "connect.shyftunity.com|/api/v1/auth/__routing_probe__|admin_api|admin-api"
  "connect.shyftunity.com|/api/v1/platform/admin/__routing_probe__|admin_api|admin-api"
  "connect.shyftunity.com|/api/v1/__routing_probe__|connect_api|connect-api"
)

printf "domain,path,expected_upstream,expected_service,status_code\n" > "${OUT_DIR}/probe-results.csv"

for row in "${ROUTES[@]}"; do
  IFS='|' read -r domain path expected_upstream expected_service <<< "${row}"
  url="https://${domain}${path}?probe=${PROBE}"
  header_file="${OUT_DIR}/$(echo "${domain}${path}" | tr '/.' '__').headers"
  status_code="$(curl -skS -o /dev/null -D "${header_file}" -w "%{http_code}" "${url}")"

  printf "%s,%s,%s,%s,%s\n" "${domain}" "${path}" "${expected_upstream}" "${expected_service}" "${status_code}" >> "${OUT_DIR}/probe-results.csv"
  echo "${domain} ${path} -> HTTP ${status_code}"

  if [[ "${status_code}" -lt 200 || "${status_code}" -ge 500 ]]; then
    echo "FAIL: unexpected status for ${url}"
    exit 1
  fi
done

cat "${OUT_DIR}/probe-results.csv"
```

3. Confirm every probe is present in Nginx access logs:

```bash
sudo rg "probe=${PROBE}" /var/log/nginx/access.log > "${OUT_DIR}/nginx-routing-lines.log"
wc -l "${OUT_DIR}/nginx-routing-lines.log"
```

4. Validate each row routes to the expected upstream and loopback target (based on Nginx access log fields):

```bash
rg "admin_api|money_api|connect_api|127.0.0.1:3100|127.0.0.1:3000|127.0.0.1:3002" "${OUT_DIR}/nginx-routing-lines.log"
```

- `admin_api` rows must resolve to `127.0.0.1:3100`
- `money_api` rows must resolve to `127.0.0.1:3000`
- `connect_api` rows must resolve to `127.0.0.1:3002`

5. Save evidence artifacts from `${OUT_DIR}` with the deployment verification record.

## Pass criteria

- Every delegated route (`/api/v1/auth/*`, `/api/v1/platform/admin/*`) for money/connect resolves to `admin_api`.
- Every lane-local `/api/*` route resolves to the lane API upstream (`money_api` for money, `connect_api` for connect, `admin_api` for admin).
- No matrix row resolves to an upstream outside the canonical targets above.
