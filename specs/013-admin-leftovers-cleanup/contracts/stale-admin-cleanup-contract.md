# Contract: Slice 8 Stale Admin Cleanup Boundary

## Purpose

Define the proof required before deleting stale unmounted admin-web leftovers or likely stale admin leftovers in this slice.

## Target Set

### Primary stale admin-web candidates

- `apps/admin-web/src/views/Accounts`
- `apps/admin-web/src/views/Budget`
- `apps/admin-web/src/views/Dashboard`
- `apps/admin-web/src/views/Debts`
- `apps/admin-web/src/views/Goals`
- `apps/admin-web/src/views/Scenarios`
- `apps/admin-web/src/views/Transactions`

### Likely stale leftovers requiring verification

- `apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- `apps/moneyshyft-api/src/routes/api/v1/platform-admin.ts`

## Deletion Preconditions

A target may be deleted only if all of the following are true:

1. It is not mounted by the live router or route registry.
2. It is not imported directly or transitively by active runtime code.
3. It is not dynamically referenced in a way that still makes it reachable.
4. It is not required by active tests, smoke checks, or verification harnesses.
5. Its deletion does not break the admin-web build or current admin route behavior.

## Retention Rule

If any target still has a proven runtime, test, or verification dependency, it must remain in place and be explicitly reclassified as still needed rather than left ambiguous.

## Supporting Cleanup Allowed

This slice may remove or update adjacent admin-web references only when needed to safely remove the primary stale admin-web candidates. Examples include stale navigation links that still point to unmounted MoneyShyft pages.

## Prohibited Changes

This slice must not:

- change ConnectShyft runtime ownership
- change migration execution authority or cutover state
- remove RouteShyft transitional keepers
- delete unrelated API mirrors
- expand into blanket stale-code cleanup

## Verification Contract

The slice is complete only when:

1. Every target in the set has a final documented state of deleted or retained.
2. `admin-web` builds successfully.
3. Current admin routes still function.
4. Inventory and remediation docs reflect the final classifications.
5. No out-of-scope boundary changes appear in the diff.
