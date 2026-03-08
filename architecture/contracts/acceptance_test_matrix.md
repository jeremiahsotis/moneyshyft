# Acceptance Test Matrix

## Admin

### Web
- `GET https://admin.shyftunity.com` returns HTML and loads the SPA shell.

### API routing
- `GET https://admin.shyftunity.com/api/v1/auth/me` reaches `admin-api`
- `GET https://admin.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

## MoneyShyft

### Web
- `GET https://money.shyftunity.com` returns HTML and loads the MoneyShyft SPA.

### Auth routing
- `GET https://money.shyftunity.com/api/v1/auth/me` reaches `admin-api`

### Platform admin routing
- `GET https://money.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

### Lane routing
- lane-specific `/api/*` requests reach `moneyshyft-api`

## ConnectShyft

### Web
- `GET https://connect.shyftunity.com` returns HTML and loads the ConnectShyft SPA.

### Auth routing
- `GET https://connect.shyftunity.com/api/v1/auth/me` reaches `admin-api`

### Platform admin routing
- `GET https://connect.shyftunity.com/api/v1/platform/admin/tenants` reaches `admin-api`

### Lane routing
- lane-specific `/api/*` requests reach `connectshyft-api`

## Shared Postgres
- all three API containers show the same target `DATABASE_URL` host and DB name
- `pg_stat_activity` confirms live connections from all three services

## Visibility and capability posture
- user with required capability sees lane entry
- user without required capability does not see lane entry
- unauthorized direct route access is rejected or redirected correctly

## Operational checks
- `nginx -t` passes
- all three `/health` endpoints pass
- container logs do not show upstream mismatch or DB connection errors
