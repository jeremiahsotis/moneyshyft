# Research: Slice 10c - Final ConnectShyft Mirror Module Tree Removal

## Decision: Treat the four named top-level identity tests as the only live MoneyShyft/Admin test anchors that still matter

- **Decision**: Use the four top-level identity tests as the primary test-anchor set for mirror-tree deletion proof.
- **Rationale**:
  - Current importer scans show MoneyShyft’s mirror tree is referenced only by:
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - Current importer scans show Admin’s identity-test anchors are:
    - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
  - The module-tree test directories under the mirror trees are not the decisive remaining blockers for this slice.
- **Alternatives considered**:
  - Treat the entire mirror-tree test directories as the remaining blocker surface: rejected because the closure audit already narrowed the active anchors to the top-level tests and the Admin console chain.
  - Delete the trees and repair any broken tests afterward: rejected because the slice requires explicit dependency proof before deletion.

## Decision: Treat the Admin platform-admin-console chain as the only runtime-critical blocker for the Admin mirror tree

- **Decision**: Model the Admin runtime blocker as a single chain:
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/api/registerRoutes.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft/numberMappings.ts`
- **Rationale**:
  - Repo scans show `platform-admin-console.ts` is the live Admin runtime file that imports the mirror tree.
  - Its route test remains a direct test anchor because it mocks the same mirror `numberMappings` dependency.
  - MoneyShyft has no equivalent runtime chain for its mirror tree.
- **Alternatives considered**:
  - Treat the Admin mirror tree as test-only: rejected because `platform-admin-console.ts` is a live runtime route under the mounted admin platform surface.
  - Treat all Admin mirror files as equally active blockers: rejected because the real runtime dependency narrows to `numberMappings` through the console route.

## Decision: Preserve only the residual identity coverage that is missing from canonical ConnectShyft tests

- **Decision**: Compare the four top-level identity tests against canonical ConnectShyft coverage and migrate only the missing assertions.
- **Rationale**:
  - Canonical ConnectShyft already covers core identity outcomes in:
    - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/__tests__/identityBoundary.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
  - Canonical tests already cover ambiguous matching, shared-contact refusal, unverified-input refusal, and route-level ambiguous/no-auto-merge behavior.
  - The one proven gap in current canonical coverage is the sync-service failure when wired to an async-only boundary adapter, which still exists only in the Money/Admin top-level dedupe tests.
- **Alternatives considered**:
  - Port the four top-level tests wholesale into `apps/connectshyft-api`: rejected because that preserves mirror-shaped coverage instead of migrating only the legitimate behavior.
  - Delete the top-level tests without comparison: rejected because it would drop at least one still-useful safety assertion.

## Decision: Do not solve the Admin runtime blocker with another local mirror or direct app-to-app source import

- **Decision**: The Admin number-mapping dependency must move to a canonical non-mirror boundary rather than to another Admin-local copy or a raw source import from `apps/connectshyft-api`.
- **Rationale**:
  - `admin-api` builds with `rootDir: ./src`, while `connectshyft-api` uses a widened `rootDir: ../../`.
  - A raw source import from `apps/admin-api` into `apps/connectshyft-api/src/...` is not a clean bounded fix under the current build layout.
  - Preserving a copied Admin-local helper would keep the underlying mirror problem alive even if it moved out of `src/modules/connectshyft`.
- **Alternatives considered**:
  - Keep a small Admin-local copy outside the mirror tree: rejected because it preserves stale non-canonical ownership.
  - Directly import `apps/connectshyft-api/src/modules/connectshyft/numberMappings.ts` into `admin-api`: rejected as an unstable build-boundary shortcut.

## Decision: Delete test anchors before tree deletion, and resolve the Admin runtime edge before deleting the Admin tree

- **Decision**: Use this deletion order:
  1. confirm importer map
  2. migrate any missing canonical identity assertions
  3. delete the four top-level identity tests
  4. remediate the Admin console `numberMappings` dependency
  5. update the console route test
  6. delete the MoneyShyft mirror tree
  7. delete the Admin mirror tree
  8. update `architecture/LANE_INVENTORY.md`
- **Rationale**:
  - The MoneyShyft tree has only top-level test anchors, so it becomes deletable as soon as those tests are handled.
  - The Admin tree remains blocked even after the top-level tests are removed until the Admin console route no longer imports mirror `numberMappings`.
  - This order prevents mid-slice breakage of either runtime or test import paths.
- **Alternatives considered**:
  - Delete the tree first, then fix the broken anchors: rejected because the slice requires explicit dependency clearance before deletion.
  - Resolve the Admin runtime edge first and defer identity coverage migration: rejected because the top-level identity tests are the smallest remaining blockers and should be closed first.

## Decision: Inventory updates are part of completion proof, not a trailing documentation step

- **Decision**: Update `architecture/LANE_INVENTORY.md` in the same slice that removes or proves blockage of these trees.
- **Rationale**:
  - The current inventory still labels both mirror trees as transitional residue with named anchors.
  - If the inventory is not updated in the same slice, the repo will still advertise unresolved mirror-tree convergence work after the cleanup.
- **Alternatives considered**:
  - Leave inventory updates for a later cleanup pass: rejected because the user explicitly required the inventory to reflect final deletion status.
