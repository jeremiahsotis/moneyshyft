# Contract: Routing Authority

## Purpose

Define the canonical route owners after lane convergence and the temporary allowances during phased cutover.

## Canonical API ownership

- `admin-api` owns:
  - `/api/v1/auth/*`
  - `/api/v1/platform/*`
  - `/api/v1/platform/admin/*`
- `moneyshyft-api` owns MoneyShyft finance/runtime routes only.
- `connectshyft-api` owns `/api/v1/connectshyft/*`.
- `migration-runner` owns no HTTP routes.

## Canonical web ownership

- `admin-web` owns `/admin/*`.
- `moneyshyft-web` owns MoneyShyft finance/runtime routes only.
- `connectshyft-web` owns `/app/connectshyft/*`.

## Transitional allowances

- `moneyshyft-web` may temporarily retain `/app/route/requests` because RouteShyft is transitional.
- `moneyshyft-api` may temporarily retain a thin compatibility shim for `/api/v1/connectshyft/*` only during route cutover, but it must not remain a feature owner.

## Prohibited end-state conditions

- `moneyshyft-api` mounted ownership of `/api/v1/connectshyft/*`
- `moneyshyft-api` mounted ownership of `/api/v1/auth/*` or `/api/v1/platform/admin/*`
- `moneyshyft-web` mounted ownership of `/admin/*`
- any lane app mounting another lane's canonical feature routes as live business logic

## Verification

- Host/proxy contracts must resolve:
  - Admin routes to `admin-api`
  - ConnectShyft routes to `connectshyft-api`
  - Money routes to `moneyshyft-api`
- Router definitions must not expose prohibited end-state conditions.
