# Implementation Plan: ConnectShyft Duplicate Phone Uniqueness Enforcement

**Branch**: `023-duplicate-handling-and-phone-uniqueness-enforcement` | **Date**: 2026-03-18 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/spec.md)
**Input**: Feature specification from `/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/spec.md`

## Summary

Implement feature `023` by blocking duplicate current phone assignments before ConnectShyft neighbor writes commit, preserving the existing `multiple_matches` ambiguity result when legacy duplicate data already exists, and adding a migration-backed uniqueness safety net that does not auto-resolve or silently rewrite those legacy duplicates. The current `neighbors.ts` create and update flows normalize phones but never check cross-neighbor ownership, the canonical `normalized_e164` lookup index is non-unique, and `identityResolver.ts` already surfaces ambiguity for active duplicate matches. This plan closes the write-time corruption gap with canonical duplicate-owner checks, a standardized duplicate refusal, and a forward-enforced partial unique index strategy that coexists with tolerated legacy duplicate records.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, `pg`, Jest/ts-jest, shared `domains/communication` phone normalization, ConnectShyft neighbor service/store modules, existing `identityBoundary.ts` and `identityResolver.ts`  
**Storage**: Shared PostgreSQL `connectshyft` schema with canonical phone columns in `cs_neighbor_phones`, canonical production migration authority under `shared/database/migrations`, and lane-local migration mirrors for local build/test compatibility  
**Testing**: `npm run build` in `apps/connectshyft-api`, targeted Jest suites for neighbor service/store, identity resolver, route refusal behavior, and migration SQL shape  
**Target Platform**: ConnectShyft API lane behind host-managed Nginx, Dockerized Node runtime, and shared host-managed PostgreSQL  
**Project Type**: Monorepo backend lane feature with shared schema authority, route/domain modules, and Jest-based regression coverage  
**Performance Goals**: Keep duplicate refusal within the same request that performs the write, preserve indexed canonical phone lookups, add no network calls, and keep identity resolution deterministic in one lookup pass  
**Constraints**: Compare only canonical normalized E.164 values; no raw string comparison; no silent override, merge, or heuristic winner selection; legacy duplicates remain stored and readable; soft-deleted neighbors do not count toward uniqueness; no background cleanup; `admin-api` remains the sole authorized production migration runner  
**Scale/Scope**: One shared migration plus mirror and tests, one current-owner query helper in the neighbor store, one standardized duplicate refusal across create and update flows, one identity-resolution regression pass, and focused route contract verification for neighbor refusal semantics

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Platform shell authority**: Pass. No changes affect `admin-web`, `admin-api`, shared auth ownership, or shell routing.
- **Lane isolation preserved**: Pass. Runtime changes stay within ConnectShyft neighbor persistence, ConnectShyft route refusal shaping, and shared migration authority only.
- **Routing delegation preserved**: Pass. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain `admin-api` owned; ConnectShyft neighbor routes remain lane-owned.
- **Deployment topology preserved**: Pass. No Nginx, port, Docker binding, or static frontend changes are introduced.
- **Database ownership preserved**: Pass. Shared Postgres remains the storage model, and the schema change is routed through `shared/database/migrations` while `admin-api` remains the authorized production executor.
- **Security boundaries preserved**: Pass. No public API surface, session behavior, or cross-lane ingress behavior changes.
- **Workflow compliance**: Pass. The plan is derived directly from the approved `023` spec and stays within duplicate prevention plus deterministic ambiguity handling.
- **Acceptance criteria present**: Pass. The plan includes schema, service, route, and identity-resolution validation plus unchanged platform-contract verification.

## Project Structure

### Documentation (this feature)

```text
specs/023-duplicate-handling-and-phone-uniqueness-enforcement/
├── 01-specify.md
├── 02-plan.md
├── 03-tasks.md
├── 04-implement.md
├── 05-testing.md
├── 06-pr-template.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── duplicate-phone-enforcement.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

### Source Code (repository root)

```text
shared/database/migrations/
└── *_connectshyft_neighbor_phone_uniqueness*.ts

apps/connectshyft-api/
├── src/
│   ├── config/
│   │   └── knex.ts
│   ├── migrations/
│   │   ├── *_connectshyft_neighbor_phone_uniqueness*.ts
│   │   └── __tests__/
│   │       ├── connectShyftNeighborCanonicalPhoneLookupMigration.test.ts
│   │       ├── connectShyftNeighborPhoneUniquenessMigration.test.ts
│   │       └── connectShyftNeighborsMigration.test.ts
│   ├── modules/connectshyft/
│   │   ├── __tests__/
│   │   │   ├── identityResolver.test.ts
│   │   │   └── neighbors.test.ts
│   │   ├── identityResolver.ts
│   │   └── neighbors.ts
│   └── routes/api/v1/
│       ├── __tests__/
│       │   ├── connectshyft.identity-match.test.ts
│       │   ├── connectshyft.neighbors.test.ts
│       │   └── connectshyft.provider-registry.guardrails.test.ts
│       └── connectshyft.ts
├── knexfile.js
└── Dockerfile.production

apps/admin-api/
└── knexfile.js

nginx/nginx.conf
docker-compose.example.yml
docs/PRODUCTION_DEPLOYMENT_GUIDE.md
```

**Structure Decision**: This is a backend-only ConnectShyft lane feature. Runtime behavior stays inside `apps/connectshyft-api/src/modules/connectshyft` and the existing ConnectShyft route surface, while the schema change lands through canonical shared migration authority and is mirrored into the lane-local migration tree for local development and test compatibility. The identity resolver remains the existing replaceable boundary; the primary new behavior is write-time duplicate prevention plus refusal shaping, not a new identity engine.

## Complexity Tracking

No constitution exceptions are required for this feature.

## Current Context Holders

- `shared/database/migrations/20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.ts` creates the current non-unique `(tenant_id, normalized_e164, neighbor_id, sort_order, id)` lookup index, so canonical lookup exists today but write-time uniqueness does not.
- `shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state.ts` already provides `cs_neighbors.is_deleted`, so deleted-neighbor exclusion can rely on existing lifecycle state rather than inventing a new delete model.
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` normalizes phones and persists them through `createNeighbor`, `createNeighborFromInbound`, and `updateNeighbor`, but it never checks whether another current non-deleted neighbor already owns the same normalized phone.
- `KnexConnectShyftNeighborStore.updateNeighbor(...)` deletes and reinserts the entire phone set, so duplicate-prevention must run before destructive replacement or else re-map any DB safety-net violation back to the same business refusal.
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` already returns business refusals for neighbor create and update flows through `buildNeighborRefusalData(...)`, and `updateNeighborWithSideEffects(...)` must propagate any new duplicate refusal without turning it into a side-effect failure.
- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` already converts ambiguous phone matches into `multiple_matches`; this feature must preserve that outcome and only harden regression coverage around it.
- `InMemoryConnectShyftNeighborStore` currently has no deleted-neighbor state or duplicate-owner lookup helper, so unit-test support needs either a narrow internal test seam or explicit mocked-store coverage for deleted and grandfathered duplicate cases.

## Planned Contract Deltas

- Add a standardized duplicate refusal with code `CONNECTSHYFT_PHONE_DUPLICATE` and refusal reason `duplicate_phone` for any create, update, or replacement write that attempts to assign a canonical phone already owned by another current non-deleted neighbor.
- Extend neighbor refusal data so duplicate refusals carry `data.reason = 'duplicate_phone'` plus a `phones` field error, while keeping existing business-refusal HTTP semantics unchanged.
- Add a reusable current-owner lookup helper in the neighbor store that:
  - filters `cs_neighbor_phones.is_active = true`
  - filters parent `cs_neighbors.is_deleted = false`
  - scopes by `tenant_id`
  - ignores the current `neighborId` during self-retaining updates
- Add a narrow phone-row uniqueness eligibility marker and a partial unique index over enforced current canonical phone claims so new clean writes gain a DB safety net without auto-resolving legacy duplicate rows that must remain ambiguous until cleanup.
- Map unique-constraint races from that partial unique index back to the same `CONNECTSHYFT_PHONE_DUPLICATE` refusal so service-layer preflight and DB safety net stay behaviorally identical.
- Preserve `resolveSubjectByContactPoint(...)` and `IDENTITY_MATCH_AMBIGUOUS` semantics: multiple current eligible matches remain a hard refusal, deleted-only matches remain excluded, and no silent fallback path is introduced.
- Terminology note: the spec's user-facing term is `ambiguity refusal`. Existing internals may continue to use `multiple_matches` as the resolver outcome and `IDENTITY_MATCH_AMBIGUOUS` as the established refusal semantic, but all three refer to the same deterministic no-selection outcome.

## Phase 0 Research Output

- Research findings are captured in [/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/research.md](/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/research.md).
- No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1 Design Output

- Data model is captured in [/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/data-model.md).
- Boundary and refusal contract is captured in [/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/contracts/duplicate-phone-enforcement.md](/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/contracts/duplicate-phone-enforcement.md).
- Execution and verification flow is captured in [/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/023-duplicate-handling-and-phone-uniqueness-enforcement/quickstart.md).

## Post-Design Constitution Check

- **Platform shell authority**: Pass. Design leaves shell, auth authority, and shared-domain ingress behavior untouched.
- **Lane isolation preserved**: Pass. Design stays inside the ConnectShyft backend lane and canonical shared migration authority only.
- **Routing delegation preserved**: Pass. No auth or platform-admin route behavior changes are introduced.
- **Deployment topology preserved**: Pass. Design changes schema, service logic, and tests only.
- **Database ownership preserved**: Pass. Shared Postgres compatibility remains intact and the migration path stays under `shared/database/migrations` with `admin-api` still the only production executor.
- **Security boundaries preserved**: Pass. Duplicate refusal logic and identity ambiguity checks do not expose new ingress or public port behavior.
- **Workflow compliance**: Pass. The design slices map directly to the approved `023` spec.
- **Acceptance criteria present**: Pass. The design includes schema validation, deterministic write refusal validation, ambiguity regression validation, and unchanged platform-contract verification.

## Implementation Slices

### Slice 1 - Shared Migration and Forward Uniqueness Safety Net

**Primary goal**: add the narrow schema support needed for a DB safety net without auto-resolving or silently hiding legacy duplicate phone assignments.

**Exact file targets**

- `shared/database/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
- `apps/connectshyft-api/src/migrations/*_connectshyft_neighbor_phone_uniqueness*.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts`
- `apps/connectshyft-api/src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Required changes**

- Add a shared migration that introduces a narrow phone-row uniqueness eligibility marker for canonical phone assignments and a partial unique index over enforced current rows.
- Backfill current phone rows so legacy duplicate sets remain stored but are explicitly grandfathered rather than auto-merged, auto-deleted, or re-assigned.
- Ensure deleted and inactive phone rows are excluded from the uniqueness safety net without removing them from normal historical storage.
- Mirror the shared migration into the ConnectShyft lane-local migration tree for local tooling compatibility and add SQL-shape regression tests.

**Must hold constant**

- `normalized_e164` remains the canonical comparison value.
- Shared migration authority remains canonical; no lane-local-only production schema path is introduced.
- The migration must not choose a canonical survivor or merge duplicate neighbor records.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts src/migrations/__tests__/connectShyftNeighborCanonicalPhoneLookupMigration.test.ts src/migrations/__tests__/connectShyftNeighborsMigration.test.ts`

**Commit checkpoint**

- Safe to commit once the shared migration, mirror, and migration tests agree on the new grandfathering marker and partial unique index shape.

### Slice 2 - Store and Service Duplicate Refusal Enforcement

**Primary goal**: make every relevant neighbor write refuse duplicate current phone ownership deterministically before mutating rows, while mapping DB races back to the same refusal.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Required changes**

- Add a reusable duplicate-owner lookup helper for both in-memory and Knex-backed stores.
- Run duplicate-owner checks after normalization and before `createNeighbor`, `createNeighborFromInbound`, `updateNeighbor`, and any dedicated phone add or replace persistence path commits.
- Allow self-retaining updates by excluding the current `neighborId` from duplicate detection.
- Standardize a new refusal with:
  - code `CONNECTSHYFT_PHONE_DUPLICATE`
  - reason `duplicate_phone`
  - `phones` field-error data for caller surfaces
- Map DB unique-index violations for the new partial unique index back to the same refusal so concurrent writes behave the same as preflight checks.
- Ensure `updateNeighborWithSideEffects(...)` propagates duplicate refusal unchanged instead of masking it as a side-effect outage.

**Must hold constant**

- Existing phone normalization rules and phone-required validation.
- Existing business-refusal HTTP shape for ConnectShyft neighbor endpoints.
- Existing generic neighbor ID conflict and persistence-unavailable behavior outside duplicate-phone scenarios.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`

**Commit checkpoint**

- Safe to commit once create, update, and inbound-create paths all return the same duplicate refusal and self-retaining updates still succeed.

### Slice 3 - Identity Ambiguity Preservation and Final Verification

**Primary goal**: keep identity resolution deterministic when legacy duplicates remain and verify that deleted-neighbor reuse plus duplicate refusal do not reintroduce silent fallback behavior.

**Exact file targets**

- `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/identityResolver.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`
- verification-only platform contract files:
  - `nginx/nginx.conf`
  - `docker-compose.example.yml`
  - `apps/connectshyft-api/Dockerfile.production`
  - `apps/admin-api/knexfile.js`
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Required changes**

- Preserve `resolveSubjectByContactPoint(...)` return semantics: `single_match`, `no_match`, and `multiple_matches`.
- Add regression coverage proving:
  - multiple current duplicate owners still return ambiguity
  - deleted-only matches return `no_match`
  - a mix of deleted and one current owner resolves to the current owner
  - no write path or identity path silently falls back after ambiguity
- Reconfirm that the duplicate-prevention feature does not alter route ownership, Nginx delegation, Docker binding, or production migration authority contracts.

**Must hold constant**

- Existing `IDENTITY_MATCH_AMBIGUOUS` business meaning.
- Existing inbound/provider guardrail refusal behavior outside duplicate-owner hardening.
- No merge tooling, cleanup tooling, or PeopleCore integration.

**Stop point**

- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npm run build`
- `cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api && npx jest --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts src/modules/connectshyft/__tests__/identityResolver.test.ts src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts src/migrations/__tests__/connectShyftNeighborPhoneUniquenessMigration.test.ts`

**Commit checkpoint**

- Safe to commit once duplicate writes fail deterministically, legacy duplicates still surface ambiguity, deleted-neighbor reuse works, and platform-contract verification shows no routing or migration-authority drift.
