# Slice 10 File Deletion Boundary Contract

## Allowed Deletion Scope

Slice 10 may delete only exact files that satisfy both conditions:

1. They have current file-level proof of `safe_delete_after_convergence`.
2. Pre-delete verification shows they are not router-mounted, imported, dynamically referenced, or required by surviving tests.

Current deletion-ready files after blocker review:

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`

Blocked and retained in Slice 10:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`

Associated test files are in-scope for review, but not pre-approved for deletion:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`

## Explicitly Forbidden Deletion Scope

Slice 10 must not delete:

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/modules/connectshyft`
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/modules/connectshyft`
- any RouteShyft transitional keeper
- any migration-runner or migration-authority surface

## Required Final States

- Every reviewed file ends as deleted, retained, or explicitly deferred.
- File-level inventory records match the final reviewed state.
- The two `converge_first` route files remain present and explicitly deferred.
- No broader mirror tree is implied safe based on the deletion of one file.
