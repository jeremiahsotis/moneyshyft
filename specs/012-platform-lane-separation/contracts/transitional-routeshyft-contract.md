# Contract: Transitional RouteShyft Handling

## Purpose

Keep RouteShyft explicit, stable, and non-silent during platform lane convergence.

## Transitional keepers for this remediation

- `apps/moneyshyft-api/src/routes/api/v1/route.ts`
- `apps/moneyshyft-api/src/routes/api/v1/route-bridge.ts`
- `apps/moneyshyft-api/src/modules/route/**`
- `apps/moneyshyft-web/src/views/MoneyShyft/RouteRequestLifecycleView.vue`
- any required shared schema artifacts already represented in shared migrations

## Required classification values

- `transitional_keep_for_now`
- `safe_delete_after_convergence`
- `unknown_requires_followup`

## Rules

- RouteShyft must not be silently treated as canonical MoneyShyft ownership.
- RouteShyft must not be silently removed during this remediation.
- RouteShyft business logic must not be moved into `libs/` solely to defer ownership decisions.
- Non-MoneyShyft RouteShyft mirrors may be classified as stale, but only after confirming they are not mounted.
- RouteShyft cleanup may remove only files explicitly marked `dead_stale` in `architecture/LANE_INVENTORY.md`.
- RouteShyft remains transitional until a separate approved follow-up spec defines extraction or removal.

## Verification

- Inventory entries for RouteShyft remain explicit.
- MoneyShyft RouteShyft endpoints and lifecycle UI remain functional until a separate follow-up removes or extracts them.
- Cleanup verification must prove RouteShyft remains live in MoneyShyft after any non-Money mirror deletion.
