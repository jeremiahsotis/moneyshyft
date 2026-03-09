# Lane Routing Contract

## In Scope

- `admin.shyftunity.com`
- `money.shyftunity.com`
- `connect.shyftunity.com`

## Route Ownership Rules

### Admin Lane

- Domain: `admin.shyftunity.com`
- Frontend owner: `admin-web`
- API rule: all `/api/*` -> `admin-api`

### Money Lane

- Domain: `money.shyftunity.com`
- Frontend owner: `moneyshyft-web`
- API rules:
  - `/api/v1/auth/*` -> `admin-api`
  - `/api/v1/platform/admin/*` -> `admin-api`
  - all other `/api/*` -> `money-api`

### Connect Lane

- Domain: `connect.shyftunity.com`
- Frontend owner: `connectshyft-web`
- API rules:
  - `/api/v1/auth/*` -> `admin-api`
  - `/api/v1/platform/admin/*` -> `admin-api`
  - all other `/api/*` -> `connect-api`

## Route Matching Order

Apply route ownership matching in this order for each lane host:

1. `/api/v1/auth/*`
2. `/api/v1/platform/admin/*`
3. all other `/api/*`

## Canonical API Ports

- `admin-api`: `127.0.0.1:3100`
- `money-api`: `127.0.0.1:3000`
- `connect-api`: `127.0.0.1:3002`

## Validation Requirements

- Delegated auth/platform-admin routes on money/connect MUST resolve to
  `admin-api` only.
- Lane-local API routes MUST resolve to the lane API only (`money-api` for
  money, `connect-api` for connect, `admin-api` for admin).
- Any route-policy deviation requires constitution amendment before rollout.
