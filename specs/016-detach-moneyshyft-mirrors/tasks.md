# Tasks: Slice 10b - Final MoneyShyft Route-and-Service Mirror Detachment and Removal

**Input**: Design documents from `/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/`  
**Prerequisites**: [plan.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/plan.md), [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/spec.md), [research.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md), [data-model.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/data-model.md), [mirror-detachment-boundary.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/contracts/mirror-detachment-boundary.md), [quickstart.md](/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md)

**Tests**: Verification is required for this slice. Use repository reference scans, targeted Jest coverage moved to canonical owners, explicit ownership-boundary checks, affected app builds, and constitution-required topology validation after deletions.

**Organization**: Tasks are grouped by user story to keep the slice independently testable while staying file-by-file and proof-first.

## Phase 1: Setup (Shared Preparation)

**Purpose**: Lock the exact file list, current inventory authority, and stop boundary before proof or edits begin.

- [X] T001 Reconfirm the Slice 10b scope and stop boundary in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/spec.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/plan.md
- [X] T002 Reconfirm the current inventory rows for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T003 Reconfirm the reviewed-anchor baseline for MoneyShyft mirror detachment in /Users/jeremiahotis/projects/connectshyft/specs/014-break-dependency-anchors/research.md and /Users/jeremiahotis/projects/connectshyft/specs/015-delete-api-mirrors/research.md
- [X] T004 [P] Sync the exact deletion boundary and forbidden work items in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/contracts/mirror-detachment-boundary.md
- [X] T005 [P] Sync the execution and verification order in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md

---

## Phase 2: Foundational (Blocking Proof Work)

**Purpose**: Trace every direct and indirect blocker edge before any detachment, reclassification, or deletion begins.

**⚠️ CRITICAL**: No deletion task can begin until this phase is complete.

- [X] T006 [P] Trace and record direct and indirect repo dependencies for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T007 [P] Trace and record direct and indirect repo dependencies for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T008 [P] Trace and record direct and indirect repo dependencies for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T009 [P] Trace and record direct and indirect repo dependencies for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T010 [P] Trace and record importer and blocker proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T011 [P] Trace and record importer and dependent-test proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T012 [P] Trace and record importer and coverage proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T013 [P] Trace and record importer and coverage proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T014 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T015 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T016 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T017 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T018 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T019 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T020 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T021 [P] Build the blocker ledger entry for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T022 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T023 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T024 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T025 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T026 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T027 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T028 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T029 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T030 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T031 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T032 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T033 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T034 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T035 [P] Prepare the pre-delete inventory mutation plan for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md

**Checkpoint**: Every target mirror and blocker file now has explicit dependency proof and a planned file-level reclassification path.

---

## Phase 3: User Story 1 - Remove Directly Detachable MoneyShyft Mirror Routes (Priority: P1) 🎯 MVP

**Goal**: Close the isolated `auth.ts` track and the standalone `platform-admin-console.ts` blocker using exact proof and canonical admin ownership.

**Independent Test**: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts` are each deleted or individually blocked with exact evidence, and no surviving repo reference still points at either file.

- [X] T036 [US1] Rewrite /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts so it no longer imports /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts and instead validates MoneyShyft behavior against the canonical admin auth owner
- [X] T037 [US1] Update /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/apiEnvelopeContract.test.ts to absorb any surviving auth envelope assertions moved off the MoneyShyft mirror track
- [X] T038 [US1] Rewrite /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts so its auth contract evidence no longer path-references /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts
- [X] T039 [US1] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deleting /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts
- [X] T040 [US1] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deleting /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts
- [X] T041 [US1] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md to delete-ready posture before deleting the mirror
- [X] T042 [US1] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts only after T036-T041 prove no surviving import or path-based contract reference remains; if blocked, record the exact blocker for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T043 [US1] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md to delete-ready posture before deleting the mirror
- [X] T044 [US1] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts only after T007 and T043 prove no surviving importer or test role remains; if blocked, record the exact blocker for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T045 [US1] Run post-delete reference scans and targeted verification for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts using /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/__tests__/apiEnvelopeContract.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/auth.refresh.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/platform-admin-console.test.ts, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts

**Checkpoint**: The isolated admin-owned MoneyShyft mirror route files are closed without widening into the ConnectShyft mirror chain.

---

## Phase 4: User Story 2 - Move Or Replace Legitimate Canonical Coverage (Priority: P2)

**Goal**: Move any still-legitimate MoneyShyft mirror test coverage to canonical owners, then remove the MoneyShyft-only helper and test files that no longer validate live behavior.

**Independent Test**: Surviving provider-registry, neighbors, identity-match, and platform-admin service assertions run against canonical owners, and every reviewed MoneyShyft mirror test/helper file is deleted or individually blocked with exact evidence.

- [X] T046 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T047 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts
- [X] T048 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T049 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
- [X] T050 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T051 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts
- [X] T052 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T053 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts
- [X] T054 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T055 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts
- [X] T056 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T057 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts
- [X] T058 [P] [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T059 [P] [US2] Create or update /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts
- [X] T060 [US2] Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md
- [X] T061 [US2] Update /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts to absorb any surviving assertions from /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts
- [X] T062 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T063 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T064 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T065 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T066 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T067 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T068 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T069 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T070 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T071 [US2] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md before deletion or justified retention
- [X] T072 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts after T046, T047, and T062 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T073 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts after T048, T049, and T063 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T074 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts after T050, T051, and T064 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T075 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts after T052, T053, and T065 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T076 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts after T054, T055, and T066 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T077 [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts only after T072-T076 and T067 prove the focused provider-registry files are removed or explicitly retained with proof; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T078 [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts only after T072-T077 and T068 prove no dependent test still imports the helper; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T079 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts after T056, T057, and T069 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T080 [P] [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts after T058, T059, and T070 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T081 [US2] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts after T060, T061, and T071 are complete; if blocked, record the exact blocker for that file in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T082 [US2] Run post-delete canonical coverage verification across /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts, and /Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts

**Checkpoint**: Legitimate assertions now live under canonical owners, and the MoneyShyft mirror test/helper chain is either removed or explicitly blocked file by file.

---

## Phase 5: User Story 3 - Reclassify Exact Files And Remove The Final ConnectShyft And Service Mirrors (Priority: P3)

**Goal**: Apply exact file-level inventory truth, then delete `/connectshyft.ts` and `/PlatformAdminService.ts` only if every direct and indirect blocker is gone.

**Independent Test**: `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` and `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts` are each deleted or individually blocked with exact evidence, and `LANE_INVENTORY.md` matches the final state.

- [X] T083 [US3] Re-run exact reference scans for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts after T072-T082 to prove whether any blocker edge remains
- [X] T084 [US3] Re-run exact reference scans for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts after T072-T082 to prove whether any blocker edge remains
- [X] T085 [US3] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md to deletion-ready or still-blocked posture before attempting deletion
- [X] T086 [US3] Update the exact inventory row for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md to deletion-ready or still-blocked posture before attempting deletion
- [X] T087 [US3] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts only after T083 and T085 prove every direct and indirect test-mounted blocker is gone; if blocked, record the exact blocker for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T088 [US3] Delete /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts only after T084 and T086 prove every route, helper, and test importer is gone; if blocked, record the exact blocker for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T089 [US3] Record final deleted-versus-blocked proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T090 [US3] Record final deleted-versus-blocked proof for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md and /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T091 [US3] Run final post-delete repo scans, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api build, /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api build, /Users/jeremiahotis/projects/connectshyft/apps/admin-api build, and the targeted Jest verification matrix named in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/spec.md

**Checkpoint**: The final MoneyShyft ConnectShyft route and service mirrors are removed or explicitly blocked with exact evidence, and the inventory is authoritative again.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate final scope discipline, constitution-required deployment invariants, and file-by-file stop conditions.

- [X] T092 [P] Verify no RouteShyft files outside /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts, and /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts were changed during Slice 10b
- [X] T093 [P] Verify no migration-runner or broad directory cleanup changes were introduced outside /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/ and /Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md
- [X] T094 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T095 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T096 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T097 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T098 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T099 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T100 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T101 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T102 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T103 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T104 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T105 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T106 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T107 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T108 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T109 Record the final stop condition for /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/quickstart.md
- [X] T110 Verify unchanged host Nginx routing delegation for admin, money, and connect lanes using /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf and /Users/jeremiahotis/projects/connectshyft/PRODUCTION_DEPLOYMENT_GUIDE.md
- [X] T111 Verify unchanged localhost-only API binding and canonical ports for admin, money, and connect lanes using /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml and each affected app deployment/runtime config
- [X] T112 Verify unchanged shared Postgres connectivity assumptions for /Users/jeremiahotis/projects/connectshyft/apps/admin-api, /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api, and /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api using current configuration and runbook evidence
- [X] T113 Verify production deployment remains reproducible from /Users/jeremiahotis/projects/connectshyft/PRODUCTION_DEPLOYMENT_GUIDE.md without slice-specific manual adjustments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Phase 1 and blocks every edit and deletion task
- **User Story 1 (Phase 3)**: depends on Phase 2
- **User Story 2 (Phase 4)**: depends on Phase 2 and can run after or alongside User Story 1 because it targets different files
- **User Story 3 (Phase 5)**: depends on User Story 1 and User Story 2 because the final `connectshyft.ts` and `PlatformAdminService.ts` deletions require both admin-blocker closure and coverage migration
- **Polish (Phase 6)**: depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: no dependency on other stories once foundational proof is complete
- **User Story 2 (P2)**: no dependency on User Story 1 for canonical coverage movement, but must complete before User Story 3 can delete the final `connectshyft.ts` and `PlatformAdminService.ts` mirrors
- **User Story 3 (P3)**: depends on User Story 1 and User Story 2

### Parallel Opportunities

- T004 and T005 can run in parallel
- T006 through T035 can run in parallel because they trace or plan separate files
- T046, T048, T050, T052, T054, T056, and T058 can run in parallel because they classify separate files
- T047, T049, T051, T053, T055, T057, and T059 can run in parallel after their matching classification tasks are complete
- T062 through T071 can run in parallel because they update separate inventory rows
- T072 through T076 can run in parallel after their matching migration and inventory tasks are complete
- T092 and T093 can run in parallel

---

## Parallel Example: User Story 2

```bash
Task: "Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md"
Task: "Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md"
Task: "Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md"
Task: "Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md"
Task: "Classify the surviving assertions in /Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts as migrate-to-canonical or delete-as-stale in /Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finish Setup and Foundational proof tasks.
2. Close the isolated MoneyShyft `auth.ts` mirror and the standalone `platform-admin-console.ts` blocker.
3. Run T045 to prove the repo no longer depends on those two files.

### Incremental Delivery

1. Complete Setup and Foundational proof.
2. Deliver User Story 1 to remove the smallest independent mirror route cluster.
3. Deliver User Story 2 to classify surviving assertions, migrate legitimate coverage, and clear the MoneyShyft test/helper blocker chain.
4. Deliver User Story 3 to delete the final MoneyShyft `connectshyft.ts` and `PlatformAdminService.ts` mirrors or stop with exact blocker evidence.
5. Finish with Phase 6 scope, topology, and stop-boundary validation.

---

## File-By-File Stop Conditions

- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts`: stop and retain only if repointing away from the MoneyShyft auth mirror would drop still-legitimate envelope assertions that cannot yet move to the canonical admin auth owner within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts`: stop and retain only if its auth contract evidence cannot be repointed away from the MoneyShyft auth mirror path without widening scope beyond this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/auth.ts`: stop and retain only if `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/__tests__/apiEnvelopeContract.test.ts` or `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-contracts.ts` still requires the MoneyShyft auth mirror after attempted repointing.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`: stop and retain only if a surviving importer or test role is found after the proof scan.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`: stop and retain only if the corresponding canonical ConnectShyft coverage cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts`: stop and retain only if the corresponding canonical ConnectShyft coverage cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts`: stop and retain only if the corresponding canonical ConnectShyft coverage cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts`: stop and retain only if the corresponding canonical ConnectShyft coverage cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts`: stop and retain only if the corresponding canonical ConnectShyft coverage cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts`: stop and retain only if the wrapper entrypoint is still needed because one or more focused provider-registry files remain retained with exact blocker evidence.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`: stop and retain only if any retained MoneyShyft provider-registry test still imports it.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts`: stop and retain only if `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts` cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts`: stop and retain only if `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.identity-match.test.ts` cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/__tests__/PlatformAdminService.test.ts`: stop and retain only if `/Users/jeremiahotis/projects/connectshyft/apps/admin-api/src/services/__tests__/PlatformAdminService.test.ts` cannot absorb its surviving assertions within this slice.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`: stop and retain only if any MoneyShyft route test, helper, wrapper entrypoint, or indirect provider-registry dependent still mounts or requires the route after T072-T082.
- `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/services/PlatformAdminService.ts`: stop and retain only if `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`, `/Users/jeremiahotis/projects/connectshyft/apps/moneyshyft-api/src/routes/api/v1/platform-admin-console.ts`, any retained MoneyShyft route test/helper, or any retained MoneyShyft service test still imports it.

---

## Notes

- Every deletion task in this file is preceded by explicit proof tasks and explicit inventory reclassification tasks for that exact file.
- No RouteShyft, migration-runner, broad tree cleanup, or feature redesign work is included.
- Constitution-required topology validation is explicit in T110-T113.
- If a file cannot be removed, the slice stops at the exact blocker and records it in both `/Users/jeremiahotis/projects/connectshyft/specs/016-detach-moneyshyft-mirrors/research.md` and `/Users/jeremiahotis/projects/connectshyft/architecture/LANE_INVENTORY.md`.
