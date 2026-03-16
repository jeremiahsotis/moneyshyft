# Slice 10b Research: Final MoneyShyft Mirror Detachment

## Decision: Treat test-mounted route mirrors as first-class blockers

- Decision: Any MoneyShyft test that imports and mounts `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` blocks deletion of that route exactly as a live route registration would.
- Rationale: `connectshyft.provider-registry.test.shared.ts`, `connectshyft.neighbors.test.ts`, and `connectshyft.identity-match.test.ts` each mount the retained MoneyShyft route mirror directly, so deleting the route before closing those tests would break real in-repo dependencies.
- Alternatives considered:
  - ignore test-only mounts because the route is unmounted live: rejected because the user explicitly required explicit proof rather than “looks unused”
  - delete the route and repair tests afterward: rejected because that would delete the provider before its known dependents are cleared

## Decision: Treat `platform-contracts.ts` as a blocker for `auth.ts`

- Decision: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts` must be handled before deleting `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`.
- Rationale: the file currently constructs `authRoutePath` pointing at the MoneyShyft auth mirror and uses that path as contract evidence, so the blocker is real even though it is not an import.
- Alternatives considered:
  - treat only imports as blockers: rejected because the slice requires every direct and indirect dependency, not just imports
  - leave the path probe stale after deletion: rejected because that would leave contract evidence inconsistent with the repo

## Decision: Close the `auth.ts` track before the larger ConnectShyft and service chain

- Decision: Detach `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` first.
- Rationale: its blocker graph is smaller and independent from the larger `connectshyft.ts` and `PlatformAdminService.ts` chain. Closing it first reduces the open mirror set without forcing work on the ConnectShyft test family.
- Alternatives considered:
  - leave `auth.ts` until the end: rejected because it can be closed earlier with less risk and gives an immediate proof-backed deletion
  - combine `auth.ts` closure with broader admin route redesign: rejected because the slice excludes redesign

## Decision: Delete `platform-admin-console.ts` before the MoneyShyft service mirror

- Decision: Remove `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` as soon as scans confirm it has no hidden importer.
- Rationale: inventory already identifies it as an unmounted stale admin mirror whose only confirmed function in this slice is to keep `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts` alive.
- Alternatives considered:
  - keep the file until the service deletion step: rejected because it adds no protection once no importer exists
  - widen into admin route cleanup generally: rejected because the slice is file-bounded

## Decision: Review the provider-registry helper chain as a unit of dependency, not a unit of deletion

- Decision: Individually review the five provider-registry tests that import `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`, but treat the helper chain as one dependency cluster for ordering.
- Rationale: the shared helper imports both the MoneyShyft route mirror and the MoneyShyft service mirror, so every dependent test indirectly blocks both mirror deletions.
- Alternatives considered:
  - delete the shared helper first and then inspect broken tests: rejected because that destroys the evidence chain before decisions are made
  - keep the helper as parity history: rejected because stale helper retention is not valid once all dependents are closed

## Decision: Move only still-legitimate assertions to canonical owners

- Decision: When a MoneyShyft mirror test still covers behavior that matters, move or recreate only those assertions under the canonical owner rather than porting whole files wholesale.
- Rationale: the goal is to delete stale MoneyShyft mirror coverage, not preserve mirror-shaped test structure under another lane.
- Alternatives considered:
  - copy whole MoneyShyft test files into canonical apps: rejected because that preserves stale structure instead of migrating the legitimate behavior checks
  - delete all mirror tests without comparison: rejected because some assertions may still be the only coverage for canonical behavior

## Decision: Service deletion must be last inside the ConnectShyft and platform-admin chain

- Decision: Delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts` only after:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` is removed
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` is removed
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts` is removed or repointed
  - the provider-registry helper chain is closed
  - the neighbors and identity-match mirror tests are removed or repointed
- Rationale: every confirmed direct importer of the service mirror sits inside that set.
- Alternatives considered:
  - replace the service mirror with a stub and delete routes later: rejected because it preserves a stale service artifact and weakens proof
  - delete the service once route files are gone, ignoring tests: rejected because the user requires exact direct and indirect proof

## Decision: Inventory updates are part of proof, not a follow-up task

- Decision: Each reviewed exact file must receive its final `LANE_INVENTORY.md` state in the same slice that deletes or retains it.
- Rationale: the current inventory already contains a broad `connectshyft*.test.ts` row that is too coarse, so file-specific proof would be lost without row-level updates.
- Alternatives considered:
  - update the inventory after implementation in a later slice: rejected because the user asked for exact reclassification steps tied to deletion safety
  - rely on the broad glob row: rejected because it does not distinguish which exact files were actually reviewed

## Implementation proof: auth mirror closure

- Decision: delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`.
- Rationale:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` no longer mounts the MoneyShyft auth router, so the last direct test import is gone.
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts` now points its `authRoutePath` probe at `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/auth.ts`, so the non-import contract anchor is gone.
- Alternatives considered:
  - repoint the MoneyShyft test to import the admin auth router directly: rejected because the canonical admin API already owns that runtime coverage
  - retain the stale MoneyShyft route for envelope parity history: rejected because the route is unmounted and now has no in-repo dependency

## Implementation proof: ConnectShyft mirror coverage migration

- Decision: move the MoneyShyft provider-registry, neighbors, and identity-match route coverage into `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/`.
- Rationale:
  - the moved files now mount the canonical ConnectShyft route owner instead of the unmounted MoneyShyft mirror
  - the moved files stub `evaluateActorTenantModuleEntitlement` through `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/platform/tenantModuleEntitlements.ts`, which matches the canonical route wiring
  - after the move, repo scans showed no remaining MoneyShyft test/helper importer for `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- Alternatives considered:
  - keep the tests in MoneyShyft and repoint them across app boundaries: rejected because the slice goal is to remove MoneyShyft mirror coverage, not preserve it in place
  - delete the tests outright: rejected because these files still exercise canonical ConnectShyft route behavior

## Implementation proof: prune stale or redundant route-test migrations

- Decision: retain only `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` as the canonical survivors from the MoneyShyft route-test cluster.
- Rationale:
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts` proved stale after migration because the canonical route no longer forwards `prefersTexting` create/update fields the way the MoneyShyft mirror did
  - the webhook correlation, refusal, and replay route tests duplicate logic already covered by `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/numberMappings.test.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`
  - the surviving canonical provider-registry wrapper still preserves the route-level dispatch and guardrail assertions that passed after migration
- Alternatives considered:
  - keep all moved route tests and widen the slice into DB-backed provider-correlation harness work: rejected because that would exceed the file-bounded detachment slice
  - keep the stale neighbors assertions under the canonical owner: rejected because the user required elimination of mirror-only coverage that no longer reflects canonical runtime behavior

## Implementation proof: stale admin service mirror deletion

- Decision: delete `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`.
- Rationale:
  - repo scans reduced the MoneyShyft service mirror graph to the stale MoneyShyft route mirror and the duplicate MoneyShyft service test
  - `diff -q` showed `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts` is identical to `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts`, so no unique canonical coverage would be lost
  - after deleting `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, the remaining service mirror importer chain closed completely once the moved ConnectShyft tests and duplicate MoneyShyft service test were gone
- Alternatives considered:
  - preserve the MoneyShyft service mirror as a local entitlement shim: rejected because the canonical ConnectShyft tests now target the shared entitlement primitive and admin remains the full runtime owner
  - keep the duplicate MoneyShyft service test for lane-local confidence: rejected because it no longer covers any MoneyShyft runtime and duplicates canonical admin coverage byte-for-byte
