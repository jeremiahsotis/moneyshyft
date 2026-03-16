# Slice 10c Mirror Tree Removal Boundary Contract

## Purpose

Define the exact dependency, coverage, and deletion boundary for removing the last stale ConnectShyft module mirror trees from MoneyShyft and Admin without widening into unrelated cleanup.

## Canonical Owners That Must Remain

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`

## Mirror Tree Targets

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`

## Known Live Anchors

MoneyShyft anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`

Admin anchors:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`

Registration and discovery edges that make those anchors reachable:

- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/jest.config.js`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/jest.config.js`

## Allowed Mutations

- Move missing legitimate identity assertions into canonical ConnectShyft tests.
- Delete MoneyShyft and Admin top-level mirror tests once canonical coverage is sufficient.
- Repoint the Admin platform console off the Admin mirror tree through a canonical non-mirror dependency boundary.
- Update the Admin platform console route test to match the new non-mirror dependency boundary.
- Delete either mirror tree only after every open edge into it is resolved.
- Update `architecture/LANE_INVENTORY.md` to reflect the final state of the mirror-tree rows.

## Forbidden Mutations

- RouteShyft changes.
- migration-runner changes.
- broad stale cleanup outside the two mirror trees and their exact anchors.
- preserving a new Admin- or MoneyShyft-local ConnectShyft copy as a replacement mirror.
- claiming deletion safety without proving all import, mock, router-mount, and discovery edges are cleared.

## Deletion Preconditions

- All top-level identity-test anchors for the target tree are deleted or repointed off the tree.
- Any legitimate identity coverage previously owned only by those tests exists under canonical ConnectShyft ownership before deletion.
- For the Admin tree specifically, `platform-admin-console.ts` no longer imports mirror `numberMappings`.
- The Admin platform console route test no longer mocks the Admin mirror tree.
- Post-change importer scans show no remaining direct or indirect dependency on the target tree.

## Required Final States

- Both mirror trees are either deleted or blocked with explicit evidence.
- No remaining MoneyShyft file imports the MoneyShyft ConnectShyft mirror tree.
- No remaining Admin runtime or test file imports the Admin ConnectShyft mirror tree.
- Canonical ConnectShyft owns all surviving legitimate identity coverage.
- `architecture/LANE_INVENTORY.md` matches the final repository state.

## Stop Boundary

Stop if either mirror tree still has an unresolved dependency edge after the exact anchor set has been reviewed and remediated. Record the exact blocker in `architecture/LANE_INVENTORY.md` and do not widen the slice into unrelated cleanup.
