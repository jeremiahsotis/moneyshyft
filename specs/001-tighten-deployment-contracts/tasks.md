# Tasks: Deployment Tightening Round

**Input**: Design documents from `/specs/001-tighten-deployment-contracts/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No TDD-first or explicit automated test implementation request was made in the feature spec. This task list includes operational validation tasks instead of new automated test-suite tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Deployment contracts and architecture docs: `architecture/contracts/`
- Runtime deployment docs: repository root docs and checklists
- Feature artifacts: `specs/001-tighten-deployment-contracts/`
- Infrastructure config: `nginx/`, `docker-compose*.yml`, and env examples

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare deployment-tightening workspace artifacts and baseline references

- [x] T001 Create deployment evidence directory at `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/`
- [x] T002 Create lane routing verification matrix document at `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`
- [x] T003 [P] Create shared DB authority verification document at `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md`
- [x] T004 [P] Create ingress and port exposure verification document at `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define and lock shared deployment prerequisites before story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Normalize canonical service naming map in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_deployment_contract.md`
- [x] T006 [P] Normalize canonical frontend path expectations in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/two_part_brief.md`
- [x] T007 [P] Lock migration authority language in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/database_ownership_and_migration_authority.md`
- [x] T008 Define single-server deployment prerequisites in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/quickstart.md`
- [x] T009 Align acceptance evidence checkpoints with scope in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/acceptance_test_matrix.md`
- [x] T010 Lock required environment artifact list in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/developer_execution_packet.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Reproducible Three-Lane Production Deploy (Priority: P1) 🎯 MVP

**Goal**: Produce a deterministic deployment flow for admin, money, and connect lanes on a small server profile

**Independent Test**: Execute the documented runbook steps from a clean baseline and verify deployment succeeds for all three lanes without undocumented manual corrections.

### Implementation for User Story 1

- [x] T011 [US1] Normalize production runbook sequence in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_runbook.md`
- [x] T012 [US1] Update top-level deployment workflow and prerequisites in `/Users/jeremiahotis/projects/connectshyft/PRODUCTION_DEPLOYMENT_GUIDE.md`
- [x] T013 [P] [US1] Align operational checklist with reproducible flow in `/Users/jeremiahotis/projects/connectshyft/DEPLOYMENT_CHECKLIST.md`
- [x] T014 [P] [US1] Align compose topology and service coverage in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/docker-compose.production.shared.yml`
- [x] T015 [US1] Align API production packaging contract for admin in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/dockerfiles/admin-api.Dockerfile.production`
- [x] T016 [P] [US1] Align API production packaging contract for money in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/dockerfiles/moneyshyft-api.Dockerfile.production`
- [x] T017 [P] [US1] Align API production packaging contract for connect in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/dockerfiles/connectshyft-api.Dockerfile.production`
- [x] T018 [US1] Record reproducibility execution proof template in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/runbook-reproducibility.md`

**Checkpoint**: User Story 1 is independently complete when reproducible deployment steps and packaging contracts are aligned for all three lanes.

---

## Phase 4: User Story 2 - Correct Cross-Lane Routing Delegation (Priority: P1)

**Goal**: Enforce route ownership so delegated auth/platform-admin traffic reaches admin-api and lane-local API traffic remains lane-owned

**Independent Test**: Validate domain/path routing matrix for admin, money, and connect against documented ownership and confirm expected upstream target for each rule.

### Implementation for User Story 2

- [x] T019 [US2] Normalize lane routing contract definitions in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/contracts/lane-routing-contract.md`
- [x] T020 [US2] Update Nginx production routing rules in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/nginx/shyftunity-admin-money-connect.conf`
- [x] T021 [P] [US2] Align routing requirements in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_deployment_contract.md`
- [x] T022 [P] [US2] Align acceptance routing checks in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/acceptance_test_matrix.md`
- [x] T023 [US2] Add executable routing verification steps in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`
- [x] T024 [US2] Update quickstart routing validation steps in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/quickstart.md`

**Checkpoint**: User Story 2 is independently complete when delegated and lane-local route ownership validates correctly for all in-scope domains.

---

## Phase 5: User Story 3 - Shared Database and Security Boundary Enforcement (Priority: P2)

**Goal**: Enforce one shared DB authority and ingress security boundaries with verifiable operational evidence

**Independent Test**: Confirm shared Postgres usage across all APIs, migration execution from admin-api only, localhost-only API bindings, and no public API exposure.

### Implementation for User Story 3

- [x] T025 [US3] Normalize DB authority contract language in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/contracts/deployment-verification-contract.md`
- [x] T026 [US3] Update centralized migration authority guidance in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/database_ownership_and_migration_authority.md`
- [x] T027 [P] [US3] Align DB and security guardrails in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/developer_execution_packet.md`
- [x] T028 [P] [US3] Align environment templates for shared DB connectivity in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/admin-api.env.example`
- [x] T029 [P] [US3] Align environment templates for shared DB connectivity in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/moneyshyft-api.env.example`
- [x] T030 [P] [US3] Align environment templates for shared DB connectivity in `/Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/connectshyft-api.env.example`
- [x] T031 [US3] Add DB authority validation evidence steps in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md`
- [x] T032 [US3] Add API exposure and ingress validation evidence steps in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md`

**Checkpoint**: User Story 3 is independently complete when shared DB authority and security boundary checks pass with documented evidence.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency pass and release-readiness proof across all stories

- [ ] T033 [P] Update feature-level summary and traceability in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/plan.md`
- [ ] T034 [P] Reconcile final spec acceptance criteria wording with executed tasks in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/spec.md`
- [ ] T035 Consolidate final acceptance evidence index in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/README.md`
- [ ] T036 Perform end-to-end quickstart validation and capture outcomes in `/Users/jeremiahotis/projects/connectshyft/specs/001-tighten-deployment-contracts/evidence/final-validation-report.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
  - US1 and US2 are both P1 and can proceed in parallel after Phase 2
  - US3 (P2) can proceed after Phase 2 and after routing/deployment baselines are stable
- **Polish (Phase 6)**: Depends on completion of all targeted user stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on other stories
- **User Story 2 (P1)**: Starts after Phase 2; no dependency on US1 deliverables
- **User Story 3 (P2)**: Starts after Phase 2; recommended after US1/US2 contract alignment

### Parallel Opportunities

- Setup: T003-T004 in parallel
- Foundational: T006-T007 and T009-T010 in parallel
- US1: T013-T014 and T016-T017 in parallel
- US2: T021-T022 in parallel
- US3: T027-T030 in parallel
- Polish: T033-T034 in parallel

---

## Parallel Example: User Story 1

```bash
Task: "T013 [P] [US1] Align operational checklist in /Users/jeremiahotis/projects/connectshyft/DEPLOYMENT_CHECKLIST.md"
Task: "T014 [P] [US1] Align compose topology in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/docker-compose.production.shared.yml"
Task: "T016 [P] [US1] Align money Dockerfile in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/dockerfiles/moneyshyft-api.Dockerfile.production"
Task: "T017 [P] [US1] Align connect Dockerfile in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/dockerfiles/connectshyft-api.Dockerfile.production"
```

## Parallel Example: User Story 2

```bash
Task: "T021 [P] [US2] Align routing requirements in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/production_deployment_contract.md"
Task: "T022 [P] [US2] Align acceptance routing checks in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/acceptance_test_matrix.md"
```

## Parallel Example: User Story 3

```bash
Task: "T027 [P] [US3] Align DB/security guardrails in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/developer_execution_packet.md"
Task: "T028 [P] [US3] Align admin env template in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/admin-api.env.example"
Task: "T029 [P] [US3] Align money env template in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/moneyshyft-api.env.example"
Task: "T030 [P] [US3] Align connect env template in /Users/jeremiahotis/projects/connectshyft/architecture/contracts/env/connectshyft-api.env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate runbook reproducibility evidence
5. Stop for review before routing/DB hardening extensions

### Incremental Delivery

1. Setup + Foundational
2. Deliver US1 (deployment reproducibility)
3. Deliver US2 (routing delegation correctness)
4. Deliver US3 (DB authority + security boundaries)
5. Run cross-cutting polish and final validation

### Parallel Team Strategy

1. Team completes Setup and Foundational phases together
2. After Phase 2:
   - Engineer A: US1 deployment/runbook tasks
   - Engineer B: US2 routing contract tasks
   - Engineer C: US3 DB/security tasks
3. Merge in Polish phase with consolidated evidence

---

## Notes

- Every task uses strict checklist format: checkbox, ID, optional `[P]`, optional story label, and explicit file path
- User story tasks are independently testable via their phase checkpoint criteria
- Prioritize contract alignment over introducing new architecture
