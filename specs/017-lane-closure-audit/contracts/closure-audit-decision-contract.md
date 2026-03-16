# Contract: Lane Convergence Closure Audit Decision Output

## Purpose

Define the required structure for the final closure-audit output so the result is explicit, comparable across lanes, and bounded before migration-runner work.

## Required Output Sections

1. `ConnectShyft closure status`
2. `MoneyShyft closure status`
3. `Admin closure status`
4. `Exact remaining loose ends`
5. `Final convergence decision`

## Allowed Decision Labels

Each lane status and each loose end must use exactly one of:

- `resolved and ready to mark closed`
- `small final cleanup still needed`
- `blocked and needs another slice`

## Required Evidence For Each Lane Status

Each lane section must include:

- the inventory rows that were inspected
- the repo paths or route registrations that were checked
- the boundary evidence that supports the status
- the remaining loose ends for that lane, if any

## Required Evidence For Each Loose End

Each loose end must include:

- `path_or_row`
- `why_it_is_still_open`
- `why_it_is_not_already_resolved`
- `why_it_is_not_out_of_scope`
- `decision_label`

## Final Convergence Decision Rules

The final decision may state `lane convergence complete apart from migration-runner cutover` only when:

- all three lane statuses are `resolved and ready to mark closed`
- no in-scope loose end remains in the `small final cleanup still needed` or `blocked and needs another slice` state
- the only remaining non-closure item is migration-runner cutover or related migration authority follow-up

Otherwise, the final decision must state that convergence is not yet complete and must point to the exact loose ends that keep it open.

## Explicit Stop Boundary

The final output must state that it stopped before:

- RouteShyft cleanup
- migration-runner production cutover work
- new feature work
- broad refactors
