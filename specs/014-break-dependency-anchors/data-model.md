# Data Model: Slice 9 Cross-Lane Dependency Anchor Cleanup

## Entity: Dependency Anchor

- Purpose: Represents a live runtime import or dependency edge that keeps a stale mirror surface patch-relevant.
- Fields:
  - `source_path`: runtime file that performs the import
  - `import_symbol`: imported symbol or type
  - `current_target`: current wrong-lane dependency target
  - `anchor_kind`: `runtime_live | test_only | unmounted | tooling_only`
  - `affected_surface`: stale mirror surface kept alive by the anchor
  - `replacement_boundary`: approved canonical replacement target
  - `status`: `identified | rewired | blocked | deferred`
- Validation rules:
  - `runtime_live` anchors must be addressed or explicitly blocked before Slice 9 closes.
  - `test_only` and `unmounted` anchors may be documented without widening the implementation patch.

## Entity: Approved Canonical Boundary

- Purpose: Represents the allowed destination for a rewired dependency.
- Fields:
  - `boundary_path`: canonical shared or lane-owned module path
  - `boundary_kind`: `shared_primitive | canonical_lane_owner | approved_existing_boundary`
  - `lane_owner`: `ADMIN | CONNECTSHYFT | MONEYSHYFT | SHARED`
  - `allowed_symbols`: exported symbols intentionally exposed to other lanes
  - `forbidden_scope`: broader logic that must remain outside the boundary
- Validation rules:
  - Must not introduce direct app-to-app feature imports.
  - Must not contain unrelated feature business logic moved solely for convenience.

## Entity: Mirror Surface Classification

- Purpose: Tracks the post-anchor state of a stale mirror surface after Slice 9.
- Fields:
  - `surface_path`: file or tree being reclassified
  - `actual_runtime_authority`: `connectshyft-api | moneyshyft-api | admin-api | non_runtime_test_only | unmounted`
  - `intended_authority`: canonical owner after lane convergence
  - `duplication_state`: `canonical | transitional | dead_stale | mirrored_identical | mirrored_diverged`
  - `recommendation`: `safe_to_patch_live_authority_now | converge_first | safe_delete_after_convergence | documentation_only_for_now`
  - `anchor_state`: `runtime_anchor_removed | runtime_anchor_remaining | test_only_anchor_remaining`
  - `slice_note`: short explanation of why deletion is deferred or newly allowed next slice
- State transitions:
  - `runtime_anchor_remaining -> runtime_anchor_removed` when all reviewed live imports are rewired
  - `runtime_anchor_removed -> safe_delete_after_convergence` when deletion is deferred but no live runtime dependency remains
  - `runtime_anchor_remaining -> converge_first` when a blocker remains unresolved

## Entity: Verification Record

- Purpose: Captures the proof needed to close Slice 9 without entering Slice 10 deletion work.
- Fields:
  - `check_type`: `import_scan | build | route_behavior | topology | inventory_update`
  - `target_paths`: source files, docs, or apps verified
  - `result`: `pass | fail | blocked`
  - `evidence_note`: concise summary of the proof
  - `slice_boundary_effect`: whether the result permits reclassification only or forces deferral
- Validation rules:
  - Each live dependency anchor must have at least one import-scan record and one post-rewire verification record.
  - Topology verification must confirm no change to auth delegation, localhost binding, or shared Postgres compatibility.
