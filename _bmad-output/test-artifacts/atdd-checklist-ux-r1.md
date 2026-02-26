---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-26T09:43:28Z'
---

# ATDD Checklist - Epic UX, Story r1: Mobile-First Inbox/Mine/Thread Redesign

**Date:** 2026-02-26
**Author:** Jeremiah
**Primary Test Level:** E2E

## Story Summary

Story `ux-r1` introduces a mobile-first interaction model for ConnectShyft Inbox, Mine, and Thread Detail with explicit bottom navigation, readable large-card contracts, and state-explicit action discoverability across responsive breakpoints.

## Acceptance Criteria

1. Persistent bottom navigation keeps `Inbox`, `Mine`, and `More` visible with no hidden fourth primary tab.
2. Inbox and Mine cards honor readability/touch constraints (`>=16px` body text, `>=44px` primary tap targets).
3. Thread detail prioritizes neighbor/conference context and preserves explicit state action sets:
   - `UNCLAIMED`: Call, Text, Claim
   - `CLAIMED`: Call, Text, Close
   - `CLOSED`: Call, Send Message
4. Mobile, tablet, and desktop breakpoints preserve context, voicemail indicators, and action discoverability without hidden policy paths.

## Workflow Step Outputs

- Step 1 preflight completed:
  - Resolved story context from `_bmad-output/implementation-artifacts/ux-r1-mobile-first-inbox-mine-thread-redesign.md`.
  - Passed mandatory policy/workflow gates on story branch `codex/story-u-1-connectshyft-mobile-first-inbox-mine-thread-redesign`.
  - Loaded framework context from `playwright.config.ts` and existing ConnectShyft ATDD patterns (`a-1`, `c-3`, `c-4`).
- Step 2 selected **AI generation** mode (browser recording not required for this story baseline).
- Step 3 strategy selected dual-level RED coverage:
  - API contracts for nav/card/action/readability/responsive metadata invariants.
  - E2E journeys for persistent bottom-nav, large-card ergonomics, action matrix visibility, and breakpoint parity.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-ux-r1-2026-02-26T09-43-28Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-ux-r1-2026-02-26T09-43-28Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-ux-r1-2026-02-26T09-43-28Z.json`
- Step 5 validation completed:
  - All generated tests are RED-phase (`test.skip`).
  - No placeholder assertions detected.
  - Temp artifacts stored under `_bmad-output/test-artifacts/atdd-temp/`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/ux-r1-mobile-first-inbox-mine-thread-redesign.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/ux-r1-mobile-first-inbox-mine-thread-redesign.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryUxR1Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryUxR1.fixture.ts`

## Mock Requirements

- No new external third-party mocks required for baseline UX red-phase scaffolding.
- Existing ConnectShyft API contract routes remain the source of truth for seeded UI behavior.

## Required data-testid Attributes

- `connectshyft-bottom-nav`
- `connectshyft-bottom-nav-inbox`
- `connectshyft-bottom-nav-mine`
- `connectshyft-bottom-nav-more`
- `connectshyft-bottom-nav-hidden-primary-tab`
- `connectshyft-thread-card-body`
- `connectshyft-thread-card-primary-action`
- `connectshyft-thread-header-neighbor-context`
- `connectshyft-thread-header-conference-context`
- `connectshyft-voicemail-indicator`
- `connectshyft-thread-actions`
- `connectshyft-hidden-policy-path`

## Implementation Checklist

- [ ] Implement persistent bottom navigation for `Inbox`, `Mine`, and `More` with no hidden fourth primary tab.
- [ ] Implement large-card hierarchy contract for Inbox/Mine rows (`minBodyTextPx >= 16`, `primaryActionMinTapTargetPx >= 44`).
- [ ] Implement thread header context prioritization (neighbor + conference) across detail views.
- [ ] Keep state-explicit action matrix parity across lifecycle states (UNCLAIMED/CLAIMED/CLOSED).
- [ ] Preserve voicemail indicator discoverability in Mine and Thread Detail across breakpoints.
- [ ] Remove `test.skip` and make all generated API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/ux-r1-mobile-first-inbox-mine-thread-redesign.atdd.api.spec.ts tests/e2e/platform/ux-r1-mobile-first-inbox-mine-thread-redesign.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Story key `ux-r1` is not policy-normalized as `<epic>-<story>`; branch gating was remediated using policy-compatible branch ID `u-1` while preserving story artifact naming.
- API assertions for new UX metadata (navigation/readability/responsive contracts) are intentionally RED and will fail until backend/read-contract payloads are extended.
- E2E selectors assume explicit data-testid rollout in the UI redesign work.

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
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
- `test-levels-framework.md`
