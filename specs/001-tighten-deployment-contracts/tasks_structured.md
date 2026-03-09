# Tasks: Deployment Tightening Round (Structured)

This version is machine-readable Markdown intended to replace or sit alongside the current `tasks.md`.

Conventions:
- `status`: `todo` or `done`
- `issue`: GitHub issue number if already created, otherwise `null`
- `parallel`: `true` or `false`
- `story`: user story label like `US1`, otherwise `null`
- `target`: repo-relative path

## Foundational (Blocking Prerequisites)

**phase-id:** `phase-2`
**purpose:** Define and lock shared deployment prerequisites before story work

### T005
- status: done
- issue: 76
- phase: phase-2
- story: null
- parallel: false
- target: `architecture/contracts/production_deployment_contract.md`
- description: Normalize canonical service naming map

### T006
- status: done
- issue: 77
- phase: phase-2
- story: null
- parallel: true
- target: `architecture/contracts/two_part_brief.md`
- description: Normalize canonical frontend path expectations

### T007
- status: done
- issue: 78
- phase: phase-2
- story: null
- parallel: true
- target: `architecture/contracts/database_ownership_and_migration_authority.md`
- description: Lock migration authority language

### T008
- status: done
- issue: 79
- phase: phase-2
- story: null
- parallel: false
- target: `specs/001-tighten-deployment-contracts/quickstart.md`
- description: Define single-server deployment prerequisites

### T009
- status: done
- issue: 80
- phase: phase-2
- story: null
- parallel: false
- target: `architecture/contracts/acceptance_test_matrix.md`
- description: Align acceptance evidence checkpoints with scope

### T010
- status: done
- issue: 81
- phase: phase-2
- story: null
- parallel: false
- target: `architecture/contracts/developer_execution_packet.md`
- description: Lock required environment artifact list

## User Story 1 - Reproducible Three-Lane Production Deploy (Priority: P1) 🎯 MVP

**phase-id:** `phase-3`

### T011
- status: done
- issue: 82
- phase: phase-3
- story: US1
- parallel: false
- target: `architecture/contracts/production_runbook.md`
- description: Normalize production runbook sequence

### T012
- status: done
- issue: 83
- phase: phase-3
- story: US1
- parallel: false
- target: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- description: Update top-level deployment workflow and prerequisites

### T013
- status: done
- issue: 84
- phase: phase-3
- story: US1
- parallel: true
- target: `DEPLOYMENT_CHECKLIST.md`
- description: Align operational checklist with reproducible flow

### T014
- status: done
- issue: 85
- phase: phase-3
- story: US1
- parallel: true
- target: `architecture/contracts/docker-compose.production.shared.yml`
- description: Align compose topology and service coverage

### T015
- status: todo
- issue: 86
- phase: phase-3
- story: US1
- parallel: false
- target: `architecture/contracts/dockerfiles/admin-api.Dockerfile.production`
- description: Align API production packaging contract for admin

### T016
- status: todo
- issue: 87
- phase: phase-3
- story: US1
- parallel: true
- target: `architecture/contracts/dockerfiles/moneyshyft-api.Dockerfile.production`
- description: Align API production packaging contract for money

### T017
- status: todo
- issue: 88
- phase: phase-3
- story: US1
- parallel: true
- target: `architecture/contracts/dockerfiles/connectshyft-api.Dockerfile.production`
- description: Align API production packaging contract for connect

### T018
- status: todo
- issue: 89
- phase: phase-3
- story: US1
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/runbook-reproducibility.md`
- description: Record reproducibility execution proof template

## User Story 2 - Correct Cross-Lane Routing Delegation (Priority: P1)

**phase-id:** `phase-4`

### T019
- status: todo
- issue: 90
- phase: phase-4
- story: US2
- parallel: false
- target: `specs/001-tighten-deployment-contracts/contracts/lane-routing-contract.md`
- description: Normalize lane routing contract definitions

### T020
- status: todo
- issue: 91
- phase: phase-4
- story: US2
- parallel: false
- target: `architecture/contracts/nginx/shyftunity-admin-money-connect.conf`
- description: Update Nginx production routing rules

### T021
- status: todo
- issue: 92
- phase: phase-4
- story: US2
- parallel: true
- target: `architecture/contracts/production_deployment_contract.md`
- description: Align routing requirements

### T022
- status: todo
- issue: 93
- phase: phase-4
- story: US2
- parallel: true
- target: `architecture/contracts/acceptance_test_matrix.md`
- description: Align acceptance routing checks

### T023
- status: todo
- issue: 94
- phase: phase-4
- story: US2
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/routing-verification-matrix.md`
- description: Add executable routing verification steps

### T024
- status: todo
- issue: 95
- phase: phase-4
- story: US2
- parallel: false
- target: `specs/001-tighten-deployment-contracts/quickstart.md`
- description: Update quickstart routing validation steps

## User Story 3 - Shared Database and Security Boundary Enforcement (Priority: P2)

**phase-id:** `phase-5`

### T025
- status: todo
- issue: 96
- phase: phase-5
- story: US3
- parallel: false
- target: `specs/001-tighten-deployment-contracts/contracts/deployment-verification-contract.md`
- description: Normalize DB authority contract language

### T026
- status: todo
- issue: 97
- phase: phase-5
- story: US3
- parallel: false
- target: `architecture/contracts/database_ownership_and_migration_authority.md`
- description: Update centralized migration authority guidance

### T027
- status: todo
- issue: 98
- phase: phase-5
- story: US3
- parallel: true
- target: `architecture/contracts/developer_execution_packet.md`
- description: Align DB and security guardrails

### T028
- status: todo
- issue: 99
- phase: phase-5
- story: US3
- parallel: true
- target: `architecture/contracts/env/admin-api.env.example`
- description: Align environment templates for shared DB connectivity

### T029
- status: todo
- issue: 100
- phase: phase-5
- story: US3
- parallel: true
- target: `architecture/contracts/env/moneyshyft-api.env.example`
- description: Align environment templates for shared DB connectivity

### T030
- status: todo
- issue: 101
- phase: phase-5
- story: US3
- parallel: true
- target: `architecture/contracts/env/connectshyft-api.env.example`
- description: Align environment templates for shared DB connectivity

### T031
- status: todo
- issue: 102
- phase: phase-5
- story: US3
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/database-authority-verification.md`
- description: Add DB authority validation evidence steps

### T032
- status: todo
- issue: 103
- phase: phase-5
- story: US3
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/security-boundary-verification.md`
- description: Add API exposure and ingress validation evidence steps

## Polish & Cross-Cutting Concerns

**phase-id:** `phase-6`
**purpose:** Final consistency pass and release-readiness proof across all stories

### T033
- status: todo
- issue: null
- phase: phase-6
- story: null
- parallel: true
- target: `specs/001-tighten-deployment-contracts/plan.md`
- description: Update feature-level summary and traceability

### T034
- status: todo
- issue: null
- phase: phase-6
- story: null
- parallel: true
- target: `specs/001-tighten-deployment-contracts/spec.md`
- description: Reconcile final spec acceptance criteria wording with executed tasks

### T035
- status: todo
- issue: null
- phase: phase-6
- story: null
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/README.md`
- description: Consolidate final acceptance evidence index

### T036
- status: todo
- issue: null
- phase: phase-6
- story: null
- parallel: false
- target: `specs/001-tighten-deployment-contracts/evidence/final-validation-report.md`
- description: Perform end-to-end quickstart validation and capture outcomes
