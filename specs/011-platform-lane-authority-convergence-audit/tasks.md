# Tasks: Platform Lane Authority Convergence Audit

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/`  
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Validation**: No new automated test suite is introduced for this documentation audit. Validation is performed through explicit checklist tasks for Nginx routing, API binding/port checks, shared Postgres connectivity, deployment runbook reproducibility, and output completeness.

**Organization**: The user stories below follow the feature-local spec: discovery maps first, classification/remediation second, and migration/RouteShyft/blocker decisions third.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which derived user story this task belongs to (`US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Path Conventions

- Planning and audit outputs live in `specs/011-platform-lane-authority-convergence-audit/`
- Feature source of truth remains `specs/011-platform-lane-authority-convergence-audit/spec.md`
- Supporting PR template lives in `.github/pull_request_template/`

## Phase 1: Setup (Audit Output Scaffolding)

**Purpose**: Create the documentation structure needed for the audit deliverables.

- [X] T001 Create audit output scaffold files in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/runtime-authority-map.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/duplication-divergence-map.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-matrix.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/intended-vs-actual-authority.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/remediation-priority-map.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/migration-authority-map.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/routeshyft-artifact-classification.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/safe-delete-candidates.md`, `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/blocked-areas.md`, and `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`
- [X] T002 [P] Create the normalized lane-name and scope-alias reference in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-scope.md`
- [X] T003 [P] Create the shared audit evidence source index in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/evidence-index.md`
- [X] T004 [P] Create the classification glossary and decision legend in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-glossary.md`

---

## Phase 2: Foundational (Blocking Audit Rules)

**Purpose**: Establish shared rules and source references that all audit outputs depend on.

**⚠️ CRITICAL**: No user story work should start until these rules and evidence anchors are in place.

- [X] T005 Consolidate the audit output structure, required sections, and cross-links in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`
- [X] T006 [P] Record runtime-authority precedence rules and patch-target rules in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-glossary.md`
- [X] T007 [P] Align the audit execution workflow and evidence commands with the final output doc set in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/quickstart.md`

**Checkpoint**: Foundation ready - discovery, classification, and migration/RouteShyft audit work can now proceed.

---

## Phase 3: User Story 1 - Build Discovery Maps for Live Surfaces (Priority: P1) 🎯 MVP

**Goal**: Produce the runtime authority map, duplication/divergence map, and file/surface inventory for all covered lanes, embedded artifacts, validators, scripts, and packaging/build surfaces.

**Independent Test**: A reviewer can identify every covered runtime surface, validator, script, and packaging/build path, along with its live serving role or repository authority, overlap status, and evidence location, from the audit docs alone without re-scanning the repository.

### Implementation for User Story 1

- [X] T008 [P] [US1] Document actual runtime routes and serving surfaces for `money-api`, `moneyshyft-web`, `connect-api`, `admin-api`, and `migration-runner` in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/runtime-authority-map.md`
- [X] T009 [P] [US1] Document duplicated, mirrored, and diverged modules/services across the covered lanes in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/duplication-divergence-map.md`
- [X] T010 [P] [US1] Build the file and surface inventory for covered applications and embedded RouteShyft paths in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md`
- [X] T011 [US1] Inventory validator ownership, duplication, and lane placement in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md`
- [X] T012 [US1] Inventory scripts and packaging/build logic authority, duplication, and runtime relevance in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md`
- [X] T013 [US1] Consolidate discovery decisions, scope coverage, and cross-links in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`

**Checkpoint**: User Story 1 should now provide a complete discovery map and overlap/inventory baseline.

---

## Phase 4: User Story 2 - Apply Classification and Remediation Decisions (Priority: P2)

**Goal**: Classify every audited subsystem and explicitly decide safe patch locations, intended-vs-actual authority, and remediation priority.

**Independent Test**: Every audited subsystem has a classification, actual runtime authority, intended authority, remediation recommendation, and safe bug-fix landing decision.

### Implementation for User Story 2

- [X] T014 [P] [US2] Apply the classification model to all audited subsystems in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/classification-matrix.md`
- [X] T015 [P] [US2] Document intended-vs-actual authority decisions for each audited subsystem in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/intended-vs-actual-authority.md`
- [X] T016 [P] [US2] Build the remediation priority map with safe patch landing guidance in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/remediation-priority-map.md`
- [X] T017 [US2] Consolidate subsystem classification and remediation decisions in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`

**Checkpoint**: User Story 2 should now provide decision-grade classification and remediation guidance.

---

## Phase 5: User Story 3 - Decide Migration, RouteShyft, Safe-Delete, and Blocked Areas (Priority: P3)

**Goal**: Explicitly map migration authority and runner status, classify RouteShyft artifacts, define safe-delete-after-convergence candidates, and identify blocked areas requiring convergence before feature fixes.

**Independent Test**: A reviewer can answer who owns production migrations now, whether `migration-runner` is active yet, how each RouteShyft artifact is classified, what can only be deleted later, and which feature areas are blocked pending convergence.

### Implementation for User Story 3

- [X] T018 [P] [US3] Map current migration authority, authorized runner, future runner, and remaining lane-local assumptions in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/migration-authority-map.md`
- [X] T019 [P] [US3] Classify RouteShyft artifacts, runtime status, and dependency status in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/routeshyft-artifact-classification.md`
- [X] T020 [P] [US3] Build the safe-delete candidate framework and candidate list in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/safe-delete-candidates.md`
- [X] T021 [P] [US3] Document blocked areas requiring convergence before feature fixes in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/blocked-areas.md`
- [X] T022 [US3] Consolidate migration, RouteShyft, safe-delete, and blocked-area decisions in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`

**Checkpoint**: User Story 3 should now complete the audit’s migration, RouteShyft, safe-delete, and blocker outputs.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final alignment, acceptance checks, and supporting workflow artifacts.

- [X] T023 [P] Update the audit pull request checklist to match the final deliverables in `/Users/jeremiahotis/projects/connectshyft/.github/pull_request_template/platform-lane-authority-convergence-audit.md`
- [X] T024 Verify all required outputs against `/Users/jeremiahotis/projects/connectshyft/specs/platform-lane-authority-convergence-audit/implementation-checklist.md` and record completion status in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`
- [X] T025 [P] Validate the documented audit workflow, command set, and completion criteria in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/quickstart.md`
- [X] T026 [P] Validate Nginx routing delegation and lane-owned route evidence in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`
- [X] T027 [P] Validate API localhost bindings and canonical ports for `admin-api:3100`, `money-api:3000`, and `connect-api:3002` in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/runtime-authority-map.md`
- [X] T028 [P] Validate shared Postgres connectivity and production migration ownership evidence in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/migration-authority-map.md`
- [X] T029 Validate reproducible deployment runbook coverage across Admin, MoneyShyft, and ConnectShyft in `/Users/jeremiahotis/projects/connectshyft/specs/011-platform-lane-authority-convergence-audit/audit-summary.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 discovery outputs
- **User Story 3 (Phase 5)**: Depends on User Story 1 discovery outputs and uses User Story 2 classification rules
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational and establishes the discovery baseline
- **User Story 2 (P2)**: Requires User Story 1 because classification depends on the discovery map and overlap inventory
- **User Story 3 (P3)**: Requires User Story 1 and should follow User Story 2 so migration, RouteShyft, safe-delete, and blocked-area decisions use the final classification framework

### Within Each User Story

- Discovery and evidence collection tasks come before summary consolidation
- Per-output documents come before final story-level reconciliation in `audit-summary.md`
- Checklist and quickstart validation happen only after all required outputs exist

### Parallel Opportunities

- Setup tasks `T002` to `T004` can run in parallel
- Foundational tasks `T006` and `T007` can run in parallel
- In User Story 1, `T008` to `T010` can run in parallel; `T011` and `T012` are follow-on inventory tasks in the same file and should run after `T010`
- In User Story 2, `T014` to `T016` can run in parallel
- In User Story 3, `T018` to `T021` can run in parallel
- In the Polish phase, `T023`, `T025`, `T026`, `T027`, and `T028` can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Document actual runtime routes and serving surfaces in specs/011-platform-lane-authority-convergence-audit/runtime-authority-map.md"
Task: "Document duplicated, mirrored, and diverged modules/services in specs/011-platform-lane-authority-convergence-audit/duplication-divergence-map.md"
Task: "Build the base file and surface inventory in specs/011-platform-lane-authority-convergence-audit/file-surface-inventory.md"
Task: "Then extend file-surface-inventory.md with validator ownership, duplication, lane placement, scripts, and packaging/build logic authority"
```

## Parallel Example: User Story 2

```bash
Task: "Apply the classification model in specs/011-platform-lane-authority-convergence-audit/classification-matrix.md"
Task: "Document intended-vs-actual authority in specs/011-platform-lane-authority-convergence-audit/intended-vs-actual-authority.md"
Task: "Build the remediation priority map in specs/011-platform-lane-authority-convergence-audit/remediation-priority-map.md"
```

## Parallel Example: User Story 3

```bash
Task: "Map migration authority in specs/011-platform-lane-authority-convergence-audit/migration-authority-map.md"
Task: "Classify RouteShyft artifacts in specs/011-platform-lane-authority-convergence-audit/routeshyft-artifact-classification.md"
Task: "Build safe-delete candidates in specs/011-platform-lane-authority-convergence-audit/safe-delete-candidates.md"
Task: "Document blocked areas in specs/011-platform-lane-authority-convergence-audit/blocked-areas.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the runtime authority map, duplication/divergence map, and file/surface inventory

### Incremental Delivery

1. Deliver the discovery baseline first
2. Add classification and remediation decisions second
3. Add migration/RouteShyft/safe-delete/blocked-area decisions third
4. Finish with PR template and checklist/quickstart validation

### Parallel Team Strategy

1. One contributor prepares scaffolding and foundational rules
2. Discovery-map work splits across runtime authority, duplication analysis, and file inventory
3. Classification work splits across matrix, intended-vs-actual mapping, and remediation priority
4. Migration and RouteShyft work splits across authority mapping, artifact classification, safe-delete gating, and blocked-area analysis

---

## Notes

- The feature-local spec now defines explicit `US1` to `US3` stories that map directly to the audit outputs.
- No automated test suite is introduced because the feature is a documentation audit, but constitution-mandated validation tasks are included explicitly.
- Every task includes a concrete file path and is intended to be executable without additional architectural invention.
