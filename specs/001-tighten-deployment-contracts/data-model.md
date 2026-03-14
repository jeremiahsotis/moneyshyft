# Data Model: Deployment Tightening Round

## Entity: LaneDeploymentContract

- Fields:
  - `lane_id` (enum: `admin`, `money`, `connect`)
  - `domain` (string, fqdn)
  - `frontend_root` (string, absolute path)
  - `api_service` (string)
  - `api_port` (integer)
  - `route_policy_id` (string)
  - `status` (enum: `draft`, `approved`, `verified`)
- Validation Rules:
  - `domain` MUST be unique across in-scope lanes.
  - `api_port` MUST match canonical mapping for lane.
  - `status=verified` requires acceptance evidence linkage.
- Relationships:
  - One-to-one with `RoutingContract` per lane.
  - One-to-many with `AcceptanceVerificationRecord`.

## Entity: RoutingContract

- Fields:
  - `route_policy_id` (string)
  - `lane_id` (enum)
  - `delegated_auth_paths` (list of path patterns)
  - `delegated_platform_admin_paths` (list of path patterns)
  - `lane_local_api_paths` (list of path patterns)
  - `owner_service_map` (map path-pattern -> service)
- Validation Rules:
  - For `money` and `connect`, delegated auth/platform-admin paths MUST map to
    `admin-api`.
  - Lane local `/api/*` patterns MUST map to lane API service.
  - For `admin`, `/api/*` MUST map to `admin-api`.
- Relationships:
  - Belongs to one `LaneDeploymentContract`.

## Entity: ServiceEndpointBinding

- Fields:
  - `service_name` (enum: `admin-api`, `money-api`, `connect-api`)
  - `loopback_host` (string, expected `127.0.0.1`)
  - `port` (integer)
  - `public_exposure` (boolean, expected `false`)
  - `health_path` (string, expected `/health`)
- Validation Rules:
  - `public_exposure` MUST be `false`.
  - `loopback_host` MUST be `127.0.0.1`.
  - `(service_name, port)` MUST be unique and canonical.
- Relationships:
  - Referenced by `LaneDeploymentContract` and
    `AcceptanceVerificationRecord`.

## Entity: DatabaseAuthorityPolicy

- Fields:
  - `db_topology` (enum: `shared-single-instance`)
  - `authority_service` (string, expected `admin-api`)
  - `allowed_prod_migration_runners` (list)
  - `disallowed_prod_migration_runners` (list)
  - `status` (enum: `active`, `superseded`)
- Validation Rules:
  - `allowed_prod_migration_runners` MUST contain only `admin-api`.
  - `disallowed_prod_migration_runners` MUST include money/connect API services.
- Relationships:
  - Linked to `AcceptanceVerificationRecord` for DB checks.

## Entity: DeploymentRunbookStep

- Fields:
  - `step_id` (string)
  - `sequence` (integer)
  - `description` (string)
  - `required_inputs` (list)
  - `expected_outcome` (string)
  - `manual_override_required` (boolean)
- Validation Rules:
  - `sequence` MUST be unique per runbook.
  - `manual_override_required` MUST be `false` for reproducible deployment path.
- Relationships:
  - One-to-many with `AcceptanceVerificationRecord` for execution evidence.

## Entity: AcceptanceVerificationRecord

- Fields:
  - `record_id` (string)
  - `verification_type` (enum: `routing`, `health`, `db`, `security`, `runbook`)
  - `target_lane` (enum: `admin`, `money`, `connect`, `platform`)
  - `evidence_ref` (string)
  - `result` (enum: `pass`, `fail`)
  - `verified_at` (datetime)
- Validation Rules:
  - `result` MUST be `pass` for release readiness.
  - Required coverage MUST include all verification types.
- Relationships:
  - References `LaneDeploymentContract`, `ServiceEndpointBinding`, and
    `DatabaseAuthorityPolicy`.

## State Transitions

- `LaneDeploymentContract.status`:
  - `draft` -> `approved` when contract review passes.
  - `approved` -> `verified` when acceptance verification records all pass.
- `DatabaseAuthorityPolicy.status`:
  - `active` -> `superseded` only by formal future architecture amendment.
