# Lane Routing Contract

## In Scope

- `admin.shyftunity.com`
- `money.shyftunity.com`
- `connect.shyftunity.com`

## Route Ownership Rules

### Admin Lane

- Domain: `admin.shyftunity.com`
- Frontend owner: `admin-web`
- API rule: `/api/*` -> `admin-api`

### Money Lane

- Domain: `money.shyftunity.com`
- Frontend owner: `moneyshyft-web`
- API rules:
  - `/api/v1/auth/*` -> `admin-api`
  - `/api/v1/platform/admin/*` -> `admin-api`
  - other `/api/*` -> `money-api`

### Connect Lane

- Domain: `connect.shyftunity.com`
- Frontend owner: `connectshyft-web`
- API rules:
  - `/api/v1/auth/*` -> `admin-api`
  - `/api/v1/platform/admin/*` -> `admin-api`
  - other `/api/*` -> `connect-api`

## Canonical API Ports

- `admin-api`: `3100`
- `money-api`: `3000`
- `connect-api`: `3002`

## Validation Requirements

- Delegated auth/platform-admin routes on money/connect MUST resolve to
  `admin-api`.
- Lane-local API routes MUST resolve to the lane API.
- Any route-policy deviation requires constitution amendment before rollout.
