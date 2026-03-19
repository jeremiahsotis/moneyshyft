# PR 026 — Testing Obligations

## Contract Coverage

- `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })` returns `providerNumberE164`, `mappingId`, and routing metadata for valid tenant-scoped SMS and partial voice thread alignment.
- Repeated resolution for the same `{ tenantId, orgUnitId, threadId, channel }` keeps the same mapped sender number and mapping identity.
- Missing, inactive, reassigned, ambiguous, and cross-scoped mappings return deterministic refusals with no synthetic identifier generation and no fallback sender assignment.
- Legacy synthetic thread-alignment tokens are rejected instead of being rewritten into sender choices.

## Integration Coverage

- Outbound SMS dispatch uses the sender number returned by centralized resolution and no longer depends on single-active-mapping shortcuts outside the resolver.
- Inbound SMS correlation on a mapped provider number aligns with the same tenant, org unit, and thread sender decision as outbound traffic, and the ensured thread stores the mapped provider number as the next outbound anchor.
- Partial voice sender selection uses the same resolver and refuses when no valid aligned mapping exists.
- Tenant-scoped number mappings never allow sender selection to bleed across tenants or org units.

## Regression Guarantees

- `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber(...)` remains the authoritative mapping lookup used by sender-number resolution.
- No sender-selection path falls back to neighbor-based, thread-based, random, or synthetic sender identifiers.
- Routing metadata remains available to audit successful resolution and deterministic refusal outcomes.
- Message timeline, idempotency summaries, and communication audit behavior remain intact after sender selection is centralized.

## Executed Commands

```bash
cd /Users/jeremiahotis/projects/connectshyft
npm run policy:check
bash scripts/verify-connectshyft-route-ownership.sh
bash scripts/lint-or-discovery.sh
bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh
bash scripts/ci-run-playwright-stack.sh bash scripts/test-changed.sh origin/codex/dev
bash scripts/ci-run-playwright-stack.sh bash scripts/burn-in.sh 3 origin/codex/dev
bash scripts/quality-gates.sh

cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
```

## Burn-In Notes

- The official burn-in job completed 3 iterations and skipped cleanly because this branch does not add or modify Playwright `.spec.ts` files.
- To burn in the changed backend surface, the local backend CI lane `bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh` was run 3 times successfully.

## Platform Validation

- Verified unchanged ConnectShyft route ownership with `bash scripts/verify-connectshyft-route-ownership.sh`.
- Confirmed `apps/connectshyft-api/Dockerfile.production` still exposes port `3002` and preserves the same production runtime contract.
- Confirmed `apps/admin-api/knexfile.js` still enforces shared Postgres connectivity through environment-driven production configuration and shared migration ownership.
- Rechecked `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` for host-managed Nginx, localhost-only lane API loopback targets, shared host-managed Postgres, and admin-owned migration execution guidance.
