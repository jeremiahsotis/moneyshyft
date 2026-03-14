# Research - Migration Authority Convergence

## Decision 1: Authoritative shared migrations remain source-controlled TypeScript

- Decision: Store the authoritative shared migration set in `shared/database/migrations` as TypeScript source files that preserve the existing migration basenames and ordering, then package them into JavaScript for the authorized production runner.
- Rationale: The repo's canonical migration sources already live in TypeScript under each API lane, and migration tests import those sources directly. Keeping the shared authority in TypeScript avoids creating a second JS-only source of truth in git while still supporting production's JS-based Knex runner.
- Alternatives considered:
  - Store shared migrations as `.js` only. Rejected because it would split source authority from the current testable TypeScript migration sources and complicate local maintenance.
  - Keep lane-local folders as long-term authorities. Rejected because it preserves the current production drift failure mode.

## Decision 2: Promote the full current unique migration set, not only the incident files

- Decision: Promote all 60 unique migration files into shared authority during convergence.
- Rationale: The current repo contains 56 common migrations that are byte-identical across `admin-api`, `money-api`, and `connect-api`, plus 4 ConnectShyft-only migrations. Repointing the authorized runner to shared authority without the full set risks ledger/source divergence and incomplete historical representation.
- Alternatives considered:
  - Promote only the two current incident migrations. Rejected because it addresses the immediate gap but leaves the shared authority incomplete.
  - Promote only the four ConnectShyft-only migrations. Rejected because the runner will still need the full authoritative set once shared authority becomes the production source of truth.

## Decision 3: Reconciliation must compare logical migration IDs, not only literal filenames

- Decision: Reconciliation should normalize each migration to a logical ID based on the basename without extension, while still reporting actual filenames per location and emitting canonical production names as `.js` when suggesting mark-applied SQL.
- Rationale: API-local sources are `.ts`, while production ledger entries and manual-hotfix references use `.js`. Literal filename comparison produces false mismatches and causes override lookup drift.
- Alternatives considered:
  - Compare filenames literally. Rejected because `.ts` and `.js` variants of the same migration would be treated as different migrations.
  - Rename all lane migrations to `.js`. Rejected because it would be invasive and unnecessary.

## Decision 4: Manual hotfix overrides remain explicit and verified-only

- Decision: Keep `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity` as the only verified manual-hotfix override initially, and treat `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index` as a required inspection target that is not auto-verified.
- Rationale: The supporting docs explicitly state that the first migration was manually patched in production, while the second requires verification before deciding between mark-applied and normal execution through the authorized runner.
- Alternatives considered:
  - Mark both incident migrations as verified hotfixes immediately. Rejected because the index migration is explicitly conditional on production verification.
  - Omit the second migration from reconciliation special handling. Rejected because the spec requires explicit inspection.

## Decision 5: Preserve `admin-api` as the only production runner for this phase

- Decision: Update the existing `admin-api` production runner to read shared authority rather than introducing a new production runner in this convergence phase.
- Rationale: This satisfies the constitution's single-runner rule and the feature spec's requirement to preserve one authorized production runner while minimizing deployment workflow churn.
- Alternatives considered:
  - Introduce a dedicated `migration-runner` app now. Rejected because it belongs to the separate migration-runner phase and is not needed for convergence.
  - Allow lane APIs to run production migrations. Rejected because it violates the current governance model.

## Decision 6: Guardrails should fail before deploy if shared authority is incomplete

- Decision: PR and deployment guardrails should require reconciliation output before the production migration step and should block schema-dependent runtime changes that are not represented in shared authority.
- Rationale: The incident occurred because runtime schema dependence outpaced the authorized runner's visible migration set. Guardrails must check authority availability, not just lane-local existence.
- Alternatives considered:
  - Rely on documentation only. Rejected because the failure mode is procedural and recurs without automation.
  - Enforce only at runtime deployment. Rejected because PR-time feedback is cheaper and safer.

## Decision 7: Source-only reconciliation must work without root-level DB dependencies

- Decision: Make `scripts/reconcile-shared-migrations.js` usable in source-only mode without requiring `pg` at the repo root, and add a machine-readable output mode in addition to human-readable output.
- Rationale: FR-2 and FR-3 require inventory/classification even when no production ledger connection is available. The current script eagerly requires `pg`, which fails in a repo-root invocation before any DB access is attempted.
- Alternatives considered:
  - Add `pg` to the root package only. Rejected because source-only reconciliation should not require DB driver installation when no DB access is used.
  - Require a DB connection for every run. Rejected because it blocks local planning and PR guardrails.

## Clarifications Resolved

- Shared authority population scope: resolved to the current 60 unique migrations.
- Canonical naming strategy: resolved to logical-ID normalization with `.js` production rendering.
- Authorized runner strategy: resolved to `admin-api` with shared authority input.
- Manual hotfix handling: resolved to verified-only overrides plus explicit inspection targets.
- Guardrail scope: resolved to both PR-time and deploy-time authority checks.
