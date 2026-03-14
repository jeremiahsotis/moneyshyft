# Spec - Migration Authority Convergence

Status: Ready for Speckit

## Governing contracts

- `architecture/database/shared-migration-authority-contract.md`
- `architecture/database/migration-reconciliation-model.md`

## Supporting files required

- `specs/migration-authority-convergence/bootstrap-prompts.md`
- `specs/migration-authority-convergence/implementation-checklist.md`
- `specs/migration-authority-convergence/manual-hotfix-reconciliation.md`
- `.github/pull_request_template/migration-authority-convergence.md`

## Problem statement

Production migration authority is centralized, but migration files are still distributed across API lanes. This allows runtime code to depend on schema changes that the authorized production runner cannot see.

Current example:
- `connect-api` runtime required ConnectShyft neighbor phone canonical identity columns
- the migration existed in `connect-api`
- `connect-api` was blocked from production migration execution
- `admin-api` was the only authorized runner
- `admin-api` did not contain that migration
- production schema drifted and runtime failed

## Outcome

Create a shared migration authority that:
- inventories `admin-api`, `money-api`, and `connect-api` migration sets
- promotes production-relevant migrations into `shared/database/migrations`
- compares source state to `public.knex_migrations`
- explicitly handles manual hotfix reconciliation
- preserves one authorized production runner for now

## Scope

In scope:
- `shared/database/migrations`
- `shared/database/reconciliation/migration-manifest-overrides.json`
- migration reconciliation tooling
- promotion of production-relevant migrations into shared authority
- updating the authorized production runner to read shared authority
- PR/deploy guardrails

Out of scope:
- running production migrations automatically from Speckit
- direct mutation of `public.knex_migrations`
- production SQL execution
- runtime feature redesign
- unrelated infra cleanup

## Functional requirements

### FR-1 Shared migration authority
A shared migration directory must exist and become the authoritative production source.

### FR-2 Reconciliation tooling
A script must inventory:
- `apps/admin-api/src/migrations`
- `apps/moneyshyft-api/src/migrations`
- `apps/connectshyft-api/src/migrations`
- `shared/database/migrations`
- `public.knex_migrations`

### FR-3 Classification output
The reconciliation script must classify each migration as:
- `recorded_and_present`
- `duplicate_across_apis`
- `ready_to_promote_to_shared`
- `ready_to_run`
- `manual_hotfix_needs_mark_applied`
- `recorded_but_missing_from_source`
- `blocked`

### FR-4 Manual hotfix support
The system must support verified manual-hotfix overrides and produce mark-applied SQL suggestions instead of rerunning those migrations.

### FR-5 Authorized runner alignment
The authorized production migration runner must read from shared authority, not only API-local migration folders.

### FR-6 Guardrails
PR and deployment guardrails must prevent runtime code from depending on migrations unavailable to the authorized runner.

## Current incident requirements

### CIR-1 Current manual hotfix
Reconciliation must explicitly account for:
- `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js`

### CIR-2 Current index migration
Reconciliation must explicitly inspect:
- `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js`

## Deliverables

- `shared/database/migrations`
- `shared/database/reconciliation/migration-manifest-overrides.json`
- `scripts/reconcile-shared-migrations.js`
- updated authorized runner configuration
- enforced PR template
- reconciliation docs and checklists

## Acceptance criteria

- shared migration authority exists
- reconciliation script inventories all three APIs plus shared authority and production ledger
- manual hotfix overrides are supported
- production-required migrations are no longer available only inside runtime APIs
- current ConnectShyft migration incident is representable and reconcilable by the toolchain
