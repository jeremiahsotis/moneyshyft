# Implementation Plan: CS-001 Lane Convergence

**Branch**: `001-cs-001-lane-convergence` | **Date**: 2026-03-10 | **Spec**: `/specs/connectshyft-recovery/issues/cs-001-lane-convergence/spec.md`
**Input**: Feature specification from `/specs/connectshyft-recovery/issues/cs-001-lane-convergence/spec.md`  
**Source Input**: `/specs/connectshyft-recovery/issues/CS-001_Lane_Convergence_Guardrailed_Spec.md`

## Summary

Converge all ConnectShyft UI rendering into `apps/connectshyft-web`, migrate required ConnectShyft UI primitives from `apps/moneyshyft-web`, remove duplicate ConnectShyft UI from `moneyshyft-web`, and retarget routes/CI build-test wiring so ConnectShyft UI is served and tested only from `connectshyft-web`.

## Technical Context

**Language/Version**: TypeScript 5.6, Vue 3 SFC, Node.js scripts  
**Primary Dependencies**: Vue Router 4, Pinia 2, Vite 7, Nx 20, Playwright  
**Storage**: N/A for frontend artifacts; backend APIs remain source of persisted data  
**Testing**: Playwright E2E/ATDD, Nx targets, policy checks  
**Target Platform**: Web SPA (desktop/tablet/mobile responsive)  
**Project Type**: Monorepo web application (multi-lane frontend/backend)  
**Performance Goals**: Preserve current ConnectShyft UX behavior with no route responsiveness regression greater than 10% for `/app/connectshyft/inbox -> /app/connectshyft/threads/:threadId -> /app/connectshyft/more` in local Playwright trace comparisons; no regression to lane availability  
**Constraints**: No redesign, no framework migration, no ProgramShyft/CaseShyft changes, CI must fail if ConnectShyft UI remains in `moneyshyft-web`  
**Scale/Scope**: 2 frontend apps (`connectshyft-web`, `moneyshyft-web`), ConnectShyft routes/components/features only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS (no admin-web/admin-api ownership change).
- Lane isolation preserved: PASS (removes cross-lane ConnectShyft UI duplication).
- Routing delegation preserved: PASS (lane frontend route changes only; API delegation untouched).
- Deployment topology preserved: PASS (no topology changes; frontend ownership clarified).
- Database ownership preserved: PASS (no migration authority change).
- Security boundaries preserved: PASS (no public API exposure changes).
- Workflow compliance: PASS (plan/research/data-model/contracts/quickstart generated from CS-001).
- Acceptance criteria present: PASS (single frontend, UI parity targets, CI target correction included).

## Project Structure

### Documentation (this feature)

```text
specs/connectshyft-recovery/issues/cs-001-lane-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── ui-ownership-contract.md
    ├── route-convergence-contract.md
    └── build-target-convergence-contract.md
```

### Source Code (repository root)

```text
apps/
├── connectshyft-web/
│   └── src/
│       ├── components/connectshyft/
│       ├── features/connectshyft/
│       ├── views/ConnectShyft/
│       └── router/index.ts
└── moneyshyft-web/
    └── src/
        ├── components/connectshyft/
        ├── features/connectshyft/
        ├── views/ConnectShyft/
        └── router/index.ts

scripts/
├── ci-run-playwright-stack.sh
└── run-playwright-with-preflight.sh

.github/workflows/
├── test.yml
└── burn-in.yml
```

**Structure Decision**: Keep ConnectShyft UI only in `apps/connectshyft-web`; treat `apps/moneyshyft-web` ConnectShyft UI directories/routes as migration source then removal targets.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Gate Re-check After Design

- Constitution gates remain PASS after design artifacts.
- No unresolved clarifications remain.
