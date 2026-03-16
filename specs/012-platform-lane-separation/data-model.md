# Data Model: Platform Lane Separation and Canonical Authority Remediation

## Entity: Lane Artifact

Represents any route entrypoint, module tree, web surface, migration path, or shared package that must be classified during convergence.

**Fields**

- `artifactId`: stable identifier derived from path
- `path`: repository path
- `artifactType`: `route` | `module_tree` | `web_surface` | `migration_path` | `shared_package` | `config_surface`
- `laneClassification`: `MONEYSHYFT` | `CONNECTSHYFT` | `ADMIN` | `MIGRATION_RUNNER` | `SHARED` | `ROUTESHYFT` | `UNKNOWN`
- `actualRuntimeAuthority`: runtime owner or `none_unmounted`
- `intendedAuthority`: canonical owner
- `duplicationState`: `canonical` | `mirrored_identical` | `mirrored_diverged` | `dead_stale` | `transitional` | `unknown`
- `recommendation`: remediation recommendation from lane inventory
- `notes`: freeform evidence summary

**Validation rules**

- `path` must be unique in the inventory.
- `SHARED` artifacts must not have feature-business intended authority.
- `ROUTESHYFT` artifacts cannot be marked `safe_delete_after_convergence` without explicit runtime proof that they are unmounted and schema-independent.

## Entity: Shared Lib Package

Represents a `libs/` package created to absorb infrastructure duplicated across apps.

**Fields**

- `packageId`
- `path`
- `concernType`: `platform` | `auth` | `db` | `http` | `validation` | `telemetry` | `ui_shell` | `contracts`
- `sourceArtifacts`: list of contributing `Lane Artifact` paths
- `consumerApps`: list of lane apps
- `containsBusinessLogic`: boolean

**Validation rules**

- `containsBusinessLogic` must be `false`.
- `consumerApps` may include many apps, but no consumer may need app-to-app feature imports after extraction.

## Entity: Route Authority Surface

Represents a mounted HTTP or SPA route surface that users or upstream proxies resolve to.

**Fields**

- `surfaceId`
- `routeKind`: `http_api` | `spa_route`
- `pathPattern`
- `currentOwner`
- `targetOwner`
- `compatibilityShimRequired`: boolean
- `cutoverPhase`
- `verificationSuite`

**Relationships**

- Belongs to one `Lane Artifact`
- May depend on one or more `Shared Lib Package` items

**Validation rules**

- `targetOwner` must match canonical ownership from `LANE_AUTHORITY.md`.
- `compatibilityShimRequired` may be `true` only for transitional cutover phases, not end state.

## Entity: Feature Module Convergence Set

Represents a group of divergent module trees that must converge into one canonical owner.

**Fields**

- `moduleKey`: e.g. `connectshyft`
- `canonicalTree`
- `sourceTrees`
- `mergeStrategy`: `selective_merge` | `copy_then_shrink` | `retain_canonical_only`
- `blockingSharedConcerns`
- `runtimePriority`: `critical` | `high` | `medium`

**Validation rules**

- `canonicalTree` must be inside the canonical owning lane.
- `mergeStrategy` must not be `blind_move`.

## Entity: Migration Execution Surface

Represents a script or runtime capable of executing schema changes.

**Fields**

- `surfaceId`
- `path`
- `executionType`: `production_runner` | `guardrail` | `dev_runner` | `packaging_step`
- `currentAuthority`
- `targetAuthority`
- `schemaSourcePath`
- `cutoverState`: `current` | `prepared_future` | `blocked` | `retired`
- `governancePrecondition`: boolean

**Validation rules**

- Production execution must reference `shared/database/migrations` as schema authority.
- Feature runtime apps cannot end with `executionType=production_runner`.
- If `targetAuthority` is `migration-runner`, `governancePrecondition` must be `true` until constitution alignment is complete.

## Entity: Transitional Artifact

Represents code explicitly retained during convergence without canonical long-term ownership.

**Fields**

- `artifactPath`
- `classification`: `transitional_keep_for_now` | `safe_delete_after_convergence` | `unknown_requires_followup`
- `liveMountPresent`: boolean
- `schemaDependencyPresent`: boolean
- `removalPreconditions`

**Validation rules**

- `liveMountPresent=true` implies classification cannot be `safe_delete_after_convergence` in the current phase.
- RouteShyft artifacts in MoneyShyft surfaces should default to `transitional_keep_for_now`.

## Entity: Phase Checkpoint

Represents a build/test gate used to prove a convergence phase is safe.

**Fields**

- `phaseId`
- `name`
- `commands`
- `successCriteria`
- `blockingOn`

**Validation rules**

- Every phase must have at least one build or smoke verification checkpoint.
- Route ownership phases must include route-resolution verification before cleanup phases unlock.

## Relationships Summary

- `Lane Artifact` may map to one `Route Authority Surface`, one `Migration Execution Surface`, or one `Transitional Artifact`.
- `Shared Lib Package` aggregates infrastructure extracted from multiple `Lane Artifact` entries.
- `Feature Module Convergence Set` references one canonical tree and multiple source `Lane Artifact` trees.
- `Phase Checkpoint` validates route, module, or migration state transitions before the next phase.

## State Transitions

### Route authority

- `wrong_lane_live` -> `compatibility_shim` -> `canonical_live` -> `stale_duplicate`

### Module convergence

- `mirrored_diverged` -> `selective_merge_in_progress` -> `canonical_only_runtime` -> `stale_duplicate`

### Migration execution

- `admin_runtime_authoritative` -> `runner_prepared_not_authoritative` -> `governance_approved` -> `migration_runner_authoritative`

### Transitional RouteShyft

- `live_transitional` -> `explicitly_isolated` -> `followup_extraction_or_removal`
