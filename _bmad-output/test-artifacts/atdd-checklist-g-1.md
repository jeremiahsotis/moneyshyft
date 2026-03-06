---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-06T12:00:30Z'
---

# ATDD Checklist - Epic g, Story 1: Design Tokens and Shared Conversation Primitives

**Date:** 2026-03-06
**Author:** Jeremiah
**Primary Test Level:** E2E

## Story Summary

Story `g-1` defines a shared ConnectShyft visual foundation: tokenized color/type/spacing/radius/shadow/breakpoints, reusable conversation primitives across Inbox/Mine/Thread, display-safe rendering, and consistent responsive behavior.

## Acceptance Criteria

1. Design tokens are defined for color, type, spacing, radius, shadows, and breakpoints.
2. Inbox, Mine, and Thread use reusable conversation primitives for queue cards, pills, thread headers, message bubbles, voicemail cards, composer, and thread action bar.
3. Primary UI copy suppresses raw internal fields (IDs, raw priority integers, routing metadata).
4. Mobile/tablet/desktop layouts preserve tokenized spacing/typography scales and touch-target constraints.

## Workflow Step Outputs

- Step 1 preflight completed:
  - Story source loaded: `_bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md`.
  - Policy gate remediated from protected branch (`codex/dev`) by creating story branch `codex/story-g-1-connectshyft-design-tokens-and-shared-conversation-primitives`.
  - Mandatory commands passed:
    - `npm run policy:check`
    - `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md`
  - Framework context loaded from `playwright.config.ts` and existing ConnectShyft ATDD patterns (`ux-r1`, `ux-r2`, `c-3`).
- Step 2 selected **AI generation** mode:
  - Story ACs are explicit and current contracts/patterns already exist in repository context.
  - Recording mode not required for this RED-phase generation pass.
- Step 3 strategy selected dual-level RED coverage:
  - API contract checks for design-token publication, shared primitive contract presence, display-safe projection rules, and responsive contract metadata.
  - E2E checks for token variable presence, primitive reuse across surfaces, UI copy suppression, and responsive typography/tap-target behavior.
- Step 4 outputs saved:
  - `/tmp/tea-atdd-api-tests-2026-03-06T12-00-30-400Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-03-06T12-00-30-400Z.json`
  - `/tmp/tea-atdd-summary-2026-03-06T12-00-30-400Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/api-g-1-2026-03-06T12-00-30-400Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-g-1-2026-03-06T12-00-30-400Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-g-1-2026-03-06T12-00-30-400Z.json`
- Step 5 validation completed:
  - Generated tests are RED-phase (`test.skip`) and contain no placeholder assertions.
  - Temp artifacts are stored under `_bmad-output/test-artifacts/atdd-temp/` (with mirrored `/tmp/tea-atdd-*` subprocess files).
  - Discovery check passed: `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts --list` (8 tests discovered).
  - Execution check passed: `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts` (8 skipped as expected for RED phase).
  - CLI/browser sessions were not used in this run; no orphan session cleanup required.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryG1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryG1.fixture.ts`

## Mock Requirements

- No new third-party external mock service is required for RED-phase test generation.
- Tests assume existing ConnectShyft API envelope/read contracts remain the baseline while g-1 token/primitive contracts are implemented.

## Required data-testid Attributes

- `connectshyft-inbox-surface`
- `connectshyft-thread-surface`
- `connectshyft-thread-card-body`
- `connectshyft-thread-card-primary-action`
- `connectshyft-queue-card`
- `connectshyft-urgency-pill`
- `connectshyft-thread-header`
- `connectshyft-message-bubble`
- `connectshyft-voicemail-card`
- `connectshyft-composer`
- `connectshyft-thread-action-bar`
- `connectshyft-responsive-mode-mobile`
- `connectshyft-responsive-mode-tablet`
- `connectshyft-responsive-mode-desktop`

## Implementation Checklist

- [ ] Define and publish shared design token contract groups (color, typography, spacing, radius, shadow, breakpoints).
- [ ] Ensure token CSS variables exist and are consumed by ConnectShyft surfaces.
- [ ] Replace per-view one-off markup in Inbox/Mine/Thread with reusable conversation primitives.
- [ ] Publish/reuse primitive contract metadata across API/UI payloads where applicable.
- [ ] Enforce display-safe primary copy mappings and suppress raw IDs/priority/routing metadata in volunteer-facing copy.
- [ ] Validate responsive tokenized typography and min touch-target constraints at mobile/tablet/desktop breakpoints.
- [ ] Remove `test.skip` and make all generated API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Root workspace dependencies were updated (`@playwright/test`, `playwright`, `jsonwebtoken`); downstream CI/local environments should install from the updated lockfile before running specs.
- API assertions intentionally expect explicit token/primitive/display-safe contract publication and are designed to fail until g-1 implementation lands.
- E2E selectors assume deterministic `data-testid` rollout for all shared primitives and responsive-mode markers.

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `fixture-architecture.md`
- `network-first.md`
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
- `api-testing-patterns.md`
