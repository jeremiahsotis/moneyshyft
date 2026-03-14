# Contract: CS-001 Route Convergence

## Valid ConnectShyft Route Owner

Only `apps/connectshyft-web/src/router/index.ts` may define `/app/connectshyft/*` routes.

## Required Route Set in connectshyft-web

- `/app/connectshyft/inbox`
- `/app/connectshyft/mine`
- `/app/connectshyft/more`
- `/app/connectshyft/settings`
- `/app/connectshyft/threads/:threadId`
- `/app/connectshyft/settings/availability`
- `/app/connectshyft/settings/numbers`
- `/app/connectshyft/settings/escalation`
- `/app/connectshyft/neighbors/new`
- `/app/connectshyft/neighbors/:neighborId`
- `/app/connectshyft/directory` (if directory workflow retained)

## Required Removals in moneyshyft-web

Remove all ConnectShyft route registrations from `apps/moneyshyft-web/src/router/index.ts`, specifically `/app/connectshyft/*` entries.

## Validation

- `rg "path:\s*'/app/connectshyft" apps/moneyshyft-web/src/router/index.ts` returns no matches.
- `rg "path:\s*'/app/connectshyft" apps/connectshyft-web/src/router/index.ts` returns canonical route list.

