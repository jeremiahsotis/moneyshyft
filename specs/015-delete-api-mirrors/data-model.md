# Data Model: Slice 10 - File-Level API Mirror Deletion

## Mirror File Candidate

- `path`: absolute repository path for the reviewed file
- `kind`: service mirror, route mirror, or test mirror
- `lane_classification`: lane ownership classification from inventory
- `runtime_status`: runtime_live, unmounted, non_runtime_test_only, or equivalent current-state label
- `duplication_state`: canonical, transitional, dead_stale, or unknown
- `recommendation`: safe_delete_after_convergence, converge_first, transitional_keep_for_now, or other inventory recommendation
- `current_proof`: summary of import, mount, and test-dependency evidence
- `final_outcome`: deleted, retained, or deferred
- `final_reason`: concise explanation for the final outcome

Validation rules:
- A candidate cannot be deleted unless `recommendation` is `safe_delete_after_convergence` and `current_proof` confirms no remaining required dependency.
- A candidate with `recommendation` `converge_first` is always retained in Slice 10.

## Associated Test Candidate

- `path`: absolute repository path for the test file
- `covers_surface`: stale mirror file or route family it exercises
- `coverage_role`: parity_history, ownership_assertion, regression_guard, or unknown
- `dependency_status`: test_only, still_required, or unresolved
- `inventory_row_status`: explicit_row_present or needs_file_level_row
- `final_outcome`: deleted, retained, or deferred
- `final_reason`: proof-backed explanation of why the file was removed or kept

Validation rules:
- An associated test candidate must be reviewed individually even if sibling tests share the same mirror family.
- A test candidate stays in place if its role cannot be proven redundant.

## File-Level Inventory Row

- `path`: exact reviewed file path
- `type`: service mirror, route mirror, test mirror, or module mirror
- `actual_runtime_authority`: current authority or non-runtime status
- `intended_authority`: canonical owner or explicit deferral target
- `duplication_state`: transitional, dead_stale, or canonical
- `recommendation`: final recommendation after Slice 10 review
- `notes`: proof summary and explicit slice outcome

State transitions:
- `safe_delete_after_convergence` + proof confirmed -> `deleted_after_slice_10`
- `safe_delete_after_convergence` + proof contradicted -> retained with explicit blocker
- `converge_first` -> retained and explicitly deferred
- `glob_only` -> upgraded to exact file-level row when reviewed
