---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-07T16:12:51Z'
---

# ATDD Checklist - Epic g, Story 6: Volunteer Contract Boundary and Regression Hardening

**Date:** 2026-03-07  
**Author:** Jeremiah  
**Primary Test Level:** API + E2E

## Story Summary
Story g.6 enforces a volunteer-first contract boundary and adds regression gates to prevent UI drift toward admin/system-first data exposure while locking lifecycle behavior around CLOSED-thread outbound/inbound actions.

## Acceptance Criteria
1. Volunteer UI consumes display-safe fields and suppresses raw internal metadata by default.
2. Regression coverage verifies internal-field suppression, voicemail behavior lock, responsive behavior, and accessibility/action-feedback consistency.
3. Outbound actions on CLOSED threads preserve same-thread reopen semantics with deterministic feedback.
4. Inbound webhook activity on CLOSED threads does not auto-reopen and preserves locked routing behavior.

## Failing Tests Created (RED Phase)
### API Tests (5)
- `tests/api/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.api.spec.ts`
- `[G6-ATDD-API-001][P0]` display-safe volunteer contract suppression
- `[G6-ATDD-API-002][P0]` voicemail behavior lock contract
- `[G6-ATDD-API-003][P0]` CLOSED outbound same-thread lifecycle contract
- `[G6-ATDD-API-004][P0]` CLOSED inbound no-auto-reopen contract
- `[G6-ATDD-API-005][P1]` feedback taxonomy consistency contract

### E2E Tests (8)
- `tests/e2e/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.spec.ts`
- `[G6-ATDD-E2E-001][P0]` volunteer surface suppression
- `[G6-ATDD-E2E-002][P0]` voicemail behavior lock
- `[G6-ATDD-E2E-003][P0]` CLOSED outbound UI lifecycle lock
- `[G6-ATDD-E2E-004A/B/C][P1]` responsive layout contracts
- `[G6-ATDD-E2E-005][P1]` accessibility + feedback semantics
- `[G6-ATDD-E2E-006][P0]` CLOSED inbound lock in UI

All RED-phase tests are intentionally marked with `test.skip(...)`.

## Data Factories Created
- `tests/support/factories/connectShyftStoryG6Factory.ts`
- `createStoryG6Context(overrides?)`
- `createStoryG6Headers(context, overrides?)`
- `buildStoryG6SurfaceUrl(...)`
- `buildStoryG6ThreadDetailUrl(...)`

## Fixtures Created
- `tests/support/fixtures/connectShyftStoryG6.fixture.ts`
- `storyG6Context`
- `storyG6VolunteerHeaders`
- `storyG6AdminHeaders`
- `storyG6ViewerHeaders`
- `storyG6InboxQuery` / `storyG6MineQuery`
- `storyG6OutboundCallPayload`
- `storyG6InboundClosedPayload`

## Mock Requirements
1. Inbound webhook payload support for CLOSED-thread missed-call events.
2. Thread detail contracts with lifecycle and feedback fields.
3. Queue display contracts that suppress internal fields in volunteer surfaces.

## Required data-testid Attributes
- `connectshyft-inbox-surface`
- `connectshyft-queue-card`
- `connectshyft-queue-card-tap-target`
- `connectshyft-thread-surface`
- `connectshyft-thread-timeline-event-voicemail`
- `connectshyft-thread-state-chip`
- `connectshyft-thread-reopened-toast`
- `connectshyft-thread-inbound-auto-reopen-indicator`
- `connectshyft-layout-mobile-thread-fullscreen`
- `connectshyft-layout-tablet-split`
- `connectshyft-layout-desktop-three-column`
- `connectshyft-bottom-nav-inbox`
- `connectshyft-bottom-nav-mine`
- `connectshyft-bottom-nav-more`
- `connectshyft-live-region-status`
- `connectshyft-feedback-banner`
- Forbidden in volunteer copy: `connectshyft-thread-id-chip`, `connectshyft-raw-state-chip`, `connectshyft-system-metadata-chip`

## Implementation Checklist
- [ ] Implement volunteer display-adapter boundary suppressing raw operational metadata.
- [ ] Lock voicemail behavior across Mine/Inbox/thread timeline contracts.
- [ ] Preserve CLOSED outbound same-thread lifecycle and deterministic success feedback.
- [ ] Preserve CLOSED inbound no-auto-reopen lock and fallback routing.
- [ ] Implement responsive behavior contracts for mobile/tablet/desktop thread interaction.
- [ ] Implement accessibility focus order, aria-label, and live-region feedback semantics.
- [ ] Ensure success/refusal/error feedback taxonomy consistency across action outcomes.
- [ ] Remove `test.skip` from g-6 ATDD tests as implementation turns green.

## Running Tests
```bash
npx playwright test tests/api/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.api.spec.ts --list
npx playwright test tests/e2e/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.spec.ts --list

# After implementation and unskip:
npx playwright test tests/api/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.api.spec.ts
npx playwright test tests/e2e/platform/g-6-volunteer-contract-boundary-and-regression-hardening.atdd.spec.ts
```

## Red-Green-Refactor
- RED ✅: tests/scaffolding generated and intentionally skipped.
- GREEN (next): unskip and implement minimal behavior until all pass.
- REFACTOR: consolidate boundary helpers while preserving green test suite.

## Test Execution Evidence
- API discovery command completed; 5 tests listed.
- E2E discovery command completed; 8 tests listed.
- Total generated: 13 tests.

## Completion Summary
- Story ID: `g-6`
- Primary levels: `API + E2E`
- Tests generated: `13`
- New support files: `2`
- Output checklist: `_bmad-output/test-artifacts/atdd-checklist-g-6.md`
- Temp subprocess outputs:
  - `/tmp/tea-atdd-api-tests-2026-03-07T16-12-51Z.json`
  - `/tmp/tea-atdd-e2e-tests-2026-03-07T16-12-51Z.json`
  - `/tmp/tea-atdd-summary-2026-03-07T16-12-51Z.json`
