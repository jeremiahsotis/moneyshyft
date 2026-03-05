---
project_lane: routeshyft
---

# Sprint Change Proposal - 2026-03-04

## 1. Issue Summary

### Trigger
Planning-discovered structural risk (not story-triggered): repository growth across MoneyShyft, RouteShyft, ConnectShyft, and SignShyft is outpacing current folder and boundary conventions.

### Problem Statement
The current repo shape and implicit boundaries make it increasingly hard to:

1. Locate lane-specific code quickly.
2. Prevent cross-lane coupling.
3. Keep CI, tests, and tooling aligned as new modules land.
4. Introduce shared packages without turning them into uncontrolled dependency paths.

### Supporting Evidence

1. Active lane growth across planning and implementation artifacts now spans RouteShyft, ConnectShyft, and SignShyft.
2. Existing ConnectShyft neighbor model already includes shared-phone behavior (`is_shared`) and manual merge workflows, which confirms the need for explicit identity/contact-point governance before broad dedupe automation.
3. Patch verification run (2026-03-04) found mixed quality:
   - `01`: valid only with path stripping (`-p4`) due absolute-path prefixes.
   - `02` and `04`: partially stale against current scripts/workflow files.
   - `03`: malformed hunk concatenation.
   - `05` and `06`: parseable but target files/structure not present yet.
   - `07`: check-pass.
   - `08`: check-pass but contains invalid JSON quoting in scaffold commands.

## 2. Impact Analysis

### Epic Impact

1. Existing implementation epics for RouteShyft/ConnectShyft are impacted by path and project-target changes.
2. A new monorepo/lane-isolation foundation epic is required before further lane feature expansion.
3. Current lane work can continue only if migration is done in staged, non-breaking passes.

### Story Impact

1. Current and near-term stories that reference `src/` or `frontend/` paths will require updates.
2. CI/test stories tied to current test locations must be updated after test split.
3. Identity-related stories must include shared-contact ambiguity handling (shared phone/email) and no-auto-merge safeguards.

### Artifact Conflicts

1. PRD/architecture assumptions still reference pre-workspace layout in several places.
2. Script and CI contracts partially assume old file paths.
3. Patch bundle is not safe for blind application due stale/malformed components.

### Technical Impact

1. Repo layout migration (`apps/*`, `packages/*`, `tooling/*`, `tests/*`).
2. Nx workspace policy and lane boundary enforcement.
3. Transitional route/router mounting while lane extraction occurs.
4. Identity dedupe policy formalization for shared contacts.

## 3. Recommended Approach

### Selected Path
Hybrid of:

1. Direct Adjustment (primary): staged monorepo migration with lane extraction.
2. Targeted Scope Control (secondary): defer broad identity auto-merge until shared-contact policy is implemented safely.

### Rationale

1. Preserves delivery momentum while reducing structural risk.
2. Avoids double-work by moving once, then extracting lanes on stable paths.
3. Prevents identity corruption by explicitly handling shared phone/email ambiguity.
4. Converts patch files from "apply blindly" into "validate, salvage, rewrite where stale" workflow.

### Option Evaluation

1. Option 1 (Direct adjustment): Viable.
   - Effort: High
   - Risk: Medium
   - Timeline impact: Moderate
2. Option 2 (Rollback): Not viable.
   - Effort: High
   - Risk: High
   - Timeline impact: High
3. Option 3 (MVP review/scope reduction): Partially viable as a safety overlay.
   - Effort: Low
   - Risk: Low
   - Timeline impact: Low

## 4. Detailed Change Proposals

### A. Repo Structure and Workspace

#### Change A1: Workspace scaffold first

OLD:

- Mixed root layout (`src/`, `frontend/`, mixed scripts/tests assumptions).

NEW:

- Workspace scaffold with `pnpm-workspace.yaml`, root orchestrator scripts, shared `tsconfig.base.json`, and Nx config.

Rationale:

Creates stable target paths for all follow-on moves and boundary rules.

#### Change A2: Mechanical moves with history preservation

OLD:

- `src/` and `frontend/` at root.

NEW:

- `apps/moneyshyft-api`
- `apps/moneyshyft-web`

Rationale:

Enables lane extraction and package boundaries while preserving git history.

### B. Lane Isolation Enforcement

#### Change B1: Explicit lane boundary rules

OLD:

- Lane separation relies mainly on convention and policy scripts.

NEW:

- Nx tags + boundary policy:
  - Cross-lane imports forbidden by default.
  - Shared dependencies limited to `packages/shared-*`.
  - Package public API via `src/index.ts`, no deep imports.

Rationale:

Prevents bleed-through between MoneyShyft, RouteShyft, and ConnectShyft.

#### Change B2: Lane extraction transition strategy

OLD:

- Lane code embedded in MoneyShyft app paths.

NEW:

- Extract obvious seams using `git mv` to:
  - `apps/connectshyft-api`, `apps/connectshyft-web`
  - `apps/routeshyft-api`, `apps/routeshyft-web`
- Keep temporary host mounting/import bridge until standalone apps are operational.

Rationale:

Safest two-pass isolation: move first, decouple runtime second.

### C. Shared Identity and Dedupe Policy

#### Change C1: Shared-contact-safe dedupe contract

OLD:

- Neighbor merge is explicit/manual; shared phone exists; no global contact-point dedupe contract.

NEW:

- Dedupe rules:
  1. Auto-merge only on verified, non-shared exact contact-point match.
  2. No auto-merge on shared/unverified contact points.
  3. Conflicts return `IDENTITY_MATCH_AMBIGUOUS` for manual resolution.

Rationale:

Supports real-world shared phone/email without identity corruption.

#### Change C2: Service-ready identity boundary (module-now)

OLD:

- Identity logic distributed in lane modules.

NEW:

- Service-shaped identity module interface (in-process now, extractable later), with idempotency and explicit error contracts.

Rationale:

Balances speed now with future service extraction.

### D. Patch Intake Governance

#### Change D1: Verified patch application policy

OLD:

- Patch bundle treated as direct migration path.

NEW:

- Patch-by-patch gating:
  1. Apply clean patches as-is (`01` with `-p4`, `07` with review).
  2. Repair stale patches (`02`, `04`) manually against current code.
  3. Rebuild malformed patch (`03`) from intent, not raw file.
  4. Defer structure-dependent patches (`05`, `06`) until post-move layout exists.
  5. Fix invalid JSON in `08` before any apply.

Rationale:

Avoids introducing hidden breakage from stale/malformed patch content.

## 5. Implementation Handoff

### Scope Classification
Major

### Handoff Recipients and Responsibilities

1. Product Owner / Scrum Master
   - Re-sequence affected stories around monorepo foundation first.
   - Track migration checkpoint gates.
2. Architect / Platform lead
   - Approve lane boundary and shared-package contract.
   - Approve identity dedupe safeguards and manual-resolution path.
3. Development team
   - Execute phased migration and lane extraction.
   - Repair/rebuild stale and malformed patch intents.
4. QA/Release
   - Validate no regression across existing lane behavior.
   - Verify CI and test split parity after moves.

### Success Criteria

1. Workspace scaffold merged with green CI.
2. MoneyShyft apps moved under `apps/` with preserved behavior.
3. ConnectShyft and RouteShyft seams extracted with transitional runtime stability.
4. Lane boundary checks block cross-lane imports.
5. Shared-contact dedupe ambiguity handled explicitly without auto-merge errors.
6. Patch intake process formalized; no blind patch applies.

## 6. Checklist Completion Snapshot

### Section 1 - Trigger and Context

1. 1.1 Triggering story: [N/A] Planning-discovered change (no prior story)
2. 1.2 Core problem definition: [x] Done
3. 1.3 Evidence gathered: [x] Done

### Section 2 - Epic Impact Assessment

1. 2.1 Current epic viability: [!] Action-needed (re-sequencing required)
2. 2.2 Epic-level changes: [x] Done
3. 2.3 Remaining epic impacts: [x] Done
4. 2.4 New/invalidated epics: [x] Done
5. 2.5 Priority/order changes: [x] Done

### Section 3 - Artifact Conflict Analysis

1. 3.1 PRD conflict review: [x] Done
2. 3.2 Architecture conflict review: [x] Done
3. 3.3 UX conflict review: [N/A] No blocking UX redesign needed for this structural change
4. 3.4 Other artifact impacts: [x] Done

### Section 4 - Path Forward Evaluation

1. 4.1 Direct adjustment: [x] Viable
2. 4.2 Potential rollback: [x] Not viable
3. 4.3 MVP review: [x] Viable as a scoped overlay
4. 4.4 Selected approach: [x] Done (Hybrid: Option 1 + scoped Option 3 controls)

### Section 5 - Proposal Components

1. 5.1 Issue summary: [x] Done
2. 5.2 Epic/artifact adjustment summary: [x] Done
3. 5.3 Recommended path with rationale: [x] Done
4. 5.4 MVP impact/action plan: [x] Done
5. 5.5 Handoff plan: [x] Done

### Section 6 - Final Review and Handoff

1. 6.1 Checklist completion review: [x] Done
2. 6.2 Proposal accuracy review: [x] Done
3. 6.3 User approval status: [x] Done (approved: 2026-03-04)
4. 6.4 Sprint status update: [x] Done (course correction recorded in sprint-status.yaml)
5. 6.5 Final handoff confirmation: [x] Done

## 7. Approval and Routing Record

### Approval

1. Proposal approval: Yes
2. Approval date: 2026-03-04
3. Approved scope classification: Major

### Implementation Routing

1. Primary route: Product Manager / Solution Architect
2. Execution route: Development team with QA/Release validation support

### Handoff Deliverables Confirmed

1. Sprint Change Proposal document: finalized
2. Explicit change proposals (repo, lane boundaries, identity dedupe, patch governance): finalized
3. Implementation handoff plan and responsibility map: finalized

### Workflow Execution Log

1. Runner: Correct Course workflow (`_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`)
2. Execution mode: Batch
3. Trigger type: planning-discovered change (no pre-existing story ID)
