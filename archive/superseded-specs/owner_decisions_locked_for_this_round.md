# Owner Decisions Locked For This Round

These decisions are already considered locked for the developer handoff.

## Locked now
- `admin-web` is the temporary shell host.
- `admin-api` is the temporary platform auth and platform-admin authority.
- host Nginx is the reverse proxy and static file server.
- host Postgres is the shared production database.
- APIs are containerized.
- frontends are static builds served by Nginx.
- production DB for admin, MoneyShyft, and ConnectShyft is shared.
- temporary production migration authority is `admin-api`.
- Money and Connect must delegate auth and platform-admin traffic to `admin-api`.
- canonical ports are `3100`, `3000`, and `3002`.
- canonical repo frontend paths use `admin-web`, `moneyshyft-web`, and `connectshyft-web` naming.

## Explicitly not being decided in this round
- permanent dedicated shell app extraction
- full domain rollout for People, Household, Address, Finance, etc.
- event bus rollout
- full shared UI package rollout
- full token governance rollout
