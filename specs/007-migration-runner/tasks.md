# Tasks: Dedicated Migration Runner

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/007-migration-runner/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`

**Tests**: No new automated test files are required by the spec. Validation is performed through Docker/image inspection, direct CLI wiring checks, and documentation evidence.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Phase 1: Setup

**Purpose**: Create the minimal dedicated-runner file set and validation scaffold.

- [X] T001 Create the dedicated runner package boundary in `apps/migration-runner/package.json`
- [X] T002 Create the dedicated runner Knex boundary file in `apps/migration-runner/knexfile.js`
- [X] T003 Create the dedicated runner container boundary file in `apps/migration-runner/Dockerfile`
- [X] T004 Capture the dedicated runner validation scaffold and future-cutover context in `specs/007-migration-runner/quickstart.md`

---

## Phase 2: Foundational

**Purpose**: Lock the shared-authority-only execution contract before user-story work begins.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Define the runtime dependency set and one-shot migration script in `apps/migration-runner/package.json`
- [X] T006 Define `DATABASE_URL`, `knex_migrations`, and shared-authority-only migration config in `apps/migration-runner/knexfile.js`
- [X] T007 Define the flattened runtime image copy strategy in `apps/migration-runner/Dockerfile` so `knexfile.js` lives at `/app/knexfile.js` and shared authority lives at `/app/shared/database/migrations`
- [X] T008 Record unchanged production authority and runtime API boundary rules in `specs/007-migration-runner/quickstart.md`

**Checkpoint**: The dedicated runner shape, dependency strategy, and boundary rules are locked.

---

## Phase 3: User Story 1 - Create the Dedicated One-Shot Runner (Priority: P1) 🎯 MVP

**Goal**: Deliver a minimal JS-only `migration-runner` app that can invoke `knex migrate:latest`, serves no HTTP traffic, and exits.

**Independent Test**: `apps/migration-runner/` contains only `package.json`, `knexfile.js`, and `Dockerfile`; the package script and container command use `node -r ts-node/register ... migrate:latest`; no `src/`, `dist/`, or server entrypoint is introduced.

- [X] T009 [P] [US1] Implement runtime dependencies and the explicit migration command in `apps/migration-runner/package.json`
- [X] T010 [P] [US1] Implement the production Knex configuration that reads only `shared/database/migrations` in `apps/migration-runner/knexfile.js`
- [X] T011 [US1] Implement the one-shot no-HTTP container command in `apps/migration-runner/Dockerfile`
- [X] T012 [US1] Document the exact runner command and no-server app shape in `specs/007-migration-runner/quickstart.md`

**Checkpoint**: The repo contains a minimal dedicated runner app with an explicit one-shot command and no runtime server behavior.

---

## Phase 4: User Story 2 - Make Path Resolution and Packaging Verifiable (Priority: P2)

**Goal**: Ensure the runner image resolves the shared migration authority from the actual image filesystem and has the runtime dependencies needed to execute shared TypeScript migrations.

**Independent Test**: A built runner image contains `/app/knexfile.js` and `/app/shared/database/migrations`; `apps/migration-runner/knexfile.js` resolves that path via `__dirname`; `npm ci --omit=dev` leaves `ts-node/register` available; no lane-local migration directory is part of the execution path.

- [X] T013 [US2] Harden `apps/migration-runner/knexfile.js` to resolve `shared/database/migrations` via `path.join(__dirname, 'shared', 'database', 'migrations')`, fail fast on missing `DATABASE_URL` or missing migration directory, and document that this path is valid only when `knexfile.js` is copied to `/app/knexfile.js`
- [X] T014 [US2] Update `apps/migration-runner/Dockerfile` to copy `apps/migration-runner/package*.json` and `apps/migration-runner/knexfile.js` into `/app/`, copy `shared/database` into `/app/shared/database`, and install only runtime dependencies required by `ts-node/register`
- [X] T015 [P] [US2] Add image-layout, no-HTTP, and CLI-wiring validation commands to `specs/007-migration-runner/quickstart.md`
- [X] T016 [P] [US2] Update `.github/pull_request_template/migration-runner.md` to require evidence that `/app/knexfile.js` and `/app/shared/database/migrations` exist in the built image and that the runner reads shared authority only with no lane-local migration path present

**Checkpoint**: The dedicated runner path resolution and packaging strategy are explicit, image-relative, and verifiable.

---

## Phase 5: User Story 3 - Preserve Current Ownership and Cutover Boundaries (Priority: P3)

**Goal**: Document the runner as phase-2 execution mechanics only, keep `admin-api` as the current authorized runner, and prove runtime APIs remain blocked from production migration execution.

**Independent Test**: The dedicated-runner docs and PR template state that `admin-api` remains the current production runner, `migration-runner` is future-ready only, deploy order still runs reconciliation and `admin-api` first, and runtime APIs remain blocked from production migrations.

- [X] T017 [P] [US3] Document that `admin-api` remains the current authorized runner and `migration-runner` is the future authorized runner in `specs/007-migration-runner/quickstart.md`
- [X] T018 [P] [US3] Update `.github/pull_request_template/migration-runner.md` to require confirmation that this PR does not redesign migration ownership, does not cut production execution over from `admin-api`, and does not enable runtime API production migrations
- [X] T019 [US3] Verify the production migration boundary remains unchanged in `apps/admin-api/knexfile.js`, `apps/moneyshyft-api/knexfile.js`, and `apps/connectshyft-api/knexfile.js`, and record that evidence in `specs/007-migration-runner/quickstart.md`
- [X] T020 [US3] Record the phase-2-only deploy sequence and non-goals in `specs/007-migration-runner/quickstart.md`

**Checkpoint**: The current-vs-future runner boundary is explicit and runtime APIs remain outside production migration authority.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete implementation evidence and constitution-required validation tasks without running production migrations.

- [X] T021 [P] Run the repo-root image build validation for `apps/migration-runner/Dockerfile` and record the result in `specs/007-migration-runner/quickstart.md`
- [X] T022 [P] Run the container filesystem validation for `/app/knexfile.js`, `/app/shared/database/migrations`, and the absence of lane-local migration/runtime app paths, and record the result in `specs/007-migration-runner/quickstart.md`
- [X] T023 Run a container-level `ts-node/register` validation that loads a shared TypeScript migration from `/app/shared/database/migrations` and record the result in `specs/007-migration-runner/quickstart.md`
- [X] T024 [P] Validate that host-Nginx routing ownership remains unchanged and record the result in `specs/007-migration-runner/quickstart.md`
- [X] T025 [P] Validate that runtime API binding and canonical localhost ports remain unchanged and record the result in `specs/007-migration-runner/quickstart.md`
- [X] T026 [P] Validate shared Postgres connectivity assumptions and unchanged current migration ownership in `specs/007-migration-runner/quickstart.md`
- [X] T027 Verify the reproducible deployment runbook sequence `build -> reconcile -> run once from admin-api -> deploy runtime containers -> smoke` in `specs/007-migration-runner/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Starts after Foundational completion.
- **User Story 2 (Phase 4)**: Starts after Foundational completion and depends on the basic app files from User Story 1.
- **User Story 3 (Phase 5)**: Starts after Foundational completion and depends on the runner boundary and execution shape defined in User Story 1.
- **Polish (Phase 6)**: Starts after the desired user stories are complete.

### User Story Dependencies

- **US1**: No dependency on later stories; this is the MVP slice.
- **US2**: Depends on the runner app from US1 existing.
- **US3**: Depends on the runner app shape from US1 and the path/packaging evidence from US2.

### Parallel Opportunities

- `T009` and `T010` can run in parallel because they touch different files.
- `T015` and `T016` can run in parallel after `T013` and `T014`.
- `T017` and `T018` can run in parallel because they touch different files.
- `T021`, `T022`, `T024`, `T025`, and `T026` can run in parallel during final validation once implementation is complete.

---

## Parallel Example: User Story 1

```bash
Task: "Implement runtime dependencies and the explicit migration command in apps/migration-runner/package.json"
Task: "Implement the production Knex configuration that reads only shared/database/migrations in apps/migration-runner/knexfile.js"
```

## Parallel Example: User Story 2

```bash
Task: "Add image-layout, no-HTTP, and CLI-wiring validation commands to specs/007-migration-runner/quickstart.md"
Task: "Update .github/pull_request_template/migration-runner.md to require evidence that /app/knexfile.js and /app/shared/database/migrations exist in the built image and that the runner reads shared authority only with no lane-local migration path present"
```

## Parallel Example: User Story 3

```bash
Task: "Document that admin-api remains the current authorized runner and migration-runner is the future authorized runner in specs/007-migration-runner/quickstart.md"
Task: "Update .github/pull_request_template/migration-runner.md to require confirmation that this PR does not redesign migration ownership, does not cut production execution over from admin-api, and does not enable runtime API production migrations"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate that the runner app is JS-only, one-shot, and serverless

### Incremental Delivery

1. Deliver US1 to create the dedicated runner app
2. Deliver US2 to make image layout, path resolution, and runtime dependencies verifiable
3. Deliver US3 to lock the current-vs-future runner boundary and PR guardrails
4. Finish with the Phase 6 validation evidence

### Suggested MVP Scope

- **MVP**: Phase 1, Phase 2, and User Story 1 only
- **Second increment**: User Story 2
- **Final increment**: User Story 3 plus Phase 6 validation

---

## Notes

- No task authorizes production DB execution.
- No task introduces a second migration authority or changes reconciliation/manual-hotfix ownership.
- Runtime APIs remain blocked from production migration execution throughout this feature.
