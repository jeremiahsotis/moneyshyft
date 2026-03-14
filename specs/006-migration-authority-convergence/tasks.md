# Tasks: Migration Authority Convergence

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/`  
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/plan.md), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/spec.md), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/data-model.md), [contracts/reconciliation-cli.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/contracts/reconciliation-cli.md), [contracts/authorized-runner-and-guardrails.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/contracts/authorized-runner-and-guardrails.md), [quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md)

**Tests**: The feature spec does not require new automated test files. Validation is implementation-facing: source-only reconciliation output, admin-api build artifact checks, and PR/deploy guardrail review captured in `quickstart.md`.

**Organization**: Tasks are grouped by delivery slice so the feature can ship incrementally as 1) shared authority plus reconciliation, 2) authorized runner alignment, and 3) PR/deploy guardrails.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preserve the existing untracked convergence scaffolding and lock the implementation surfaces before editing target files.

- [X] T001 Review and preserve the existing untracked convergence scaffolding in `/Users/jeremiahotis/projects/connectshyft/shared/database`, `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js`, `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/migration-authority-convergence.md`, `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, and `/Users/jeremiahotis/projects/connectshyft/docs/DEPLOYMENT_CHECKLIST.md`, then record before-state evidence in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T002 Normalize the implementation checkpoints, source-only validation commands, and safety evidence placeholders in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the canonical naming and reconciliation foundations that all implementation slices depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 [P] Normalize the canonical override shape and logical-ID lookup fields in `/Users/jeremiahotis/projects/connectshyft/shared/database/reconciliation/migration-manifest-overrides.json`
- [X] T004 [P] Refactor the reconciliation data model scaffold in `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js` so logical IDs, source filenames, and ledger filenames are tracked separately before classification logic is finalized

**Checkpoint**: Canonical naming, override shape, and reconciliation data structures are ready for shared-authority promotion and runner alignment work.

---

## Phase 3: User Story 1 - Establish Shared Migration Authority and Reconciliation (Priority: P1) 🎯 MVP

**Goal**: Make `shared/database/migrations` the authoritative production migration source and make the reconciliation CLI accurately inventory and classify the full migration set without requiring a DB connection for source-only runs.

**Independent Test**: Run `node scripts/reconcile-shared-migrations.js --format table` and `node scripts/reconcile-shared-migrations.js --format json` from the repo root and verify that the full 60-migration shared authority is inventoried, `.ts` and `.js` names resolve to the same logical IDs, `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity` is surfaced as a verified manual-hotfix candidate when unrecorded, and `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index` remains `blocked` as inspection-required until operator review resolves it.

### Implementation for User Story 1

- [X] T005 [US1] Generate an ordered basename and content-hash inventory for `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/migrations`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/migrations`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations` and record it in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T006 [US1] Promote the 56 byte-identical admin/money/connect migrations from `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/migrations`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/migrations`, and `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations` into `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations` with preserved filenames and ordering
- [X] T007 [US1] Promote the 4 ConnectShyft-only migrations from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/migrations` into `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations` without renaming or reordering them
- [X] T008 [P] [US1] Verify `/Users/jeremiahotis/projects/connectshyft/shared/database/migrations` preserves ordered basenames and matching content hashes for the canonical 60-file set and record the result in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T009 [P] [US1] Update `/Users/jeremiahotis/projects/connectshyft/shared/database/reconciliation/migration-manifest-overrides.json` so `20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js` remains verified and `20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js` is represented as inspection-required under canonical production naming
- [X] T010 [US1] Implement `.ts` versus `.js` logical-ID normalization, canonical `.js` override lookup, and per-location filename reporting in `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js`
- [X] T011 [US1] Implement lazy `pg` loading, source-only execution paths, and inspection-required classification handling in `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js` so inventory runs do not require a root-level DB dependency when no ledger connection is requested
- [X] T012 [US1] Add machine-readable JSON output, exact `recordedLedgerName` reporting, explicit classification rendering, and suggestion-only mark-applied SQL output in `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js`
- [X] T013 [US1] Record the final source-only reconciliation commands, expected classifications, promotion integrity evidence, and manual-hotfix review checkpoints in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`

**Checkpoint**: Shared migration authority exists, the override manifest reflects the incident migrations safely, and the reconciliation CLI can classify the converged state without touching production.

---

## Phase 4: User Story 2 - Align the Authorized Runner to Shared Authority (Priority: P1)

**Goal**: Keep `admin-api` as the only authorized production migration runner while changing its packaged production migration input from lane-local migrations to shared authority.

**Independent Test**: Run the `admin-api` build flow and verify the packaged artifact contains `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/dist/shared/database/migrations`, `apps/admin-api/knexfile.js` points production migrations at that packaged shared path, and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/knexfile.js` plus `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/knexfile.js` still block production migration execution.

### Implementation for User Story 2

- [X] T014 [US2] Add `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/scripts/packageSharedMigrations.js` to produce runnable JavaScript shared migrations in `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/dist/shared/database/migrations`
- [X] T015 [US2] Update `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/package.json` so the build/package flow invokes `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/scripts/packageSharedMigrations.js` before the production artifact is used
- [X] T016 [US2] Update `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js` so production migrations read the packaged shared authority path while development remains lane-local
- [X] T017 [US2] Record the packaged shared-migration artifact expectations and single-runner validation against `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/knexfile.js`, `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/dist/shared/database/migrations`, and `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`

**Checkpoint**: `admin-api` remains the sole authorized production runner, but its production migration input is the packaged shared authority instead of lane-local `dist/migrations`.

---

## Phase 5: User Story 3 - Add PR and Deploy Guardrails (Priority: P2)

**Goal**: Make PR review and deployment documentation explicitly enforce reconciliation, shared-authority availability, and the no-production-SQL/no-ledger-write safety model.

**Independent Test**: Review the PR template and deploy docs and verify they require the `build -> reconcile manifests -> run shared migrations once -> deploy runtime containers -> smoke checks` order, require machine-enforced reconciliation output review, and explicitly forbid automatic production SQL execution or direct `public.knex_migrations` writes.

### Implementation for User Story 3

- [X] T018 [P] [US3] Update `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/migration-authority-convergence.md` with shared-authority promotion, reconciliation output, manual-hotfix review, authorized-runner confirmation, and fail-review conditions for `blocked`, `duplicate_across_apis`, `ready_to_promote_to_shared`, and `recorded_but_missing_from_source`
- [X] T019 [P] [US3] Update `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` with the required reconcile-before-run deployment order, `admin-api` shared-authority runner instructions, and explicit stop conditions for non-runnable reconciliation states including `recorded_but_missing_from_source`
- [X] T020 [P] [US3] Update `/Users/jeremiahotis/projects/connectshyft/docs/DEPLOYMENT_CHECKLIST.md` with reconcile-before-run, blocked-state stop conditions, explicit no-production-SQL / no-ledger-write reminders, and the requirement that `ready_to_run` is the only acceptable unrecorded execution state
- [X] T021 [US3] Align the CLI invocation, promotion-integrity evidence, and safety wording across `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/migration-authority-convergence.md`, `/Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, and `/Users/jeremiahotis/projects/connectshyft/docs/DEPLOYMENT_CHECKLIST.md` with `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js`
- [X] T022 [US3] Add a machine-enforced reconciliation guard command and CI/deploy gate description in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md` and `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/migration-authority-convergence.md` that consumes JSON reconciliation output and fails review or deploy when shared authority is incomplete

**Checkpoint**: PR and deploy surfaces now enforce the shared-authority workflow before any production migration step is considered.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the completed convergence slice without executing production migrations or writing to the production ledger.

- [X] T023 Run the source-only reconciliation commands documented in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md` and record the final table/json usage evidence in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T024 [P] Run a read-only ledger comparison using `/Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js` against an approved non-production or read-only database URL and record `recordedLedgerName` and classification evidence in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T025 Run the `admin-api` build-only packaging verification and record the packaged shared migration layout evidence in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T026 Run runtime-image or container filesystem validation for `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/dist/shared/database/migrations` and record the result in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T027 [P] Record Nginx routing delegation validation for `/api/v1/auth/*`, `/api/v1/platform/admin/*`, and lane-local `/api/*` ownership in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T028 [P] Record localhost binding and canonical port validation for `admin-api`, `money-api`, and `connect-api` in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T029 [P] Record shared Postgres connectivity and single authorized runner validation in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T030 Record reproducible deployment runbook validation for shared migration authority in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md`
- [X] T031 Record final safety evidence in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md` that no production migrations were executed, `public.knex_migrations` was not modified, and no production SQL was applied
- [X] T032 Record the final touched-file and scaffolding-preservation audit in `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md` to confirm the existing untracked convergence work was extended rather than overwritten

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can begin immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user-story work.
- **Phase 3: User Story 1** depends on Phase 2 and is the MVP because shared authority plus reconciliation is the core convergence outcome.
- **Phase 4: User Story 2** depends on User Story 1 because the authorized runner must consume the promoted shared authority and the finalized reconciliation naming model.
- **Phase 5: User Story 3** depends on User Story 1 and User Story 2 because guardrails must describe the implemented CLI and runner behavior.
- **Phase 6: Polish** depends on all prior phases.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the authoritative migration set plus working reconciliation tooling.
- **US2 (P1)**: Starts after US1 because the runner change must point at the promoted shared authority, not a partial or unstable migration directory.
- **US3 (P2)**: Starts after US1 and US2 because the docs and PR template must reflect the finished reconciliation and runner contract.

### Recommended Completion Order

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1
4. Phase 4: US2
5. Phase 5: US3
6. Phase 6: Polish

---

## Parallel Execution Examples

### Foundational Phase

```bash
Task: "T003 Normalize the canonical override shape and logical-ID lookup fields in /Users/jeremiahotis/projects/connectshyft/shared/database/reconciliation/migration-manifest-overrides.json"
Task: "T004 Refactor the reconciliation data model scaffold in /Users/jeremiahotis/projects/connectshyft/scripts/reconcile-shared-migrations.js so logical IDs, source filenames, and ledger filenames are tracked separately before classification logic is finalized"
```

### User Story 1

```bash
Task: "T005 Generate an ordered basename and content-hash inventory for the admin/money/connect migration sources and record it in /Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md"
Task: "T009 Update /Users/jeremiahotis/projects/connectshyft/shared/database/reconciliation/migration-manifest-overrides.json so 20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity.js remains verified and 20260311103000_add_connectshyft_neighbor_canonical_phone_lookup_index.js is inspection-required under canonical production naming"
```

### User Story 3

```bash
Task: "T018 Update /Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/migration-authority-convergence.md with shared-authority promotion, reconciliation output, manual-hotfix review, authorized-runner confirmation, and fail-review conditions"
Task: "T019 Update /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md with the required reconcile-before-run deployment order, admin-api shared-authority runner instructions, and explicit stop conditions"
Task: "T020 Update /Users/jeremiahotis/projects/connectshyft/docs/DEPLOYMENT_CHECKLIST.md with reconcile-before-run, blocked-state stop conditions, and explicit no-production-SQL / no-ledger-write reminders"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate the source-only reconciliation flow before changing the runner.

### Incremental Delivery

1. Deliver US1 to establish the authoritative shared migration set and a safe reconciliation CLI.
2. Deliver US2 to align the existing `admin-api` runner with the new shared authority.
3. Deliver US3 to enforce the implemented workflow in PR and deployment surfaces.
4. Finish with Phase 6 validation and safety evidence capture.

### Parallel Team Strategy

1. One developer can handle `shared/database/migrations` promotion while another handles override manifest normalization after Phase 2.
2. After US1 stabilizes, one developer can implement the admin-api packaging script while another prepares the PR/deploy guardrail updates.
3. Serialize edits to `/Users/jeremiahotis/projects/connectshyft/specs/006-migration-authority-convergence/quickstart.md` to avoid conflicts during validation recording.

---

## Notes

- `[P]` marks tasks that can proceed in parallel because they target different files with no incomplete upstream dependency.
- Every task preserves the single authorized production runner rule and avoids production migration execution.
- No task writes to `public.knex_migrations` or executes production SQL.
- API-local migration folders remain present during convergence and are treated as non-authoritative comparison inputs only.
- The suggested MVP scope is **User Story 1 only**.
