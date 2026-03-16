# Feature Specification: Slice 9 Cross-Lane Dependency Anchor Cleanup

**Feature Branch**: `014-break-dependency-anchors`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create a spec for Slice 9: break remaining cross-lane dependency anchors. Context: The main lane convergence remediation is merged, but stale mirror cleanup is still blocked by remaining live dependency anchors. Known blocker already identified: - connectshyft-api/src/services/** cannot be removed yet because live code still imports PlatformAdminService from there in connectshyft.ts This means some stale mirrored trees are still kept alive by real imports, even though canonical lane ownership is otherwise mostly corrected. Primary goal: Remove the remaining live dependency anchors that prevent stale mirror cleanup. Requirements: - identify all remaining live imports or dependency edges that keep stale mirror trees alive - focus especially on PlatformAdminService and any similar cross-lane service dependencies - replace wrong-lane dependencies with the correct canonical boundary: - a canonical admin-owned import - a true shared lib primitive - or another architecture-approved boundary already established by the lane convergence work - rewire imports without widening scope into feature redesign - update LANE_INVENTORY.md classifications after dependency anchors are removed Do not: - delete stale mirror trees yet unless they are reclassified and proven safe - do blanket cleanup - remove RouteShyft transitional keepers - do migration-runner production cutover in this slice - redesign feature behavior - dump feature business logic into libs to avoid ownership decisions Hard boundaries: - Slice 9 is dependency-anchor cleanup only - Slice 10 is where stale mirrors may be deleted after reclassification - Slice 11 is migration-runner production cutover Stop boundary for this slice: - no live runtime depends on stale mirror trees - PlatformAdminService no longer anchors the wrong tree - affected apps build - stale mirrors may be reclassified, but large mirror deletion is deferred to the next slice Please generate a spec.md that includes: - scope - non-goals - acceptance criteria - reclassification requirements - verification requirements - explicit stop boundary - risks"

## Scope

This slice removes the remaining live dependency anchors that keep explicitly reviewed stale mirrored surfaces patch-relevant after the main lane convergence remediation. The work is limited to identifying real runtime dependency edges, rewiring them onto the correct canonical boundary, and reclassifying only the affected reviewed stale mirror surfaces once those anchors are gone.

In scope:

- identifying all remaining live imports or dependency edges that keep reviewed stale mirror surfaces alive
- resolving the known `PlatformAdminService` anchor in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- reviewing similar cross-lane service dependencies that still point at wrong-lane service trees
- replacing each wrong-lane dependency with one approved canonical boundary:
  - a canonical admin-owned import
  - a true shared primitive already intended for cross-lane use
  - another architecture-approved boundary already established during lane convergence
- updating [LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md) and related classification notes after anchor removal
- build and verification work needed to prove the affected runtimes no longer depend on stale mirror trees

## Non-Goals

- deleting stale mirror trees as a broad cleanup pass
- performing blanket import cleanup outside the reviewed anchor set
- removing RouteShyft transitional keepers
- executing migration-runner production cutover
- redesigning feature behavior, authorization behavior, or service responsibilities
- moving business logic into shared libraries only to avoid lane ownership decisions
- changing canonical runtime ownership for ConnectShyft, Admin, or MoneyShyft beyond the already established lane convergence boundaries

## Routing Ownership and Lane Boundaries

- `admin-api` remains the canonical owner for admin/auth runtime behavior and any admin-owned boundary used by other lanes.
- `connectshyft-api` remains the canonical owner for ConnectShyft runtime routes and may depend only on approved cross-lane boundaries, not stale mirror service trees.
- `moneyshyft-api` and `admin-api` retain their current lane-local and delegated responsibilities; this slice does not change RouteShyft transitional ownership, migration authority, host Nginx delegation, localhost API bindings, or shared PostgreSQL compatibility.
- Acceptance for this slice requires confirming that rewired imports preserve the existing lane authority model rather than creating a new alternate owner.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Break the Known PlatformAdminService Anchor (Priority: P1)

As a maintainer, I need the live `PlatformAdminService` dependency in ConnectShyft rewired to the correct canonical boundary so the stale `apps/connectshyft-api/src/services/**` mirror tree is no longer kept alive by runtime imports.

**Why this priority**: This is the known blocker already preventing stale mirror cleanup from proceeding safely.

**Independent Test**: Can be fully tested by proving `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` no longer depends on the wrong-lane `PlatformAdminService`, the approved boundary is used instead, and the affected applications still complete their standard build and route verification.

**Acceptance Scenarios**:

1. **Given** `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` currently imports `PlatformAdminService` from a stale mirror service tree, **When** Slice 9 is implemented, **Then** that route depends only on the approved canonical boundary and no longer anchors the wrong tree.
2. **Given** the known `PlatformAdminService` anchor has been rewired, **When** the affected applications are built and their relevant runtime checks are exercised, **Then** current ConnectShyft and admin-owned behavior still works without introducing a new alternate owner.

---

### User Story 2 - Remove Other Live Cross-Lane Service Anchors (Priority: P2)

As a maintainer, I need any other remaining live cross-lane service anchors identified and rewired so reviewed stale mirror surfaces can be reclassified accurately instead of staying alive because of hidden imports.

**Why this priority**: The known blocker is unlikely to be the only remaining anchor. Slice 9 only succeeds if the reviewed stale mirror surfaces are no longer runtime-dependent.

**Independent Test**: Can be fully tested by producing an evidence-backed inventory of reviewed live anchors, showing each one was either rewired to an approved boundary or explicitly retained with a documented reason, and confirming no reviewed runtime still imports from a stale mirror tree.

**Acceptance Scenarios**:

1. **Given** a reviewed stale mirror tree is still referenced by a live runtime import, **When** the dependency-anchor review is completed, **Then** that edge is either rewired to the approved canonical boundary or documented as an unresolved blocker that prevents reclassification.
2. **Given** the reviewed live anchors have been removed, **When** the inventory and classification records are updated, **Then** each affected stale mirror surface reflects its new post-anchor status instead of remaining classified by stale assumptions.

---

### User Story 3 - Preserve Slice Boundaries for Later Mirror Deletion (Priority: P3)

As a reviewer, I need this slice to stop at dependency-anchor cleanup so later stale mirror deletion and migration-runner cutover remain separate, reviewable slices.

**Why this priority**: The main risk is turning a safe dependency-boundary cleanup into broad file deletion or architectural redesign.

**Independent Test**: Can be fully tested by reviewing the changed files, classifications, and verification outputs to confirm that no large stale mirror tree deletion, RouteShyft cleanup, or migration-runner production cutover was pulled into this slice.

**Acceptance Scenarios**:

1. **Given** Slice 9 is complete, **When** the diff and updated inventory are reviewed, **Then** stale mirrors may be reclassified but large mirror deletion remains deferred to Slice 10.
2. **Given** Slice 9 is complete, **When** the boundary checks are reviewed, **Then** RouteShyft transitional keepers and migration-runner production cutover remain unchanged.

## Edge Cases

- A service tree appears stale overall, but one live runtime import still reaches it through a helper barrel, indirect export, or test-backed runtime shim.
- Multiple lanes contain same-named services, and a rewire could accidentally point to another wrong-lane copy instead of the canonical boundary.
- The correct boundary is an existing shared primitive for some functions but a canonical admin-owned import for others; the slice must not force all cases into one pattern.
- A dependency edge is test-only or tooling-only rather than runtime-live, which affects reclassification but should not be presented as a runtime anchor.
- A reviewed anchor cannot be safely rewired without changing feature behavior; that surface must remain explicitly blocked rather than trigger redesign in this slice.
- Removing a runtime anchor changes classification status, but the stale mirror tree still contains deferred test or cleanup baggage that belongs to Slice 10 rather than Slice 9.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST identify every current direct dependency edge relevant to the reviewed Slice 9 surfaces and classify each one as `runtime_live`, `unmounted`, `test_only`, or `tooling_only`.
- **FR-002**: The system MUST remove the known `PlatformAdminService` dependency anchor from `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`.
- **FR-003**: The system MUST rewire each reviewed wrong-lane dependency to exactly one approved canonical boundary: a canonical lane-owned import, a true shared primitive, or another architecture-approved boundary already established by lane convergence.
- **FR-004**: The system MUST preserve current feature behavior while rewiring dependencies and MUST NOT widen the slice into feature redesign.
- **FR-005**: The system MUST NOT move business logic into shared libraries solely to avoid making an ownership decision.
- **FR-006**: The system MUST record proof for each reviewed dependency anchor, including the source import edge, its anchor classification, the approved replacement boundary, and the resulting classification impact on the explicitly reviewed anchored surface.
- **FR-007**: The system MUST update [LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md) and any directly supporting classification records to reflect the post-slice state of each explicitly reviewed affected mirror surface.
- **FR-008**: The system MUST NOT delete large stale mirror trees in this slice; stale mirror deletion remains deferred until Slice 10 after reclassification.
- **FR-009**: The system MUST preserve RouteShyft transitional keepers and MUST NOT change migration-runner production cutover behavior.
- **FR-010**: The system MUST preserve existing lane ownership, host delegation, localhost API binding, and shared PostgreSQL compatibility after the dependency rewiring.
- **FR-011**: The system MUST end with no reviewed live runtime importing from the explicitly reviewed stale mirror surfaces targeted by this slice.

## Reclassification Requirements

- Reclassification MUST occur only after the reviewed live dependency anchors have been removed or explicitly documented as unresolved blockers.
- Each explicitly reviewed stale mirror surface MUST end this slice in one documented state:
  - still blocked by a specific remaining live dependency edge
  - dependency anchors removed and eligible for deferred stale-mirror deletion in Slice 10
  - retained for another explicitly documented non-deletion reason that remains within the lane convergence contract
- Reclassification records MUST distinguish runtime-live anchors from unmounted, test-only, tooling-only, or documentation-only dependencies.
- Reclassification MUST NOT mark RouteShyft transitional keepers or migration-runner surfaces as safe for deletion in this slice.

## Verification Requirements

- Verify `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` no longer imports `PlatformAdminService` from the wrong tree.
- Verify each reviewed runtime import edge now points to an approved canonical boundary.
- Verify no reviewed live runtime import remains into the explicitly reviewed stale mirror surfaces covered by this slice.
- Verify no new direct app-to-app feature import was introduced between lane apps as part of the rewiring.
- Verify any unresolved anchor is documented with the exact blocking dependency edge and reason it remains out of scope.
- Verify [LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md) and any directly supporting classification docs match the final post-anchor state.
- Verify affected applications complete their standard build successfully after the rewiring.
- Verify current ConnectShyft and admin-owned route behavior continues to work after the rewiring.
- Verify host Nginx delegation, localhost API bindings, and shared PostgreSQL compatibility remain unchanged.
- Verify no RouteShyft transitional keeper removal, migration-runner production cutover work, or large stale mirror deletion is included.

## Acceptance Criteria

- The known `PlatformAdminService` anchor in `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` is removed and replaced with the approved canonical boundary.
- Every other reviewed live cross-lane dependency anchor in scope is either rewired to an approved boundary or explicitly documented as a remaining blocker with proof.
- No reviewed live runtime depends on the explicitly reviewed stale mirror surfaces covered by this slice.
- Affected applications complete their standard build successfully after the rewiring.
- Current ConnectShyft and admin-owned behavior still works after the rewiring.
- [LANE_INVENTORY.md](/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md) and supporting classification records reflect the post-slice anchor status and deferred deletion status of each affected mirror surface.
- No large stale mirror tree deletion, RouteShyft cleanup, migration-runner production cutover, or ownership redesign is included.

## Explicit Stop Boundary

This slice stops once the reviewed live dependency anchors have been removed or explicitly recorded as blockers, `PlatformAdminService` no longer anchors the wrong tree, affected applications complete their standard build, current behavior remains intact, and the explicitly reviewed stale mirror surfaces have been reclassified for later deletion work.

This slice does not continue into:

- deleting large stale mirror trees
- broad mirror cleanup outside the reviewed dependency anchors
- RouteShyft transitional cleanup
- migration-runner production cutover
- feature redesign or service-boundary redesign beyond the approved canonical rewires

## Risks

- A stale mirror tree may still have hidden live imports through indirect exports or same-named services in multiple lanes.
- A rewire could choose the wrong canonical boundary and silently create a new alternate owner instead of removing one.
- Some dependency anchors may expose real cross-lane design debt that cannot be safely resolved without broader behavior changes, forcing explicit deferral.
- Reclassification may overstate deletion readiness if it does not separate runtime anchors from test-only or tooling-only residue.
- Scope drift could turn dependency-anchor cleanup into broad stale-tree deletion before Slice 10 is ready.

## Assumptions

- The current lane convergence work already established the intended canonical owners; Slice 9 is cleaning up remaining dependency edges, not redefining ownership.
- `apps/connectshyft-api/src/services/**` is presently considered stale mirror baggage except where reviewed dependency evidence proves a surface still matters.
- Later stale mirror deletion work will rely on the post-slice classifications produced here rather than re-opening ownership decisions from scratch.

## Key Entities *(include if feature involves data)*

- **Dependency Anchor**: A live runtime import or dependency edge that keeps a stale mirror surface patch-relevant even though canonical ownership is already defined elsewhere.
- **Approved Canonical Boundary**: The single allowed replacement dependency target for a reviewed anchor, such as a canonical lane-owned import or a true shared primitive already intended for cross-lane use.
- **Mirror Surface Classification**: The recorded post-slice status of an explicitly reviewed stale mirror surface after dependency anchors are removed, retained as blockers, or deferred for Slice 10 deletion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of current direct dependency edges reviewed in scope end the slice with a documented classification of `runtime_live`, `unmounted`, `test_only`, or `tooling_only`, and a documented outcome of rewired, blocked with proof, or deferred for a specifically named reason.
- **SC-002**: The known `PlatformAdminService` anchor no longer points `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` at the wrong tree by the end of the slice.
- **SC-003**: 100% of explicitly reviewed affected mirror surfaces in this slice receive an updated post-anchor classification in the lane inventory records.
- **SC-004**: All affected applications complete their standard build verification successfully after the rewiring.
- **SC-005**: Final verification shows no reviewed live runtime still depends on the explicitly reviewed stale mirror surfaces targeted by this slice.
