# Feature Specification: Slice 10b - Final MoneyShyft Route-and-Service Mirror Detachment and Removal

**Feature Branch**: `016-detach-moneyshyft-mirrors`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create a spec for Slice 10b: final MoneyShyft route-and-service mirror detachment and removal. Use LANE_INVENTORY.md as the ultimate authority. Critical current inventory facts: - apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts is transitional / converge_first, unmounted in MoneyShyft, retained in repo but no longer mounted live - apps/moneyshyft-api/src/routes/api/v1/auth.ts is transitional / converge_first, retained only because src/__tests__/apiEnvelopeContract.test.ts still imports it directly - apps/moneyshyft-api/src/services/PlatformAdminService.ts is transitional / converge_first because in-repo importers still include apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts and apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts - apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts is transitional / converge_first and still blocks service-file deletion - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts is retained because it still exercises the deferred MoneyShyft connectshyft.ts mirror and still imports the retained MoneyShyft service mirror - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts is retained for the same reason - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts is retained and not delete-safe until dependent tests are individually reviewed Canonical owners already exist: - apps/connectshyft-api/src/routes/api/v1/connectshyft.ts is canonical - apps/admin-api/src/routes/api/v1/auth.ts is canonical - admin-api is canonical for platform-admin ownership Primary goal: Dig deeply enough to detach every remaining test/import/helper/runtime dependency that is keeping the MoneyShyft transitional route and service mirrors alive, then remove those MoneyShyft mirrors safely. In scope: - apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts - apps/moneyshyft-api/src/routes/api/v1/auth.ts - apps/moneyshyft-api/src/services/PlatformAdminService.ts - apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts - apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts - apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts - any direct or indirect in-repo importers required to fully detach them - inventory reclassification updates required to prove deletion safety Out of scope: - RouteShyft - migration-runner production cutover - broad directory/glob cleanup outside the exact files and direct blockers above - feature redesign - blanket test cleanup across the repo Requirements: - identify every direct and indirect importer or test dependency keeping these files alive - move any remaining legitimate coverage to canonical owners if needed - eliminate MoneyShyft-only mirror coverage that no longer tests canonical runtime behavior - reclassify each exact file in LANE_INVENTORY.md when proof is complete - delete only after proof is explicit - stop only when these MoneyShyft transitional mirrors are either removed or individually justified as still transitional with exact blockers documented Please generate a spec.md that includes: - scope - non-goals - file-by-file proof requirements - reclassification requirements - acceptance criteria - verification requirements - explicit stop boundary - risks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove The Final MoneyShyft Mirror Routes And Service (Priority: P1)

As a lane maintainer, I need the final retained MoneyShyft route and service mirrors detached from every remaining repo dependency so those mirror files can be deleted without leaving hidden runtime, test, or contract anchors behind.

**Why this priority**: The slice only succeeds if the remaining transitional mirrors stop existing as active blockers. Everything else in scope supports that outcome.

**Independent Test**: Can be fully tested by proving each in-scope route and service mirror has no surviving direct or indirect repo dependency, deleting only the files that satisfy that proof, and confirming the canonical owners remain the only surviving authorities.

**Acceptance Scenarios**:

1. **Given** `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, `apps/moneyshyft-api/src/routes/api/v1/auth.ts`, `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, and `apps/moneyshyft-api/src/services/PlatformAdminService.ts` are still classified as `transitional` and `converge_first`, **When** every surviving direct and indirect blocker is detached, repointed, or removed with proof, **Then** those MoneyShyft mirrors may be deleted and no surviving repo dependency may still point to them.
2. **Given** one of those mirrors still has a surviving blocker after review, **When** Slice 10b stops, **Then** that file remains retained and `LANE_INVENTORY.md` records the exact blocker rather than implying deletion safety.

---

### User Story 2 - Preserve Only Legitimate Canonical Coverage (Priority: P2)

As a maintainer, I need any remaining useful behavior checks moved to the canonical lane owner, while MoneyShyft-only mirror coverage that no longer proves live behavior is removed.

**Why this priority**: Several retained MoneyShyft tests currently keep stale mirrors alive even though the live route owners already exist elsewhere.

**Independent Test**: Can be fully tested by reviewing each retained MoneyShyft test and helper individually, moving any still-needed assertions to the canonical owner where necessary, and deleting the MoneyShyft-only mirror coverage that no longer validates canonical runtime behavior.

**Acceptance Scenarios**:

1. **Given** a retained MoneyShyft test or helper only mounts deleted or unmounted MoneyShyft mirrors, **When** canonical coverage already exists or the behavior is no longer live, **Then** that MoneyShyft-only test asset is removed instead of preserved as stale parity coverage.
2. **Given** a retained MoneyShyft test still contains a behavior check that matters after mirror removal, **When** Slice 10b is completed, **Then** that check exists under the canonical owner before the MoneyShyft mirror test or helper is deleted.

---

### User Story 3 - Reclassify Exact Files With Proof (Priority: P3)

As a maintainer, I need `LANE_INVENTORY.md` updated file by file so the repository clearly shows which mirrors were deleted, which blocker files were reviewed, and which items remain transitional with exact reasons.

**Why this priority**: This slice is governed by file-level proof, not tree-level assumptions. The inventory has to show that exact state.

**Independent Test**: Can be fully tested by reviewing the updated inventory rows for every in-scope file and discovered blocker, and confirming each row matches the final repository state and proof outcome.

**Acceptance Scenarios**:

1. **Given** a reviewed file is deleted in Slice 10b, **When** the inventory is updated, **Then** that exact row reflects a deleted stale artifact with notes that state why deletion became safe.
2. **Given** a reviewed file remains in place at slice end, **When** the inventory is updated, **Then** that exact row retains a transitional posture only if the precise remaining blocker is named.

### Edge Cases

- A file is no longer mounted live but is still mounted inside retained tests, making it delete-unsafe until those tests are deleted or repointed.
- A helper file has no standalone value but remains delete-unsafe because retained dependent tests still import it.
- A non-import path check or contract probe still references a file path and must be treated as a blocker until it is repointed.
- Some assertions in a retained MoneyShyft test may still matter, while the rest of the file only covers stale mirror behavior.
- One in-scope mirror may become delete-safe while another remains transitional; the slice must stop at the exact blocked file instead of widening scope.
- A reviewed file may not yet have a sufficiently specific file-level inventory row, requiring a new exact row rather than relying on a broad glob row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use `architecture/LANE_INVENTORY.md` as the ultimate authority for starting classifications, while requiring current repo proof before any deletion is executed.
- **FR-002**: The system MUST identify every direct and indirect in-repo dependency that keeps each in-scope MoneyShyft mirror alive, including route mounts inside tests, shared helpers, service tests, and non-import file-path dependencies.
- **FR-003**: The system MUST delete `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, `apps/moneyshyft-api/src/routes/api/v1/auth.ts`, `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, and `apps/moneyshyft-api/src/services/PlatformAdminService.ts` only after explicit proof shows no retained dependency still requires them.
- **FR-004**: The system MUST review `apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`, `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`, `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` individually rather than by mirror family.
- **FR-005**: The system MUST review every newly discovered direct or indirect blocker file required to fully detach the in-scope mirrors, even if that blocker was not listed in the initial scope bullets.
- **FR-006**: The system MUST move any still-legitimate behavior coverage to the canonical owner before deleting a MoneyShyft mirror test or helper that currently carries that coverage.
- **FR-007**: The system MUST remove MoneyShyft-only mirror coverage that no longer validates canonical runtime behavior and MUST NOT preserve stale parity tests solely because they already exist.
- **FR-008**: The system MUST preserve canonical ownership boundaries: `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` remains the ConnectShyft route owner, `apps/admin-api/src/routes/api/v1/auth.ts` remains the auth owner, and admin-owned platform-admin behavior remains outside MoneyShyft.
- **FR-009**: The system MUST update exact file-level inventory rows for every reviewed file and every discovered blocker whose outcome is necessary to explain deletion safety or continued retention.
- **FR-010**: The system MUST NOT infer deletion safety from directory-level or glob-level classifications when file-level blocker evidence exists.
- **FR-011**: The system MUST stop at the first unresolved blocker for a given file and record that blocker explicitly rather than forcing deletion through broader cleanup.
- **FR-012**: The system MUST keep RouteShyft, migration-runner production cutover, feature redesign, and broad repo-wide test cleanup outside this slice.

### File-By-File Proof Requirements

- **apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts**
  Deletion proof requires direct-detachment proof for:
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`.
  Indirect-detachment proof also requires review of the provider-registry tests that currently import the shared helper:
  `connectshyft.provider-registry.dispatch-events.test.ts`,
  `connectshyft.provider-registry.guardrails.test.ts`,
  `connectshyft.provider-registry.webhook-correlation-resolution.test.ts`,
  `connectshyft.provider-registry.webhook-correlation-refusals.test.ts`, and
  `connectshyft.provider-registry.webhook-replay-signature.test.ts`.
  The wrapper entrypoint `connectshyft.provider-registry.test.ts` must also be reviewed because it keeps the focused provider-registry test family mounted as a command-compatible suite entry.
  Deletion is safe only after every surviving legitimate assertion is moved to the canonical ConnectShyft owner or the mirror-only coverage is removed.

- **apps/moneyshyft-api/src/routes/api/v1/auth.ts**
  Deletion proof requires direct-detachment proof for `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`.
  It also requires indirect-detachment proof for `apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`, which currently treats the MoneyShyft auth file path as contract evidence.
  Deletion is safe only after MoneyShyft no longer depends on that route for contract or envelope verification and the canonical admin auth owner carries any remaining legitimate coverage.

- **apps/moneyshyft-api/src/services/PlatformAdminService.ts**
  Deletion proof requires direct-detachment proof for:
  `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`,
  `apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`.
  Indirect-detachment proof also requires the provider-registry dependent tests named above because they keep the shared helper alive.
  Deletion is safe only after the surviving entitlement behavior is either owned by admin or shared entitlement surfaces, and no retained MoneyShyft route or test still imports the service mirror.

- **apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts**
  Deletion proof requires showing the file no longer provides unique coverage that is absent from the canonical admin-owned service tests or the shared entitlement owner.
  If any assertion remains needed, that assertion must be relocated before this MoneyShyft mirror test is deleted.

- **apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts**
  Deletion proof requires individual review of every dependent provider-registry test file listed above.
  The helper cannot be deleted while any retained MoneyShyft test still imports it.
  If provider-registry route coverage remains legitimate, it must run against the canonical ConnectShyft owner rather than the deleted MoneyShyft mirror.

- **apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts**
  Deletion proof requires showing that its remaining assertions do not need a MoneyShyft route or service mirror.
  Any still-valid neighbor behavior coverage must be moved to the canonical ConnectShyft owner before the file is deleted.

- **apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts**
  Deletion proof requires showing that its remaining assertions do not need a MoneyShyft route or service mirror.
  Any still-valid identity-match coverage must be moved to the canonical ConnectShyft owner before the file is deleted.

- **apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts**
  Deletion proof requires showing the file has no remaining MoneyShyft runtime or test role and no surviving in-repo importer.
  Because it directly imports the MoneyShyft `PlatformAdminService` mirror, this route mirror must be closed or removed before the service mirror can be deleted safely.

- **Discovered blocker files required for full detachment**
  The slice MUST explicitly review any exact file discovered during proof work that keeps the above targets alive, including:
  `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`,
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`, and
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`, and
  `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`.
  The slice may stop with any of these files retained, but only if their exact blocker role is recorded.

### Reclassification Requirements

- Every reviewed exact file MUST end the slice with an explicit `LANE_INVENTORY.md` row outcome that matches the final repository state.
- A deleted file row MUST no longer remain `transitional` or `converge_first`; it MUST reflect a deleted stale posture in the inventory fields and notes.
- A retained file may remain `transitional` and `converge_first` only if the notes name the exact remaining blocker or unresolved proof gap.
- If a reviewed blocker is currently represented only by a broad glob row, the inventory MUST gain a specific file-level row for that blocker before the slice is considered complete.
- Broad rows such as `connectshyft*.test.ts except route-ownership` MUST NOT be treated as sufficient proof when an exact file in that family is reviewed in this slice.
- Notes for each reviewed file MUST identify the canonical owner or the exact reason the file remains blocked.
- Reclassification MUST prove deletion safety for each exact file before deletion occurs; inventory updates are part of the proof, not an afterthought.

### Key Entities *(include if feature involves data)*

- **Mirror Target File**: An exact MoneyShyft route, service, or test asset currently classified as transitional and under review for final detachment or justified retention.
- **Blocker Dependency**: Any direct import, indirect helper chain, test-mounted route, or file-path contract reference that prevents a mirror target from being safely deleted.
- **Coverage Transfer Decision**: The explicit decision that a remaining assertion is either moved to the canonical owner or removed because it only validates stale MoneyShyft mirror behavior.
- **Inventory Evidence Row**: The file-level authority record in `LANE_INVENTORY.md` that must match the final post-slice state for each reviewed target or blocker.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the in-scope MoneyShyft mirror targets end the slice either deleted or individually justified as still transitional with an exact blocker named.
- **SC-002**: 0 deleted MoneyShyft mirror files have surviving direct imports, helper chains, or file-path contract references anywhere in the repository.
- **SC-003**: 100% of reviewed MoneyShyft mirror tests and helpers have an explicit outcome of deleted, retained with blocker, or transferred coverage under the canonical owner.
- **SC-004**: 100% of exact files reviewed in this slice have inventory rows whose status and notes match the final repository state.
- **SC-005**: 0 out-of-scope RouteShyft, migration-runner cutover, or broad tree-cleanup actions are required to complete the slice.

## Scope

This slice covers:

- final detachment review for `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- final detachment review for `apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- final detachment review for `apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- individual review of `apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
- individual review of `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
- individual review of `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- individual review of `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- final closure review for `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
- exact direct and indirect blocker files required to fully detach the targets above
- inventory reclassification work required to prove deletion safety or exact continued blockage

## Non-Goals

This slice does not include:

- RouteShyft cleanup or RouteShyft authority changes
- migration-runner production cutover
- broad directory or glob cleanup outside the exact files and direct blockers required here
- feature redesign
- blanket repo-wide test cleanup
- deletion of unrelated stale trees that are not needed to close these MoneyShyft mirrors

## Acceptance Criteria

- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, `apps/moneyshyft-api/src/routes/api/v1/auth.ts`, `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, and `apps/moneyshyft-api/src/services/PlatformAdminService.ts` are deleted only after their exact blocker chains are fully detached.
- `apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`, `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`, `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`, and `apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` are each removed, moved, or retained only after individual proof.
- The provider-registry dependent tests that import the shared helper are individually reviewed and either repointed, retained with blockers, or removed with proof.
- `apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` and `apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts` no longer keep the MoneyShyft `auth.ts` mirror alive before that mirror is deleted.
- Remaining legitimate ConnectShyft route behavior coverage runs against `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, not the deleted MoneyShyft mirror.
- Remaining legitimate auth and platform-admin behavior coverage runs against the canonical admin owner, not deleted MoneyShyft mirrors.
- `LANE_INVENTORY.md` exactly records the deleted, retained, and blocked outcomes for every reviewed file.

## Verification Requirements

- Run pre-delete repository reference scans for every in-scope file and every discovered blocker file.
- Prove that no MoneyShyft live route registration still mounts `connectshyft.ts`, `auth.ts`, or `platform-admin-console.ts`, and separately prove whether retained tests still mount them.
- Verify every retained or moved assertion that survives mirror deletion now executes through the canonical owner rather than a MoneyShyft mirror.
- Run post-delete repository reference scans confirming no surviving import, helper chain, or file-path contract reference targets a deleted mirror.
- Run the minimum sufficient verification matrix for the lanes touched by the detachment work:
  - `apps/moneyshyft-api` build plus `src/__tests__/apiEnvelopeContract.test.ts`, `src/routes/api/v1/__tests__/auth.refresh.test.ts`, `src/routes/api/v1/__tests__/platform-admin.test.ts`, `src/routes/api/v1/__tests__/platform-admin-console.test.ts`, and `src/routes/api/v1/__tests__/connectshyft.route-ownership.test.ts`
  - `apps/connectshyft-api` build plus every canonical provider-registry, neighbors, and identity-match test file that absorbed surviving assertions during this slice
  - `apps/admin-api` build plus `src/__tests__/apiEnvelopeContract.test.ts` and `src/services/__tests__/PlatformAdminService.test.ts` whenever auth or platform-admin assertions move there
- Validate unchanged routing and deployment invariants by checking host Nginx delegation, localhost-only API binding and canonical ports, shared Postgres connectivity assumptions, and reproducible runbook instructions after the mirror deletions.
- Verify `LANE_INVENTORY.md` rows for every reviewed file and blocker match the final repository state exactly.
- Verify no out-of-scope RouteShyft, migration-runner, or unrelated broad-cleanup changes were required.

## Explicit Stop Boundary

This slice stops once:

- every in-scope MoneyShyft mirror target is either deleted or individually justified as still transitional with an exact blocker
- every exact blocker file required to explain those outcomes has been reviewed and recorded
- any legitimate remaining coverage has been moved to the canonical owner before a MoneyShyft mirror test or helper is deleted
- `LANE_INVENTORY.md` reflects the final file-level status for each reviewed target and blocker
- the affected verification work proves deleted files are no longer referenced and retained files are explicitly blocked

This slice does not continue into:

- tree-wide mirror deletion outside the exact files and blockers above
- RouteShyft cleanup
- migration-runner production cutover
- generalized modernization or redesign of auth, platform-admin, or ConnectShyft behavior

## Risks

- A retained test harness or shared helper may hide an indirect dependency that is not obvious from the first import scan.
- A file-path contract check may continue to treat a deleted MoneyShyft file as required evidence even after direct imports are gone.
- Some MoneyShyft tests may contain a mix of stale mirror coverage and still-useful assertions, making cleanup easy to overshoot.
- Inventory drift would make later slices unsafe if exact file-level outcomes are not recorded as part of the same change.
- Pressure to clean broader mirror trees in the same pass could expand the slice beyond the proof the inventory currently supports.

## Assumptions

- The current `architecture/LANE_INVENTORY.md` rows quoted in the input remain the authoritative starting posture for this slice.
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` remains the canonical ConnectShyft route owner throughout this slice.
- `apps/admin-api/src/routes/api/v1/auth.ts` remains the canonical auth owner throughout this slice.
- Admin-owned platform-admin behavior remains canonical outside MoneyShyft throughout this slice.
- If a reviewed MoneyShyft mirror test contains any still-legitimate coverage, that coverage can be expressed under the canonical owner without redesigning the feature itself.
