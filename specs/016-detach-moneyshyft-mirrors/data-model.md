# Data Model: Slice 10b - Final MoneyShyft Mirror Detachment

## Mirror Target

- `path`: absolute repository path for the retained MoneyShyft mirror under review
- `kind`: `route_mirror`, `service_mirror`, `test_mirror`, or `test_helper_mirror`
- `lane_classification`: value from `LANE_INVENTORY.md`
- `actual_runtime_authority`: current runtime state such as `unmounted_in_moneyshyft` or `non_runtime_test_only`
- `intended_authority`: canonical owner that should remain after detachment
- `duplication_state`: current duplication posture from inventory
- `recommendation`: current recommendation from inventory
- `direct_blockers`: exact files that directly import or path-reference this target
- `indirect_blockers`: exact files that depend on a direct blocker and therefore still keep the target alive
- `coverage_disposition`: `delete_stale`, `move_to_canonical`, or `retain_with_blocker`
- `final_outcome`: `deleted` or `retained`
- `final_reason`: exact proof-backed explanation for the final outcome

Validation rules:

- A `Mirror Target` may be deleted only when both `direct_blockers` and `indirect_blockers` are empty in the final state.
- A target with `final_outcome = retained` must have a non-empty `final_reason` that names the exact unresolved blocker.

## Blocker Edge

- `source_path`: exact blocking file
- `target_path`: exact mirror target that remains blocked
- `edge_type`: `direct_import`, `test_mount`, `shared_helper_chain`, `service_test_import`, or `path_contract_reference`
- `resolution_action`: `delete_source`, `rewrite_source`, `move_assertions`, or `retain_with_reason`
- `status`: `open`, `resolved`, or `retained`

Validation rules:

- A `direct_import` or `path_contract_reference` edge must be resolved before deleting the target.
- A `shared_helper_chain` edge cannot be marked resolved while any dependent test still imports the helper.

## Coverage Disposition

- `source_test_path`: exact MoneyShyft mirror test or helper file under review
- `covered_behavior`: concise description of the assertion family it currently verifies
- `canonical_destination`: exact canonical file that should receive any surviving assertion, when needed
- `disposition`: `delete_as_mirror_only`, `rewrite_against_canonical_owner`, `move_assertions_then_delete`, or `retain_with_blocker`
- `proof_note`: explanation of why the disposition is safe

Validation rules:

- `canonical_destination` is required when `disposition` is `rewrite_against_canonical_owner` or `move_assertions_then_delete`.
- `proof_note` must explain why the remaining behavior still matters or why it no longer validates live runtime behavior.

## Inventory Mutation

- `path`: exact reviewed file path
- `previous_duplication_state`: value before implementation
- `previous_recommendation`: value before implementation
- `next_actual_runtime_authority`: final post-slice runtime status
- `next_duplication_state`: final duplication state
- `next_recommendation`: final recommendation
- `notes_update`: final notes text summarizing proof and blocker outcome

State transitions:

- `transitional` + `converge_first` + all blockers resolved -> deleted stale posture with explicit slice note
- `transitional` + `converge_first` + blocker remains -> stays transitional with exact blocker named
- broad glob row reviewed at exact-file level -> add exact file row and let exact row govern future deletion safety
