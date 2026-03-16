# Feature Specification: Slice 10 - Delete Stale API Mirror Files After File-Level Reclassification

**Feature Branch**: `015-delete-api-mirrors`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create a spec for Slice 10: delete stale API mirror files after file-level reclassification. Context: Main lane convergence remediation is merged. Slice 9 broke dependency anchors but intentionally stopped before stale mirror deletion. Current evidence from LANE_INVENTORY.md and the Slice 9 reviewed-anchor ledger in research.md shows: Individually provable as safe_delete_after_convergence: - apps/moneyshyft-api/src/services/PlatformAdminService.ts - apps/connectshyft-api/src/services/PlatformAdminService.ts Associated test files may have the same practical posture, but they must still be verified individually before deletion: - apps/moneyshyft-api/src/routes/api/v1/tests/connectshyft.provider-registry.test.shared.ts - apps/moneyshyft-api/src/routes/api/v1/tests/connectshyft.neighbors.test.ts - apps/moneyshyft-api/src/routes/api/v1/tests/connectshyft.identity-match.test.ts - apps/moneyshyft-api/src/services/tests/PlatformAdminService.test.ts - apps/connectshyft-api/src/services/tests/PlatformAdminService.test.ts Still converge_first and NOT deletion targets in this slice: - apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts - apps/moneyshyft-api/src/routes/api/v1/auth.ts Also not yet individually provable file-by-file: - directory/glob-level mirror trees such as apps/admin-api/src/modules/connectshyft - directory/glob-level mirror trees such as apps/moneyshyft-api/src/modules/connectshyft Requirements: - delete only individually proven stale mirror files that are safe_delete_after_convergence - verify associated tests are individually safe before deletion - update LANE_INVENTORY.md with file-level classifications where supported - do not delete converge_first items - do not delete directory/glob-level mirrors without file-level proof - do not touch RouteShyft transitional keepers - do not combine with migration-runner cutover Stop boundary for this slice: - only individually proven safe_delete_after_convergence files are removed - inventory is updated to reflect exact file-level status - converge_first items remain in place and explicitly deferred - affected apps build and tests pass Please generate a spec.md that includes: - scope - non-goals - deletion safety criteria - acceptance criteria - verification requirements - explicit stop boundary - risks - explicit deferral of the remaining converge_first route files"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Individually Proven Service Mirrors (Priority: P1)

As a maintainer, I need the individually proven stale API service mirror files removed so the repository no longer carries file-level stale mirrors that Slice 9 already proved are safe to delete after convergence.

**Why this priority**: These are the only API mirror files currently supported by explicit file-level evidence as safe cleanup candidates, so deleting them delivers immediate cleanup value without widening the slice.

**Independent Test**: Can be fully tested by deleting the individually proven service mirror files, proving no live runtime or required test still depends on them, and confirming the affected applications still build and pass the targeted verification suite.

**Acceptance Scenarios**:

1. **Given** `apps/moneyshyft-api/src/services/PlatformAdminService.ts` is classified as `safe_delete_after_convergence`, **When** Slice 10 is implemented, **Then** the file is removed only if imports, test usage, and inventory evidence still prove it is stale and non-runtime.
2. **Given** `apps/connectshyft-api/src/services/PlatformAdminService.ts` is classified as `safe_delete_after_convergence`, **When** Slice 10 is implemented, **Then** the file is removed only if imports, test usage, and inventory evidence still prove it is stale and non-runtime.

---

### User Story 2 - Verify and Remove Associated Stale Test Files Individually (Priority: P2)

As a maintainer, I need associated stale mirror test files reviewed one by one so only individually proven stale tests are removed and any still-needed test coverage stays intact.

**Why this priority**: The associated tests may have the same practical posture as the stale service mirrors, but the repository evidence does not yet justify deleting them as a group.

**Independent Test**: Can be fully tested by reviewing each listed test file separately, deleting only those proven stale, and confirming the remaining affected test suites still pass without coverage gaps caused by accidental deletion.

**Acceptance Scenarios**:

1. **Given** a candidate stale mirror test file has no remaining live, mounted, or required ownership-check role, **When** Slice 10 is implemented, **Then** that test file may be removed and its inventory status updated.
2. **Given** a candidate stale mirror test file is still needed for ownership, parity, or safety proof, **When** Slice 10 is implemented, **Then** that test file remains in place and is explicitly documented as deferred.

---

### User Story 3 - Record Exact File-Level Status and Deferrals (Priority: P3)

As a maintainer, I need the inventory and slice records updated to show exactly which files were deleted, which were deferred, and which remain `converge_first`, so the next cleanup slice starts from accurate file-level proof.

**Why this priority**: Cleanup is only safe if the inventory reflects exact per-file status rather than tree-level assumptions.

**Independent Test**: Can be fully tested by reviewing the updated inventory and slice evidence and confirming that deleted files, deferred files, and explicitly retained `converge_first` files are each recorded with exact file-level status.

**Acceptance Scenarios**:

1. **Given** a file is deleted in Slice 10, **When** the inventory is updated, **Then** that file’s row records the final deleted stale status and no broader directory is implicitly reclassified.
2. **Given** `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` remain `converge_first`, **When** Slice 10 is complete, **Then** both files remain in place and are explicitly documented as deferred non-deletion targets.

### Edge Cases

- What happens if a supposedly stale file is still referenced through a barrel export, re-export, dynamic lookup, or test harness indirection?
- What happens if one associated test file is provably stale but another still serves an ownership or regression-proof role?
- How are `/api/v1/auth/*` and `/api/v1/platform/admin/*` routed when this feature is enabled for each lane?
- How does the system behave if a lane API attempts unauthorized cross-lane access outside defined contracts?
- What happens if a directory-level mirror tree appears stale overall but lacks file-by-file proof for some members?
- What happens if deleting a stale mirror file causes a build or targeted test regression in an affected app?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST delete only API mirror files that have current file-level proof of `safe_delete_after_convergence`.
- **FR-002**: The system MUST treat `apps/connectshyft-api/src/services/PlatformAdminService.ts` as the only currently pre-approved service-file deletion candidate at slice start, and MUST re-verify whether `apps/moneyshyft-api/src/services/PlatformAdminService.ts` is blocked by any remaining in-repo importers before deletion.
- **FR-003**: The system MUST review each associated stale mirror test file individually before deletion and MUST NOT delete those files as a group.
- **FR-004**: The system MUST preserve any associated test file that still provides required ownership, parity, or regression coverage.
- **FR-005**: The system MUST update `architecture/LANE_INVENTORY.md` with exact file-level classifications and outcomes for every file reviewed in this slice where file-level evidence is available.
- **FR-006**: The system MUST explicitly defer `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` as `converge_first` items and MUST NOT delete them in this slice.
- **FR-007**: The system MUST NOT delete directory-level or glob-level mirror trees such as `apps/admin-api/src/modules/connectshyft` or `apps/moneyshyft-api/src/modules/connectshyft` unless each affected file is individually proven safe.
- **FR-008**: The system MUST preserve RouteShyft transitional keepers and MUST NOT combine this slice with migration-runner production cutover work.
- **FR-009**: The system MUST verify that no deleted file is still router-mounted, imported, dynamically referenced, or required by remaining tests.
- **FR-010**: The system MUST preserve lane ownership boundaries for admin-owned auth and platform-admin routes and MUST NOT introduce new app-to-app feature imports while performing deletions.
- **FR-011**: The system MUST end the slice with a recorded final state for each reviewed file: deleted as stale, retained as still needed, or explicitly deferred with reason.
- **FR-012**: The system MUST preserve production topology constraints and shared-Postgres compatibility, or explicitly propose a constitution amendment.

### Deletion Safety Criteria

- A file is deletion-eligible only if current proof shows it is non-runtime, non-mounted, non-required by surviving tests, and not needed as a convergence blocker.
- A file is not deletion-eligible if any retained in-repo source file still imports it, even when that importer is currently unmounted.
- Associated test files require fresh file-level proof even if their parent tree or mirror family appears stale.
- File-level deletion proof MUST override broader tree-level assumptions; directory or glob evidence alone is not sufficient.
- If evidence becomes contradictory during implementation, the file remains in place and is recorded as deferred.
- RouteShyft transitional keepers, migration-runner surfaces, and `converge_first` route files are never deletion candidates in this slice.

### Key Entities *(include if feature involves data)*

- **Mirror File Candidate**: An individual API file reviewed for Slice 10 deletion, with attributes for current classification, runtime status, proof status, and final disposition.
- **Associated Test Candidate**: An individual test file tied to a stale mirror surface, with attributes for coverage role, remaining dependency proof, and deletion eligibility.
- **File-Level Inventory Row**: A per-file classification record showing lane, runtime authority, duplication state, recommendation, and final post-slice status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of files reviewed in Slice 10 end with an explicit file-level outcome of deleted, retained, or deferred with reason.
- **SC-002**: 100% of pre-approved stale service mirror files in scope are either removed or explicitly blocked by newly discovered evidence.
- **SC-003**: 100% of associated test files reviewed in scope are individually verified before deletion or retention; none are removed solely because they belong to a stale tree.
- **SC-004**: 0 `converge_first` route files named in this specification are deleted during Slice 10.
- **SC-005**: All affected application builds and targeted verification tests complete successfully after the file-level deletions performed in this slice.

## Scope

This slice covers:

- deletion of individually proven stale API mirror files with current `safe_delete_after_convergence` proof
- individual verification of associated stale mirror test files before any deletion decision
- file-level inventory and classification updates where supported by proof
- explicit deferral records for `converge_first` items that remain out of scope for deletion

## Non-Goals

This slice does not include:

- deleting `converge_first` route files
- deleting directory-level or glob-level mirror trees without file-by-file proof
- RouteShyft transitional cleanup or removal
- migration-runner production cutover
- broad repo cleanup
- feature redesign
- new shared-lib extraction work beyond already-established boundaries

## Acceptance Criteria

- Only files with current, individual `safe_delete_after_convergence` proof are deleted.
- Each associated stale mirror test file is reviewed separately and deleted only if file-level proof supports deletion.
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` remain present and explicitly deferred as `converge_first`.
- No directory-level or glob-level mirror tree is deleted based only on aggregate classification.
- RouteShyft transitional keepers and migration-runner cutover surfaces remain untouched.
- The reviewed file-level inventory matches the final deleted, retained, and deferred outcomes exactly.

## Verification Requirements

- Verify `apps/moneyshyft-api/src/services/PlatformAdminService.ts` and `apps/connectshyft-api/src/services/PlatformAdminService.ts` remain delete-safe at implementation time before removing them.
- Verify each associated test file individually using import, mount, and coverage checks before deleting or retaining it.
- Verify a helper test file imported by retained tests remains retained unless each dependent test is also individually reviewed in this slice.
- Verify no deleted file is still referenced through direct imports, re-exports, dynamic references, route registration, or surviving tests.
- Verify affected application builds still succeed after the approved deletions.
- Verify targeted affected tests still pass after the approved deletions.
- Verify `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` remain present and documented as deferred `converge_first` items.
- Verify RouteShyft transitional keepers, migration-runner surfaces, and unrelated mirror trees are unchanged.
- Verify no new app-to-app feature import or lane-boundary regression is introduced while removing stale files.

## Explicit Stop Boundary

This slice stops once:

- only individually proven `safe_delete_after_convergence` files reviewed in scope have been removed
- associated test files have each been either removed with proof or retained with explicit deferral
- `architecture/LANE_INVENTORY.md` reflects exact file-level post-slice status for the reviewed files
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `apps/moneyshyft-api/src/routes/api/v1/auth.ts` remain in place and explicitly deferred
- affected applications build and targeted tests pass

This slice does not continue into:

- deletion of directory-level mirror trees
- deletion of `converge_first` route files
- RouteShyft cleanup
- migration-runner production cutover

## Risks

- A supposedly stale file may still be referenced indirectly through test harnesses, re-exports, or ownership checks.
- Deleting stale mirror tests too aggressively may remove useful regression or ownership proof that still has value.
- File-level inventory may lag reality if deletions occur without precise reclassification updates.
- Tree-level assumptions may pressure the cleanup to widen beyond the individually proven files in scope.
- The two deferred `converge_first` route files may be mistaken for deletion-ready because they are unmounted, even though they still require convergence proof first.

## Assumptions

- The user-supplied associated test paths correspond to the repository’s current `__tests__` file locations and should be evaluated against those exact files at implementation time.
- Slice 9 evidence remains the current baseline for the two `PlatformAdminService.ts` service mirrors unless new contradictory evidence appears during Slice 10 verification.
- File-level inventory updates will be added where a reviewed file does not yet have its own explicit row, rather than inferring tree-level status.
