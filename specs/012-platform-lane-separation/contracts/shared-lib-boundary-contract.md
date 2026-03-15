# Contract: Shared Lib Boundary

## Purpose

Define what may move into `libs/` during convergence and what must remain lane-owned.

## Allowed in `libs/`

- config and environment primitives
- DB access primitives and shared connection helpers
- auth primitives
- request/response envelope primitives
- tenancy/RBAC primitives
- logging and telemetry primitives
- validation primitives and shared contracts
- shared utility functions
- shared frontend shell/access primitives used by more than one lane
- normalized shared communication domain/infrastructure primitives
- entitlement and actor-context helpers extracted from `PlatformAdminService.ts`
- lane-neutral session/bootstrap/layout primitives for `libs/ui-shell`

## Not allowed in `libs/`

- MoneyShyft business logic
- ConnectShyft business logic
- Admin business logic
- RouteShyft business logic moved only to avoid ownership decisions
- mirrored feature trees copied wholesale from apps
- tenant governance workflows extracted from `PlatformAdminService.ts`
- admin workflow behavior, module-governance UX, or route-specific business behavior in `libs/ui-shell`

## Consumer rule

- Apps may import `libs/`.
- Apps must not import canonical feature logic directly from other apps.

## Extraction sequencing rule

- Shared infrastructure must be extracted before route or module relocation if the move would otherwise require app-to-app feature imports or duplicate infrastructure.

## Verification

- Import scans must show no canonical runtime paths importing feature logic from another app.
- Shared packages must not contain feature module trees.
- `libs/ui-shell` must not contain admin-only workflow behavior.
- `libs/` extracts from `PlatformAdminService.ts` must be limited to lane-neutral entitlement/authz helpers.
