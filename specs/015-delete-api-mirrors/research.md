# Slice 10 Research: File-Level API Mirror Deletion

## Decision: Delete only the ConnectShyft `PlatformAdminService` mirror and its paired stale service test

- Decision: Delete:
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/PlatformAdminService.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
- Rationale:
  - repository import scans show the ConnectShyft service mirror was referenced only by its paired stale service test
  - Slice 9 already removed the live runtime anchor from `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - deleting the paired test removes the last in-repo dependency without widening into route-level convergence work
- Alternatives considered:
  - retain the service mirror for parity history only: rejected because no surviving runtime, route, or reviewed retained test still needs it
  - delete the full ConnectShyft service tree: rejected because Slice 10 is file-bounded, not tree-bounded

## Decision: Retain the MoneyShyft `PlatformAdminService` mirror as blocked and deferred

- Decision: Retain:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`
- Rationale:
  - current in-repo imports still exist from:
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
    - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
  - the spec now disallows deleting a file while any retained in-repo importer still points at it, even if those importers are unmounted
- Alternatives considered:
  - delete the MoneyShyft service mirror anyway because it is non-runtime: rejected because it would break retained deferred sources and tests

## Decision: Retain the reviewed MoneyShyft associated tests in Slice 10

- Decision: Retain:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`
- Rationale:
  - `connectshyft.provider-registry.test.shared.ts` is a shared helper imported by multiple provider-registry tests that are not in Slice 10 scope
  - `connectshyft.neighbors.test.ts` and `connectshyft.identity-match.test.ts` exercise the deferred MoneyShyft `connectshyft.ts` route mirror and still import the retained MoneyShyft service mirror
  - the MoneyShyft `PlatformAdminService.test.ts` file is paired to the retained MoneyShyft service mirror, so deleting it would front-run route-level closure work
- Alternatives considered:
  - delete the reviewed MoneyShyft tests as stale mirror baggage: rejected because the route/service surfaces they exercise remain deferred and in-repo

## Decision: Keep the two MoneyShyft route files explicitly deferred

- Decision: Do not delete:
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
  - `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`
- Rationale: both files remain `converge_first`; Slice 10 stops before route-level closure
- Alternatives considered:
  - re-open route convergence proof in Slice 10: rejected because that widens the slice beyond file-safe deletion

## Decision: Verification must prove bounded deletion and retained-surface safety

- Decision: Use this verified order:
  1. pre-delete import/reference scan
  2. lock delete-versus-retain decisions
  3. bounded file deletion for the ConnectShyft service mirror and paired test only
  4. affected app builds
  5. targeted surviving test reruns
  6. post-delete import/reference scan
  7. explicit deferral and untouched-surface audit
- Rationale: this sequence proves the deleted files were isolated and that retained deferred surfaces still hold the stop boundary
- Alternatives considered:
  - build-only verification: rejected because it misses stale reference proof
  - deleting additional MoneyShyft stale tests in the same slice: rejected because the retained route/service blockers keep that work adjacent to converge-first closure
