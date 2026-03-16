# Data Model: Final Lane Convergence Closure Audit

## Inventory Audit Row

- Purpose: Represents one `LANE_INVENTORY.md` row under review for closure.
- Fields:
  - `path`: inventory path or path pattern under review
  - `lane_classification`: ConnectShyft, MoneyShyft, Admin, or supporting shared context
  - `actual_runtime_authority`: current runtime owner or non-runtime state
  - `intended_authority`: canonical owner named by lane authority
  - `duplication_state`: current inventory duplication label
  - `recommendation`: current inventory recommendation label
  - `notes`: existing inventory explanation
  - `repo_state`: observed current repository evidence
  - `audit_disposition`: resolved, small cleanup, or blocked

## Directory Mirror Tree

- Purpose: Represents a remaining directory-level mirror tree that may still keep convergence open.
- Fields:
  - `root_path`: directory being checked
  - `canonical_comparison_root`: canonical directory used for comparison
  - `exists`: whether the tree still exists
  - `importer_paths`: direct known importers or test anchors
  - `runtime_status`: mounted, unmounted, test-only, or unknown
  - `diff_signal`: identical, diverged, or partially overlapping
  - `closure_impact`: none, small cleanup, or blocked

## Boundary Evidence

- Purpose: Represents proof that runtime, test, helper, or import boundaries are either correct or still drifting.
- Fields:
  - `boundary_type`: runtime, web routing, test import, helper import, or workspace boundary
  - `source_path`: file or script checked
  - `target_path_or_route`: route, app, or imported target being validated
  - `expected_owner`: canonical lane owner
  - `observed_result`: pass, mismatch, redirect-only, or unresolved
  - `evidence_command`: command used to gather the evidence

## Lane Closure Status

- Purpose: Final closure state for one in-scope lane.
- Fields:
  - `lane`: ConnectShyft, MoneyShyft, or Admin
  - `status`: resolved and ready to mark closed, small final cleanup still needed, or blocked and needs another slice
  - `supporting_rows`: inventory rows that drove the decision
  - `supporting_boundary_evidence`: key runtime/import/router findings
  - `remaining_loose_ends`: exact loose ends still attached to that lane, if any

## Closure Decision

- Purpose: Repository-level conclusion after all lane statuses are assigned.
- Fields:
  - `overall_status`: convergence complete apart from migration-runner cutover, or not yet complete
  - `lane_statuses`: ConnectShyft, MoneyShyft, and Admin decisions
  - `remaining_loose_ends`: all in-scope unresolved items
  - `out_of_scope_remainder`: migration-runner cutover note
  - `stop_boundary_confirmation`: statement that no RouteShyft or migration-runner implementation work was included
