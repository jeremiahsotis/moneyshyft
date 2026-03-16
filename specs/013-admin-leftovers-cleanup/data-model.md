# Data Model: Slice 8 Stale Admin Leftovers Cleanup

## Cleanup Target

- **Purpose**: Represents a specific stale surface under review in this slice.
- **Fields**:
  - `path`: repository path of the candidate
  - `surface_type`: web view group, navigation reference, or API leftover
  - `lane`: admin-web or moneyshyft-api
  - `current_classification`: current inventory status before slice execution
  - `proposed_outcome`: delete, retain, or reclassify
- **Relationships**:
  - has one or more `Reference Evidence` records
  - ends with one `Classification Decision`

## Reference Evidence

- **Purpose**: Captures the proof used to decide whether a cleanup target is safe to remove.
- **Fields**:
  - `target_path`: path of the target being evaluated
  - `evidence_type`: router mount, static import, dynamic reference, test dependency, or documentation evidence
  - `source_path`: file or command output location that produced the evidence
  - `result`: referenced, not referenced, mounted, or unmounted
  - `notes`: short explanation of what the evidence proves
- **Validation Rules**:
  - each target must have enough evidence to justify its final state
  - deletion requires no remaining live or test dependency evidence

## Classification Decision

- **Purpose**: Records the final post-slice state for each reviewed target.
- **Fields**:
  - `target_path`: reviewed target
  - `final_state`: deleted_confirmed_stale or retained_still_needed
  - `reason`: concise explanation tied to evidence
  - `documentation_updated`: whether inventory/remediation docs were updated
- **State Transitions**:
  - `candidate` -> `deleted_confirmed_stale`
  - `candidate` -> `retained_still_needed`

## Verification Run

- **Purpose**: Represents the bounded slice-level proof that cleanup did not break the admin lane.
- **Fields**:
  - `admin_web_build_status`
  - `admin_route_check_status`
  - `boundary_scope_check_status`
  - `notes`
- **Validation Rules**:
  - slice completion requires a passing admin-web build
  - slice completion requires proof that admin routes still work
  - slice completion requires proof that ConnectShyft, migration authority, and RouteShyft keepers remain unchanged
