# Implementation Plan: ConnectShyft Neighbor Soft Delete Admin Controls

**Branch**: `024-neighbor-soft-delete-admin-controls` | **Date**: 2026-03-18 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/spec.md)
**Input**: Feature specification from `/specs/024-neighbor-soft-delete-admin-controls/spec.md`

## Summary

Implement feature `024` by adding a transactional admin-only soft-delete command to the ConnectShyft neighbor service/store, reusing the already-shipped deleted-neighbor lifecycle columns, deactivating all associated phone rows as part of the same mutation, filtering standard operational reads so deleted neighbors and their threads no longer appear, and enriching deleted-aware detail reads exposed through the existing ConnectShyft routes when `includeDeleted=true`. The current codebase already excludes deleted neighbors from active inbound identity resolution, but standard neighbor listing still returns deleted rows and the thread read-contract layer has no deleted-neighbor projection, so the implementation focus is mutation, filtering, and deleted-aware detail shaping rather than new lifecycle schema invention.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, `pg`, Jest/ts-jest, shared `libs/platform` RBAC and mutation helpers, existing ConnectShyft neighbor/read-contract modules, shared `domains/communication` phone normalization  
**Storage**: Shared PostgreSQL `connectshyft` schema with existing neighbor lifecycle columns on `cs_neighbors`, canonical production migration authority under `shared/database/migrations`, and lane-local mirrors for local build/test compatibility  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites for `neighbors.ts`, `readContracts.ts`, ConnectShyft neighbor routes, inbound provider dispatch regressions, and lifecycle migration verification  
**Target Platform**: ConnectShyft API lane behind host-managed Nginx, Dockerized Node runtime, shared host-managed PostgreSQL, no direct public API exposure  
**Project Type**: Monorepo backend lane feature with shared schema authority, lane-owned route surface, and Jest regression coverage  
**Performance Goals**: Keep delete, list, and detail behavior within existing request-time patterns; add no cross-lane or network calls; preserve current inbox/list responsiveness by using tenant-scoped filtering and projection enrichment only  
**Constraints**: No hard delete, restore, or cascade delete; soft delete must require elevated tenant-privileged capability plus `irreversibleConfirmation`; standard flows must hide deleted neighbors and deleted-neighbor threads; deleted-neighbor detail must still expose deletion metadata only through existing ConnectShyft detail routes when `includeDeleted=true`; phone deactivation and neighbor lifecycle updates must be atomic; `admin-api` remains the only production migration executor  
**Scale/Scope**: One new neighbor soft-delete command and result path, one admin-only delete route, active-only standard read filtering in neighbor and thread projections, deleted-aware detail enrichment through existing ConnectShyft routes when `includeDeleted=true`, focused regression coverage for inbound SMS and audit behavior, and verification that platform routing/deployment contracts remain unchanged

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes affect `admin-web`, `admin-api`, or shared auth authority.
- **Lane isolation preserved**: Pass. Runtime behavior stays within ConnectShyft lane modules and existing shared platform helpers only.
- **Routing delegation preserved**: Pass. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned; the delete route stays under the existing ConnectShyft lane route surface.
- **Deployment topology preserved**: Pass. No Nginx, Docker binding, port, or frontend deployment changes are introduced, and validation will explicitly confirm host Nginx delegation, ConnectShyft API localhost-only binding on canonical port `3002`, shared Postgres connectivity, and unchanged runbook reproduction.
- **Database ownership preserved**: Pass. Shared Postgres remains the storage model, and no new production migration authority is introduced; existing lifecycle columns remain under canonical shared migration ownership.
- **Security boundaries preserved**: Pass. No new public ingress, cookie changes, or cross-lane exposure is added; delete remains capability-gated.
- **Workflow compliance**: Pass. The plan is derived directly from the approved `024` spec and the user-supplied implementation constraints.
- **Acceptance criteria present**: Pass. The plan includes verifiable checks for delete behavior, read filtering, inbound behavior, API binding and port validation, shared Postgres connectivity, shared migration authority, and reproducible deployment runbook verification.

## Project Structure

### Documentation (this feature)

```text
specs/024-neighbor-soft-delete-admin-controls/
├── 01-specify.md
├── 02-plan.md
├── 03-tasks.md
├── 04-implement.md
├── 05-testing.md
├── 06-pr-template.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── neighbor-soft-delete-admin-controls.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
shared/database/migrations/
└── 20260318130000_add_connectshyft_neighbor_lifecycle_state.ts

apps/connectshyft-api/
├── src/
│   ├── migrations/
│   │   ├── 20260318130000_add_connectshyft_neighbor_lifecycle_state.ts
│   │   └── __tests__/
│   │       └── connectShyftNeighborsMigration.test.ts
│   ├── modules/connectshyft/
│   │   ├── __tests__/
│   │   │   ├── neighbors.test.ts
│   │   │   └── readContracts.test.ts
│   │   ├── identityResolver.ts
│   │   ├── neighbors.ts
│   │   └── readContracts.ts
│   └── routes/api/v1/
│       ├── __tests__/
│       │   ├── connectshyft.neighbors.test.ts
│       │   └── connectshyft.provider-registry.dispatch-events.test.ts
│       └── connectshyft.ts
├── knexfile.js
└── Dockerfile.production

apps/admin-api/
└── knexfile.js

nginx/nginx.conf
docker-compose.example.yml
docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

**Structure Decision**: This is a backend-only ConnectShyft lane feature. The lifecycle schema already exists under canonical shared migration authority, so runtime work stays in the ConnectShyft neighbor store/service, thread read-contract projection, and lane-owned route surface. No new app, shared service, or cross-lane API surface is introduced.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Current Context Holders

- `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts` already adds `is_deleted`, `deleted_at_utc`, and `deleted_by_user_id`, so feature `024` should consume the current lifecycle model rather than create a duplicate migration.
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` already selects lifecycle columns in the Knex store and already excludes deleted neighbors from active inbound identity resolution, but standard `listByTenant(...)` and `listNeighbors(...)` still return deleted rows.
- `InMemoryConnectShyftNeighborStore` already tracks deleted neighbor IDs for tests and active resolution, but it has no dedicated soft-delete command and still returns deleted records from standard list paths.
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` already uses `executePlatformMutation(...)` for auditable neighbor update and merge mutations, making that the correct existing audit seam for soft delete as well.
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts` currently reads only `cs_threads` data and has no deleted-neighbor enrichment, so standard thread responses cannot yet expose `neighbor_deleted` metadata or hide deleted-neighbor threads intentionally.
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts` already covers the deleted-neighbor inbound metadata case, which means inbound behavior mostly needs regression hardening instead of a new identity contract.

## Planned Contract Deltas

- Reuse the existing `cs_neighbors` lifecycle columns as the only deletion-state source of truth; no second lifecycle migration is planned.
- Add `softDeleteNeighbor({ tenantId, neighborId, actorUserId, irreversibleConfirmation })` to the neighbor store/service layer and make the Knex path transactional across neighbor lifecycle fields plus all related phone `is_active` updates.
- Add a dedicated success contract for first-time delete and idempotent repeated-delete responses, where repeated deletes return the preserved deleted metadata without emitting a new soft-delete audit event, while preserving business-refusal semantics for forbidden, unconfirmed, or not-found delete requests.
- Add `DELETE /api/v1/connectshyft/neighbors/:neighborId` as the only supported operational deletion endpoint for this feature, capability-gated to the tenant-privileged admin path and kept ConnectShyft-lane owned.
- Keep standard neighbor list/search flows active-only and keep deleted neighbor and deleted-neighbor thread detail accessible only through existing ConnectShyft detail routes when `includeDeleted=true` is supplied by a tenant-privileged admin/debug caller.
- Enrich thread summary/detail projections with `neighbor_deleted` and `neighbor_deleted_at_utc`, and exclude deleted-neighbor threads from normal inbox/detail flows.
- Preserve current active-only inbound identity behavior so deleted-only phone ownership creates a new neighbor instead of resurrecting the deleted one.
- Emit a dedicated neighbor soft-delete audit/outbox event through the existing platform mutation seam with actor, tenant, org-unit, and neighbor metadata.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/research.md](/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/data-model.md).
- Runtime and route contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/contracts/neighbor-soft-delete-admin-controls.md](/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/contracts/neighbor-soft-delete-admin-controls.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/024-neighbor-soft-delete-admin-controls/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. Design leaves shell, auth ownership, and shared-domain ingress unchanged.
- **Lane isolation preserved**: Pass. The design stays inside ConnectShyft route, neighbor, and read-contract modules plus existing shared helpers.
- **Routing delegation preserved**: Pass. No auth or platform-admin path ownership changes are introduced; the delete route remains under ConnectShyft.
- **Deployment topology preserved**: Pass. Design changes schema assumptions, service logic, projections, and tests only, and post-implementation validation still confirms host Nginx delegation, ConnectShyft API localhost-only binding on canonical port `3002`, shared Postgres connectivity, and unchanged runbook reproduction.
- **Database ownership preserved**: Pass. Existing lifecycle schema remains canonical under `shared/database/migrations`, and no lane-owned production migration path is introduced.
- **Security boundaries preserved**: Pass. Delete remains capability-gated, no public ingress changes are added, and deleted data remains limited to admin/debug access.
- **Workflow compliance**: Pass. The design slices map directly to the approved `024` spec and the planning input.
- **Acceptance criteria present**: Pass. The design includes validation for delete transaction behavior, read filtering, deleted-thread projection, inbound regression, API binding and port validation, shared Postgres connectivity, shared migration authority, and unchanged platform contracts.

## Implementation Slices

### Slice 1 - Transactional Neighbor Soft Delete

**Primary goal**: add the dedicated soft-delete mutation that marks neighbors deleted, deactivates phones, and preserves idempotent delete safety.

**Exact file targets**

- verification-only lifecycle context holders:
  - `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts`
  - `apps/connectshyft-api/src/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts`
  - `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`
- runtime:
  - `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`

**Required changes**

- Add a dedicated soft-delete store/service command for in-memory and Knex-backed neighbors.
- Reuse the existing lifecycle columns instead of creating a second deletion schema.
- Make the Knex mutation transactional across:
  - neighbor deleted-state fields
  - all associated phone `is_active = false` updates
- Preserve repeated delete attempts as idempotent no-op successes with the original deleted audit context intact and without creating an additional soft-delete audit event.
- Keep active inbound resolution behavior unchanged for already-deleted neighbors.

**Must hold constant**

- No physical deletion of neighbors, phones, threads, or messages.
- No restore or undo behavior.
- No phone reactivation as part of delete.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts`

**Commit checkpoint**

- Safe to commit once soft delete is transactional, phone rows deactivate reliably, and repeated deletes preserve existing deleted state without destructive side effects.

### Slice 2 - Standard Read Filtering and Deleted-Thread Projection

**Primary goal**: remove deleted neighbors from normal operational reads while preserving deleted-aware detail and thread metadata through the existing ConnectShyft detail routes when `includeDeleted=true`.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Required changes**

- Make standard neighbor list/search behavior active-only.
- Keep deleted neighbor and deleted-neighbor thread detail available only through existing ConnectShyft detail routes when `includeDeleted=true` is supplied by a tenant-privileged admin/debug caller.
- Enrich thread summary/detail responses with:
  - `neighbor_deleted`
  - `neighbor_deleted_at_utc`
- Exclude deleted-neighbor threads from standard inbox/detail flows.
- Preserve historical thread storage and admin/debug inspectability.

**Must hold constant**

- Existing inbox bucket semantics for non-deleted threads.
- Existing thread lifecycle states and action matrices.
- Existing active-neighbor resolution semantics for non-deleted identities.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/readContracts.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Commit checkpoint**

- Safe to commit once deleted neighbors disappear from standard reads, deleted-neighbor threads stay out of normal inbox/detail flows, and deleted-aware detail through existing ConnectShyft routes with `includeDeleted=true` exposes deletion metadata correctly.

### Slice 3 - Admin Delete Route, Audit Wiring, and Inbound Regression

**Primary goal**: expose the admin-only delete route, persist audit events through the existing mutation seam, and verify deleted-only phone history continues creating new neighbors.

**Exact file targets**

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- verification-only platform contract files:
  - `nginx/nginx.conf`
  - `docker-compose.example.yml`
  - `apps/connectshyft-api/Dockerfile.production`
  - `apps/admin-api/knexfile.js`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Required changes**

- Add `DELETE /api/v1/connectshyft/neighbors/:neighborId`.
- Require tenant-privileged admin capability and `irreversibleConfirmation = true`.
- Route the delete mutation through `executePlatformMutation(...)` with a dedicated soft-delete audit/outbox event payload.
- Return business refusals for:
  - missing confirmation
  - insufficient capability
  - neighbor not found
- Add regression coverage showing inbound SMS to deleted-only phone history creates a new neighbor and does not resurrect the deleted record.
- Reconfirm route ownership, host Nginx delegation, ConnectShyft API localhost-only binding on canonical port `3002`, shared Postgres connectivity, deployment runbook reproducibility, and shared migration authority remain unchanged.

**Must hold constant**

- `/api/v1/auth/*` and `/api/v1/platform/admin/*` ownership boundaries.
- Existing HTTP `200` business-refusal convention for ConnectShyft business errors.
- No new cross-lane service call or platform-admin dependency for delete.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`

**Commit checkpoint**

- Safe to commit once the delete route enforces admin capability plus confirmation, first-time successful deletes emit the audit event, and deleted-only inbound phone history still yields new-neighbor creation.
