# Feature Specification: Final ConnectShyft Mirror Module Tree Removal

**Feature Branch**: `018-remove-connectshyft-mirrors`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Using the context and planning information from the questions I just asked you... Create a spec for Slice 10c: final ConnectShyft mirror module tree removal. Context All lane convergence remediation work is complete except for two stale mirror module trees that still exist under: - apps/moneyshyft-api/src/modules/connectshyft - apps/admin-api/src/modules/connectshyft These trees contain stale ConnectShyft mirrors and test anchors that no longer represent canonical runtime ownership. Canonical runtime ownership is already correct: - ConnectShyft runtime: apps/connectshyft-api - Admin runtime: apps/admin-api - MoneyShyft runtime: apps/moneyshyft-api The remaining module mirror trees must be removed. Remaining anchors identified by the closure audit: - connectshyft.identity-dedupe.test.ts - connectshyft.identity-boundary.test.ts - platform-admin-console.ts - platform-admin-console.test.ts These files are the final anchors keeping the stale module mirrors alive. Goal Completely eliminate the following mirror trees: apps/moneyshyft-api/src/modules/connectshyft apps/admin-api/src/modules/connectshyft including their tests and any anchors that keep them alive. Requirements The implementation must: 1. Trace every importer and dependency that references these module trees. 2. Move any legitimate remaining coverage to the canonical ConnectShyft implementation if needed. 3. Remove stale or mirror-only tests that do not represent canonical runtime behavior. 4. Delete the module mirror trees entirely once dependencies are removed. 5. Update LANE_INVENTORY.md to reflect the final deletion status. Strict constraints - No RouteShyft work. - No migration-runner work. - No new convergence audits. - No broad repository cleanup. - No feature work. - Do not stop until the mirror trees are either deleted or proven impossible to delete with explicit evidence. Expected output The spec must include: - scope - explicit target paths - importer tracing requirements - deletion criteria - inventory updates - verification steps - stop boundary"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove the Final Mirror Trees (Priority: P1)

As a platform maintainer, I need the last stale ConnectShyft mirror trees removed from MoneyShyft and Admin so repository ownership matches canonical runtime ownership.

**Why this priority**: This is the main deliverable of the slice. If the trees remain, lane convergence is still visibly incomplete.

**Independent Test**: Can be fully tested by removing all live importer anchors, deleting both mirror trees, and confirming the repository still supports canonical ConnectShyft, Admin, and MoneyShyft behavior.

**Acceptance Scenarios**:

1. **Given** stale ConnectShyft mirror trees still exist under MoneyShyft and Admin, **When** all live importers and anchors are removed or redirected appropriately, **Then** both mirror trees are deleted entirely.
2. **Given** a mirror tree can only be removed after a legitimate dependency is relocated, **When** that dependency is moved to canonical ConnectShyft ownership, **Then** the mirror tree is deleted without leaving a local substitute behind.

---

### User Story 2 - Preserve Legitimate Coverage and Runtime Behavior (Priority: P2)

As a maintainer, I need any still-valid coverage or runtime behavior preserved in canonical ownership so mirror removal does not reduce real protection or break admin capabilities.

**Why this priority**: Deleting stale mirrors is only acceptable if the remaining legitimate behavior is preserved in the correct owner.

**Independent Test**: Can be fully tested by confirming that valid identity-boundary and identity-dedupe coverage lives under canonical ConnectShyft ownership and that Admin platform console behavior still works without importing the Admin mirror tree.

**Acceptance Scenarios**:

1. **Given** a MoneyShyft or Admin test still covers valid canonical ConnectShyft behavior, **When** the slice completes, **Then** that coverage exists under canonical ConnectShyft ownership or is otherwise preserved without the mirror tree.
2. **Given** Admin still needs ConnectShyft number-mapping behavior for platform administration, **When** the slice completes, **Then** Admin uses a canonical non-mirror dependency path and the mirror tree is no longer required.

---

### User Story 3 - Close the Inventory Record (Priority: P3)

As a maintainer, I need the lane inventory updated to reflect final mirror-tree deletion status so the repository no longer advertises stale convergence work after the trees are removed.

**Why this priority**: Repository cleanup is not complete until the inventory reflects the new state.

**Independent Test**: Can be fully tested by reconciling the relevant inventory entries with the post-removal repository state and confirming the inventory no longer indicates these trees as remaining mirror work.

**Acceptance Scenarios**:

1. **Given** the mirror trees and their anchors are removed, **When** the inventory is updated, **Then** the relevant rows reflect final deletion status rather than a pending or ambiguous state.
2. **Given** the slice cannot fully delete a mirror tree, **When** the work stops, **Then** the inventory-oriented outcome explicitly states what prevented deletion and why the slice could not close the item.

### Edge Cases

- A file named in prior audit output no longer exists and must be treated as a stale reference rather than a live dependency.
- A top-level test in Admin or MoneyShyft contains one unique assertion that is not yet covered in canonical ConnectShyft tests.
- A route test keeps a mirror dependency alive only through mocking, even though the runtime import path has changed.
- Admin still needs a ConnectShyft capability, but the current dependency path points at a mirror-only module tree.
- A mirror tree can be deleted structurally, but an inventory row would remain misleading unless it is updated in the same slice.
- A claimed blocker turns out to be out of scope because it belongs to RouteShyft, migration-runner work, or unrelated broad cleanup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The slice MUST treat `apps/connectshyft-api` as canonical ConnectShyft runtime ownership, `apps/admin-api` as canonical Admin runtime ownership, and `apps/moneyshyft-api` as canonical MoneyShyft runtime ownership.
- **FR-002**: The slice MUST trace every direct and transitive importer, test anchor, route anchor, registration anchor, and discovery anchor that keeps `apps/moneyshyft-api/src/modules/connectshyft` or `apps/admin-api/src/modules/connectshyft` alive.
- **FR-003**: The importer trace MUST include the remaining anchor files named in context and any configuration or registration files that make them reachable.
- **FR-004**: The slice MUST distinguish mirror-only coverage from legitimate canonical coverage and retain only the coverage that still protects canonical ConnectShyft behavior.
- **FR-005**: Any legitimate identity-boundary or identity-dedupe coverage that still matters after mirror removal MUST be moved or consolidated under canonical ConnectShyft ownership before related mirror anchors are deleted, and the slice MUST migrate only the missing canonical assertions rather than porting the top-level mirror tests wholesale.
- **FR-006**: Mirror-only tests in MoneyShyft or Admin that do not represent canonical runtime behavior MUST be removed rather than recreated locally, and the top-level MoneyShyft/Admin identity tests MUST be treated as stale-owner duplicates unless a specific assertion is proven missing from canonical ConnectShyft coverage.
- **FR-007**: Admin platform console behavior that still depends on ConnectShyft capabilities MUST stop depending on the Admin mirror tree before that tree is deleted.
- **FR-008**: The slice MUST delete `apps/moneyshyft-api/src/modules/connectshyft` in full once no remaining valid dependency requires it.
- **FR-009**: The slice MUST delete `apps/admin-api/src/modules/connectshyft` in full once no remaining valid dependency requires it.
- **FR-010**: The slice MUST update `architecture/LANE_INVENTORY.md` to reflect the final deletion status of these mirror trees and their related convergence residue.
- **FR-011**: If a mirror tree cannot be deleted, the slice MUST stop with explicit file-level evidence identifying the exact remaining blocker and why deletion is not yet possible.
- **FR-012**: The slice MUST not introduce new ConnectShyft, Admin, or MoneyShyft feature behavior beyond what is necessary to preserve existing canonical behavior during mirror removal.
- **FR-013**: The slice MUST not expand into RouteShyft work, migration-runner work, new convergence audits, broad repository cleanup, or unrelated refactors.

### Key Entities *(include if feature involves data)*

- **Mirror Module Tree**: A stale ConnectShyft module directory living under MoneyShyft or Admin that no longer represents canonical runtime ownership.
- **Anchor File**: A test, route, or supporting file whose imports or mocks keep a mirror module tree reachable.
- **Canonical Coverage**: Coverage that still validates real ConnectShyft behavior and therefore must exist under canonical ConnectShyft ownership after mirror removal.
- **Deletion Blocker**: A specific remaining dependency with explicit evidence showing why a mirror tree cannot yet be deleted.
- **Inventory Status Record**: The lane inventory entry or entries that must reflect the post-removal state of the mirror trees.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of live importers and anchors that keep the two mirror trees reachable are identified and dispositioned as removed, redirected, or explicit blockers.
- **SC-002**: Both target mirror trees are deleted entirely, or an explicit evidence-backed blocker list is produced for every undeleted path.
- **SC-003**: 100% of legitimate remaining identity-boundary and identity-dedupe coverage needed after cleanup exists under canonical ConnectShyft ownership rather than under MoneyShyft or Admin mirror ownership.
- **SC-004**: Admin platform console behavior continues to support the required ConnectShyft administrative outcomes after mirror removal.
- **SC-005**: `architecture/LANE_INVENTORY.md` reflects the final status of the removed or blocked mirror-tree residue by the end of the slice.
- **SC-006**: 0 RouteShyft tasks, migration-runner tasks, new feature tasks, or broad repository cleanup tasks are required to claim the slice deliverable complete.

## Scope

This slice covers:

- removal of the stale ConnectShyft mirror tree under MoneyShyft
- removal of the stale ConnectShyft mirror tree under Admin
- tracing of all importers and anchors that keep either tree alive
- relocation of any still-legitimate test coverage to canonical ConnectShyft ownership
- removal of stale or mirror-only tests in MoneyShyft and Admin
- remediation of Admin platform console dependencies that currently point at the Admin mirror tree
- creation or adoption of one bounded shared non-mirror dependency surface for Admin number-mapping access if required to remove the Admin mirror tree safely
- update of `architecture/LANE_INVENTORY.md` to reflect final mirror-tree deletion status
- explicit blocker reporting if deletion cannot be completed

## Explicit Target Paths

Primary deletion targets:

- `apps/moneyshyft-api/src/modules/connectshyft`
- `apps/admin-api/src/modules/connectshyft`

Known anchor paths that must be evaluated as part of deletion:

- `apps/moneyshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `apps/moneyshyft-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- `apps/admin-api/src/__tests__/connectshyft.identity-dedupe.test.ts`
- `apps/admin-api/src/__tests__/connectshyft.identity-boundary.test.ts`
- `apps/admin-api/src/routes/api/v1/platform-admin-console.ts`
- `apps/admin-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
- `apps/admin-api/src/routes/api/v1/platform-admin.ts`
- `apps/admin-api/src/api/registerRoutes.ts`
- `apps/moneyshyft-api/src/api/registerRoutes.ts`
- `apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts`
- `architecture/LANE_INVENTORY.md`

Canonical ownership targets that may receive retained coverage or dependency ownership:

- `apps/connectshyft-api/src/modules/connectshyft`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__`
- `libs/platform/src/connectshyftNumberMappings.ts`

Verification-only stale path note:

- `apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` must be treated as a verification check, not as a live target, because the slice must confirm whether it exists before relying on it as evidence.

## Importer Tracing Requirements

- The slice must produce a complete importer map for both mirror trees before deletion.
- The importer map must include direct imports, mocked imports, transitive route imports, route registration reachability, and test discovery reachability.
- The importer map must show which dependencies are runtime-critical, which are test-only, and which are stale references.
- The importer map must identify whether each anchor is removed, relocated to canonical ConnectShyft ownership, redirected to a non-mirror dependency path, or left as a blocker with explicit evidence.
- The importer trace must be specific enough that each deleted or blocked path can be justified file by file.

## Deletion Criteria

Both mirror trees may be considered fully removed only when all of the following are true:

- no live runtime dependency in Admin or MoneyShyft points at either mirror tree
- no top-level MoneyShyft or Admin test still imports the mirror tree for canonical behavior coverage
- any still-valid identity-boundary or identity-dedupe coverage has been preserved under canonical ConnectShyft ownership
- Admin platform console behavior no longer depends on the Admin mirror tree
- both mirror directories are deleted entirely, including their mirror-only tests
- repository verification shows no remaining importer path that requires the deleted trees
- `architecture/LANE_INVENTORY.md` reflects the final post-removal state

If any one of these conditions cannot be met, the slice must stop with explicit evidence rather than claiming deletion is complete.

## Inventory Updates

- The slice must update the relevant `architecture/LANE_INVENTORY.md` rows so they no longer imply that these stale mirror trees remain unresolved after successful deletion.
- If deletion is blocked, the inventory-facing outcome must describe the residue as blocked rather than silently leaving stale removal expectations in place.
- Inventory wording must reflect final repository state, not prior audit assumptions.

## Verification Steps

- Verify the importer trace covers every live path that references either mirror tree.
- Verify canonical ConnectShyft coverage still protects the retained identity-boundary and identity-dedupe behavior after cleanup.
- Verify Admin platform console behavior still supports the required ConnectShyft administrative outcomes after dependency remediation.
- Verify MoneyShyft does not gain or retain local ConnectShyft runtime ownership while the mirror tree is removed.
- Verify both mirror trees are absent from the repository after successful deletion, or that any remaining path is called out explicitly as blocked.
- Verify `architecture/LANE_INVENTORY.md` matches the final post-slice state.

## Non-Goals

This slice does not include:

- RouteShyft work
- migration-runner work
- new convergence audits
- broad repository cleanup
- feature work
- redesign of canonical runtime ownership
- unrelated refactors outside what is required to remove the mirror trees safely

## Stop Boundary

Stop after the slice has:

- traced the remaining importer and anchor set
- preserved any legitimate canonical coverage under ConnectShyft ownership
- removed stale or mirror-only Admin and MoneyShyft test anchors
- removed or remediated Admin platform console dependencies that keep the Admin mirror tree alive
- deleted both mirror trees or produced explicit blocker evidence
- updated `architecture/LANE_INVENTORY.md` to match the result

Do not continue into:

- RouteShyft cleanup
- migration-runner work
- new audit work beyond what is required to justify mirror-tree deletion
- broad repo hygiene work
- unrelated feature or platform changes

## Assumptions

- Canonical runtime ownership is already correct and this slice exists only to eliminate stale mirror residue.
- The remaining live anchors are concentrated in the top-level identity tests and Admin platform admin console area rather than throughout broader runtime code.
- MoneyShyft does not need to retain any local ConnectShyft runtime module ownership after this slice.
- The top-level MoneyShyft and Admin identity tests are stale-owner duplicates of canonical ConnectShyft behavior and must not be recreated under those apps.
- The only expected residual canonical migration is a service-level assertion proving the synchronous neighbor service refuses an async-only identity boundary adapter unless implementation-time evidence shows another specific missing canonical assertion.
- If deletion proves impossible, the blocking evidence will be narrow and file-specific rather than requiring a new convergence audit.
