# Data Model: CS-001 Lane Convergence

## Entity: UiArtifact

- Purpose: Canonical inventory of ConnectShyft UI files and ownership.
- Fields:
  - `artifact_id` (string, deterministic path key)
  - `artifact_type` (enum: `view`, `component`, `feature_module`, `router_entry`, `build_script`, `workflow_job`)
  - `source_path` (string)
  - `owner_lane` (enum: `connectshyft-web`, `moneyshyft-web`, `shared`)
  - `status` (enum: `retain`, `migrate`, `delete`)
  - `target_path` (string, nullable)
  - `parity_critical` (boolean)

## Entity: RouteOwnershipRule

- Purpose: Defines valid route-to-app ownership.
- Fields:
  - `route_pattern` (string)
  - `allowed_frontend` (enum: `connectshyft-web`, `moneyshyft-web`)
  - `must_not_exist_in` (array of app names)
  - `reason` (string)
- Validation:
  - All `/app/connectshyft/*` patterns must resolve to `connectshyft-web` only.

## Entity: BuildTargetOwnershipRule

- Purpose: Defines build/test targets that validate ConnectShyft UI.
- Fields:
  - `target_name` (string)
  - `location` (string)
  - `expected_frontend_app` (string)
  - `status` (enum: `keep`, `change`, `remove`)
- Validation:
  - Any Playwright/UI test startup target for ConnectShyft must launch `apps/connectshyft-web`.

## Entity: MigrationTask

- Purpose: Tracks artifact movement.
- Fields:
  - `task_id` (string)
  - `artifact_id` (string)
  - `operation` (enum: `migrate`, `delete`, `route_rewire`, `ci_retarget`)
  - `preconditions` (array<string>)
  - `acceptance_check` (string)

## Entity: DeletionGuard

- Purpose: Prevent reintroduction of duplicate UI in money lane.
- Fields:
  - `guard_id` (string)
  - `match_pattern` (string/glob)
  - `enforcement_point` (enum: `policy_check`, `ci_job`, `lint`)
  - `failure_message` (string)

## Relationships

- `UiArtifact` 1..* -> `MigrationTask`
- `RouteOwnershipRule` constrains `UiArtifact` where `artifact_type=router_entry`
- `BuildTargetOwnershipRule` constrains `UiArtifact` where `artifact_type=build_script|workflow_job`
- `DeletionGuard` constrains post-migration `UiArtifact` creation in money lane

## State Transitions

### UiArtifact.status

- `retain` -> `retain` (no-op)
- `migrate` -> `retain` (after file moved and imports rewired)
- `migrate` -> `delete` (if replaced by existing equivalent in connect lane)
- `delete` -> terminal (file removed and guard active)

### BuildTargetOwnershipRule.status

- `change` -> `keep` (after script/workflow retarget to connect lane)
- `remove` -> terminal (legacy target deleted)

