---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-06T15:57:48Z'
---

# ATDD Checklist - Epic g, Story 2: Inbox and Mine Surface Rebuild

**Date:** 2026-03-06
**Author:** Jeremiah
**Primary Test Level:** E2E

## Story Summary

Story `g-2` rebuilds Inbox/Mine into calmer queue-first triage surfaces: card-level row interaction, display-safe volunteer copy, persistent queue search, deterministic urgency ordering, responsive queue-thread layouts, and stable voicemail ownership behavior for claimed threads.

## Acceptance Criteria

1. Given Inbox or Mine is rendered, when thread rows are displayed, then each row is a card-level tap target with human-readable summary, preview, timestamp, and context pills.
2. Given volunteer-primary queue surfaces are rendered, when content is mapped from backend contracts, then raw state chips, priority integers, number IDs, and webhook/system metadata are not primary UI copy.
3. Given queue ordering is evaluated, when records are returned, then ordering remains deterministic and maps to human urgency language; queue search remains persistent in Inbox and Mine.
4. Given responsive behavior is exercised, when users move between queue and thread, then mobile opens thread full-screen, tablet defaults to split queue/thread, and desktop supports three-column workflow.
5. Given voicemail events are present, when queue cards are rendered, then claimed-thread voicemail remains in Mine and indicators are visible without ownership churn.

## Workflow Step Outputs

- Step 1 preflight completed:
  - Story source loaded: `_bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md`.
  - Mandatory policy gate remediated from protected branch (`codex/dev`) to story branch `codex/story-g-2-connectshyft-inbox-and-mine-surface-rebuild`.
  - Mandatory commands passed:
    - `npm run policy:check`
    - `npm run branch:ensure-workflow -- --lane connectshyft --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md`
  - Framework context loaded from `playwright.config.ts` with existing ConnectShyft ATDD patterns.
- Step 2 selected **AI generation** mode:
  - Story ACs are explicit and existing ConnectShyft ATDD patterns provide stable generation anchors.
  - Recording mode not required for this RED-phase generation pass.
- Step 3 strategy selected dual-level RED coverage:
  - API contract checks for card-safe queue projection, display-safe copy suppression, deterministic urgency ordering, and voicemail mine/inbox ownership behavior.
  - E2E checks for full-card queue interactions, persistent search behavior, responsive queue-thread layouts by breakpoint, and voicemail indicator ownership stability.
- Step 4 outputs saved:
  - `/tmp/tea-atdd-api-tests-2026-03-06T15-57-48Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-03-06T15-57-48Z.json`
  - `/tmp/tea-atdd-summary-2026-03-06T15-57-48Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/api-g-2-2026-03-06T15-57-48Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-g-2-2026-03-06T15-57-48Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-g-2-2026-03-06T15-57-48Z.json`
- Step 5 validation completed:
  - Generated tests are RED-phase (`test.skip`) and contain no placeholder assertions.
  - Discovery check passed: `npx playwright test tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts --list` (8 tests discovered).
  - Execution check passed: `npx playwright test tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts` (8 skipped as expected for RED phase).
  - CLI/browser sessions were not used in this run; no orphan session cleanup required.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryG2Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryG2.fixture.ts`
- Helper: `tests/helpers/connectShyftStoryG2.ts`

## Mock Requirements

- No new third-party service mock is required for RED-phase generation.
- Tests assume existing ConnectShyft envelope/read-contract infrastructure while asserting new g-2 queue-surface contract behavior.

## Required data-testid Attributes

- `connectshyft-inbox-surface`
- `connectshyft-queue-card`
- `connectshyft-queue-card-tap-target`
- `connectshyft-queue-card-summary`
- `connectshyft-queue-card-preview`
- `connectshyft-queue-card-timestamp`
- `connectshyft-queue-context-pill`
- `connectshyft-queue-search-input`
- `connectshyft-bottom-nav-inbox`
- `connectshyft-bottom-nav-mine`
- `connectshyft-thread-surface`
- `connectshyft-queue-panel`
- `connectshyft-thread-panel`
- `connectshyft-tertiary-panel`
- `connectshyft-layout-mobile-thread-fullscreen`
- `connectshyft-layout-tablet-split`
- `connectshyft-layout-desktop-three-column`
- `connectshyft-thread-id-chip` (must remain absent on volunteer-primary queue surface)
- `connectshyft-inbox-item-priority-rank` (must remain absent on volunteer-primary queue surface)
- `connectshyft-raw-state-chip` (must remain absent on volunteer-primary queue surface)
- `connectshyft-system-metadata-chip` (must remain absent on volunteer-primary queue surface)

## Implementation Checklist

- [ ] Add queue card contract fields for `display.preview`, `display.timestampLabel`, and `display.contextPills` across Inbox and Mine payload mapping.
- [ ] Implement card-level queue row tap-target semantics (`connectshyft-queue-card-tap-target`) with preserved accessibility labels.
- [ ] Ensure volunteer-primary copy remains display-safe and suppresses raw IDs, raw state chips, priority integers, and webhook/system metadata from primary queue copy.
- [ ] Preserve deterministic queue ordering contract (`priorityRank ASC`, `lastActivityAtUtc DESC`, `threadId ASC`) and human urgency language mapping.
- [ ] Implement persistent queue search state across Inbox/Mine navigation and refresh.
- [ ] Implement responsive queue/thread layouts: mobile full-screen thread, tablet split queue-thread, desktop three-column workflow.
- [ ] Preserve voicemail ownership semantics so claimed voicemail cards remain in Mine with visible indicators and no ownership churn into Inbox.
- [ ] Remove `test.skip` and make all generated API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts --list
```

## Key Risks and Assumptions

- g-2 context is intentionally anchored to existing g-1 seeded tenant/orgUnit data for deterministic RED-phase generation and future green-phase execution.
- E2E selectors intentionally require new layout/search/tap-target markers; these tests are expected to fail once `test.skip()` is removed until g-2 implementation lands.
- Queue search persistence currently assumes URL-backed state (`queueSearch` query param) for cross-route and refresh durability.

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
