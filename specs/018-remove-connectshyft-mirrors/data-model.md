# Data Model: Slice 10c - Final ConnectShyft Mirror Module Tree Removal

## Mirror Tree

- `path`: absolute repository path for the stale module tree under review
- `laneClassification`: inventory lane value for the tree
- `actualRuntimeAuthority`: current posture such as `unmounted_in_moneyshyft` or `unmounted_in_admin`
- `intendedAuthority`: canonical owner expected after cleanup
- `duplicationState`: current inventory duplication state
- `recommendation`: current inventory recommendation
- `anchorCount`: number of remaining live anchors
- `finalOutcome`: `deleted` or `blocked`
- `finalReason`: proof-backed explanation of the final outcome

Validation rules:

- A `Mirror Tree` can move to `deleted` only when its anchor set is empty.
- A `Mirror Tree` with `finalOutcome = blocked` must name the exact blocking file or files.

## Anchor File

- `path`: absolute repository path for the blocking file
- `anchorType`: `runtime_importer`, `route_registration`, `test_importer`, `test_mock`, or `test_discovery`
- `treePath`: mirror tree kept alive by the anchor
- `targetSymbol`: imported or mocked symbol when applicable
- `requiresMigration`: `true` when the anchor contains behavior that must be preserved
- `disposition`: `delete`, `rewrite`, `repoint`, or `retain_with_blocker`

Validation rules:

- Every live anchor must have exactly one `disposition`.
- An anchor with `requiresMigration = true` cannot be deleted until the replacement canonical coverage or dependency path exists.

## Dependency Edge

- `sourcePath`: blocking file
- `targetPath`: file or tree being kept alive
- `edgeKind`: `import`, `mock`, `router_mount`, or `jest_discovery`
- `status`: `open` or `resolved`
- `notes`: short explanation of why the edge matters

Validation rules:

- `router_mount` edges must be resolved before deleting any runtime-owned file they reach.
- `jest_discovery` edges matter only when the discovered file still imports or mocks the mirror tree.

## Coverage Migration

- `sourceTestPath`: top-level MoneyShyft or Admin test being reviewed
- `coveredBehavior`: exact behavior family asserted by that test
- `canonicalDestination`: canonical ConnectShyft test file that should own the behavior
- `migrationNeed`: `none`, `partial`, or `full`
- `finalDisposition`: `deleted_as_mirror_only` or `migrated_then_deleted`

Validation rules:

- `canonicalDestination` is required when `migrationNeed` is `partial` or `full`.
- `finalDisposition = migrated_then_deleted` requires explicit proof that the behavior exists under canonical ConnectShyft ownership.

Observed Slice 10c result:

- `apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`: `migrationNeed = partial`, `canonicalDestination = apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `finalDisposition = migrated_then_deleted`
- `apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`: `migrationNeed = none`, `canonicalDestination = apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, `finalDisposition = deleted_as_mirror_only`
- `apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`: `migrationNeed = none`, `canonicalDestination = apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`, `finalDisposition = deleted_as_mirror_only`
- `apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`: `migrationNeed = none`, `canonicalDestination = apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`, `finalDisposition = deleted_as_mirror_only`

## Inventory Mutation

- `path`: exact inventory row path
- `previousState`: prior duplication and recommendation posture
- `nextState`: final post-slice posture
- `notesUpdate`: concise proof note describing deletion or blockage

State transitions:

- `transitional` plus remaining anchors removed -> deleted or safe-delete final posture with slice note
- `transitional` plus unresolved anchor -> remains open with exact blocker note
- broad mirror-tree row plus tree deleted -> notes updated to reflect final deletion and prior anchor removal proof
