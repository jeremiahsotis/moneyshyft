# Dependency Anchor Boundary Contract

## Purpose

Define the approved dependency replacement boundary for Slice 9 so cross-lane rewires remove stale mirror anchors without creating new alternate owners.

## In-Scope Runtime Anchors

| Source Path | Current Anchor | Required Replacement Boundary | Notes |
| --- | --- | --- | --- |
| `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` | local `../../../services/PlatformAdminService` | shared entitlement primitive under `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/*` | Primary Slice 9 blocker |
| `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/api/registerRoutes.ts` | local `../services/PlatformAdminService` | shared entitlement primitive under `/Users/jeremiahotis/projects/connectshyft/libs/platform/src/*` | Live MoneyShyft guard anchor |

## Approved Shared Exports

The new shared boundary may expose only the entitlement subset required by live cross-lane consumers:

- `PlatformAdminActorContext`
- `GovernedModuleKey`
- `TenantModuleEntitlementDecision`
- `evaluateTenantModuleEntitlement`
- `evaluateActorTenantModuleEntitlement`

## Semantic Lock

The shared entitlement primitive is valid only if it preserves the entitlement behavior currently defined by `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/PlatformAdminService.ts` for:

- `PlatformAdminActorContext`
- `GovernedModuleKey`
- `TenantModuleEntitlementDecision`
- `evaluateTenantModuleEntitlement`
- `evaluateActorTenantModuleEntitlement`

If parity cannot be shown without moving broader admin feature logic, Slice 9 must stop and defer.

## Explicitly Disallowed Replacements

- direct import from `apps/admin-api/src/services/PlatformAdminService.ts`
- moving full admin tenant-management or mutation logic into `libs/`
- rewriting the ConnectShyft or MoneyShyft routes to call a new cross-lane HTTP contract in this slice
- deleting the stale service trees as part of the same patch

## Reclassification Contract

After the live anchors above are rewired:

- `apps/connectshyft-api/src/services/PlatformAdminService.ts` must no longer be classified as runtime-live
- only explicitly reviewed stale mirror surfaces may have their notes advanced toward Slice 10 deletion readiness
- `apps/moneyshyft-api` mirror notes must distinguish remaining unmounted/test-only dependency residue from live runtime anchors

## Verification Contract

Slice 9 is complete only if:

1. the two in-scope runtime anchors use the shared entitlement primitive
2. no reviewed live runtime still imports from the stale mirror service trees covered by Slice 9
3. affected apps build successfully
4. current ConnectShyft and MoneyShyft route behavior still works
5. lane delegation, localhost API binding, shared Postgres compatibility, and runbook assumptions remain unchanged
6. no broad stale-tree deletion is included
