# Phase 0 Research: CS-001 Lane Convergence

## Clarification Resolution

No remaining `NEEDS CLARIFICATION` items after repository and spec inspection.

## Decision 1: Authoritative ConnectShyft UI lane

- Decision: `apps/connectshyft-web` is the sole owner for ConnectShyft UI rendering.
- Rationale: CS-001 outcome and execution packet explicitly require one authoritative frontend and forbid new ConnectShyft UI in `moneyshyft-web`.
- Alternatives considered:
  - Keep dual rendering in both apps: rejected (violates CS-001).
  - Keep routes in `moneyshyft-web` but redirect: rejected (still duplicates ownership and test complexity).

## Decision 2: Components that belong in `connectshyft-web`

- Decision: All ConnectShyft-specific UI primitives belong in `apps/connectshyft-web/src/components/connectshyft`, including the currently money-only primitives:
  - `ConnectShyftComposer.vue`
  - `ConnectShyftMessageBubble.vue`
  - `ConnectShyftPill.vue`
  - `ConnectShyftQueueCard.vue`
  - `ConnectShyftThreadActionBar.vue`
  - `ConnectShyftThreadHeader.vue`
  - `ConnectShyftVoicemailCard.vue`
  - `connectShyftTokens.ts`
  - `ConnectShyftPrimaryNav.vue` (already present in both; keep one copy in connect lane)
- Rationale: these components are ConnectShyft domain UI and are consumed by ConnectShyft views; lane convergence requires they be sourced from the ConnectShyft app.
- Alternatives considered:
  - Inline all markup in views and delete component primitives: rejected (higher drift risk, lower reuse/testability).
  - Move to shared package immediately: rejected for CS-001 scope; can be follow-up extraction.

## Decision 3: Components/files to migrate before deletion

- Decision: Migrate money-only ConnectShyft UI artifacts required for feature parity:
  - `views/ConnectShyft/ConnectShyftDirectoryView.vue`
  - `features/connectshyft/settingsAccess.ts`
  - Any view logic in money ConnectShyft views that is richer than current connectshyft-web equivalents and needed for prototype parity.
- Rationale: preserves behavior while converging ownership.
- Alternatives considered:
  - Delete without migration: rejected (behavior regression and parity loss risk).

## Decision 4: Components/files to delete from `moneyshyft-web`

- Decision: After migration completion, delete ConnectShyft UI ownership from money lane:
  - `src/views/ConnectShyft/*`
  - `src/components/connectshyft/*`
  - `src/features/connectshyft/*` (or leave only pure non-UI shared abstractions if explicitly extracted and imported from shared location)
- Rationale: enforces single frontend authority and prevents future drift.
- Alternatives considered:
  - Keep dormant copies: rejected (drift + accidental route reactivation risk).

## Decision 5: Route convergence

- Decision:
  - Remove all `/app/connectshyft/*` routes from `apps/moneyshyft-web/src/router/index.ts`.
  - Ensure required ConnectShyft routes exist in `apps/connectshyft-web/src/router/index.ts`, including:
    - `/app/connectshyft/inbox`
    - `/app/connectshyft/mine`
    - `/app/connectshyft/more`
    - `/app/connectshyft/settings`
    - `/app/connectshyft/threads/:threadId`
    - `/app/connectshyft/settings/availability`
    - `/app/connectshyft/settings/numbers`
    - `/app/connectshyft/settings/escalation`
    - `/app/connectshyft/neighbors/new`
    - `/app/connectshyft/neighbors/:neighborId`
    - `/app/connectshyft/directory` (if retaining directory workflow)
- Rationale: eliminates split route ownership.
- Alternatives considered:
  - Keep a subset in money lane: rejected (not single-source rendering).

## Decision 6: Build/test target convergence

- Decision:
  - Update Playwright stack startup scripts to run `apps/connectshyft-web` for ConnectShyft suites instead of `apps/moneyshyft-web`.
  - Update workflow assumptions and labels to ConnectShyft-aware naming where applicable.
  - Add guard in CI/policy scripts to fail when ConnectShyft UI files exist under `apps/moneyshyft-web/src/views/ConnectShyft` or `src/components/connectshyft`.
  - Keep `nx run connectshyft-web:build` as authoritative build target for ConnectShyft UI verification.
- Rationale: CI must validate the true owner app, not legacy lane.
- Alternatives considered:
  - Keep shared global stack pinned to money frontend: rejected (tests wrong app).

