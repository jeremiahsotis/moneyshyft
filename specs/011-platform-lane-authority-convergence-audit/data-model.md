# Audit Data Model

## Entity: SurfaceRecord

- Purpose: Canonical record for each audited subsystem or serving surface.
- Fields:
  - `surfaceKey`: stable identifier such as `auth_api`, `money_ui`, `connectshyft_backend_money_host`
  - `scopeLabel`: user-facing scope label such as `money-api`, `moneyshyft-web`, `connect-api`, `admin-api`, `migration-runner`
  - `repoPaths`: one or more authoritative source paths
  - `actualRuntimeAuthority`: current live authority based on ingress, mount, and packaging evidence
  - `intendedAuthority`: target or documented canonical authority
  - `classification`: `canonical | mirrored_identical | mirrored_diverged | dead_stale | transitional | unknown`
  - `runtimeStatus`: `live | delegated | unmounted | future_ready | unknown`
  - `dependencyStatus`: summary of current dependents
  - `safePatchLocation`: path or decision describing where fixes can land safely now
  - `remediationRecommendation`: `fix_now_before_feature_work | safe_to_patch_live_authority_now | converge_first | documentation_only_for_now`
  - `evidence`: list of file references that justify the classification
- Validation rules:
  - Every covered surface must have exactly one `classification`.
  - `canonical` surfaces must name a single safe patch location.
  - `mirrored_diverged` surfaces must not claim a broad safe patch target across all mirrors.

## Entity: DuplicationSet

- Purpose: Groups overlapping implementations of the same subsystem across lanes.
- Fields:
  - `duplicationKey`
  - `participants`: list of `SurfaceRecord.surfaceKey`
  - `sharedFileCount`
  - `identicalFileCount`
  - `divergedFileCount`
  - `classificationSummary`
  - `decision`
- Relationships:
  - References two or more `SurfaceRecord` entries.
- Validation rules:
  - Must distinguish mirrored-identical from mirrored-diverged based on file-content evidence.

## Entity: MigrationAuthorityRecord

- Purpose: Captures authority and runner state for migration execution.
- Fields:
  - `authoritySourcePath`
  - `currentAuthorizedRunner`
  - `futureRunner`
  - `laneLocalAssumptionsPresent`: boolean
  - `sharedAuthorityCanonical`: boolean
  - `buildPathDependency`: description of whether build/package still depends on lane-local migration logic
  - `classification`
  - `safePatchLocation`
  - `decision`
- Validation rules:
  - Must answer whether `admin-api` remains the current production runner.
  - Must answer whether `migration-runner` is future-ready only.

## Entity: RouteShyftArtifactRecord

- Purpose: Specialized record for embedded RouteShyft artifacts inside the money lane.
- Fields:
  - `artifactKey`
  - `repoPath`
  - `artifactType`: `api_route | module_tree | frontend_view | migration | supporting_test`
  - `actualRuntimeStatus`: `live | transitional | dead | unknown`
  - `dependencyStatus`
  - `classification`: `transitional_keep_for_now | safe_delete_after_convergence | unknown_requires_followup`
  - `removalGate`: short statement of what must be true before safe deletion
  - `safePatchLocation`
  - `evidence`
- Validation rules:
  - Every RouteShyft artifact in scope must receive one of the three RouteShyft classifications.

## Entity: SafeDeleteCandidate

- Purpose: Models non-immediate delete eligibility after convergence.
- Fields:
  - `candidateKey`
  - `repoPaths`
  - `currentClassification`
  - `requiredPreconditions`
  - `blockingDependents`
  - `status`: `not_safe_now | safe_after_convergence | unknown`
- Validation rules:
  - `safe_after_convergence` requires explicit canonical replacement and zero live mounts.

## Entity: BlockedArea

- Purpose: Records areas where feature work must stop until convergence or authority clarification happens.
- Fields:
  - `blockedKey`
  - `affectedSubsystem`
  - `whyBlocked`
  - `conflictingAuthorities`
  - `requiredDecisionBeforeFix`
  - `allowedInterimPatchScope`
- Validation rules:
  - Must point to a specific subsystem, not a vague architectural concern.

## State Transitions

### SurfaceRecord lifecycle

- `unknown -> canonical` when ingress, runtime mount, and intended authority align.
- `unknown -> mirrored_identical` when multiple copies exist and shared files are materially identical but one is not the active authority.
- `unknown -> mirrored_diverged` when multiple live or patch-relevant copies exist and differ by content or behavior.
- `unknown -> dead_stale` when no live mount, build path, or dependency remains.
- `unknown -> transitional` when the surface is still live or dependency-bearing but intended to be retired after convergence.

### RouteShyftArtifactRecord lifecycle

- `unknown_requires_followup -> transitional_keep_for_now` when live mounts or active dependents are verified.
- `transitional_keep_for_now -> safe_delete_after_convergence` only after canonical replacement, dependency removal, and route unmount are all verified.

## Relationships Summary

- `SurfaceRecord` is the base unit.
- `DuplicationSet` groups multiple `SurfaceRecord` entries.
- `MigrationAuthorityRecord` governs schema authority and runner decisions across multiple surfaces.
- `RouteShyftArtifactRecord` is a specialized subtype of embedded money-lane artifacts.
- `SafeDeleteCandidate` and `BlockedArea` are decision overlays derived from the other entities.
