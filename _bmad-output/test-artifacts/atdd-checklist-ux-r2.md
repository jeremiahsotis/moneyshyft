---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-02-26T11:40:36Z'
---

# ATDD Checklist - Epic UX, Story r2: Accessibility and Language Hardening

**Date:** 2026-02-26
**Author:** Jeremiah
**Primary Test Level:** E2E

## Story Summary

Story `ux-r2` hardens ConnectShyft operator experience for accessibility and plain-language safety. It locks readability/tap-target thresholds, verb-first copy, deterministic keyboard/screen-reader behavior, and explicit outcome taxonomy mapping (`success|refusal|error`) across core interaction surfaces.

## Acceptance Criteria

1. Core surfaces (`Inbox`, `Mine`, `Thread`, `Add Neighbor`, `Close`) enforce minimum `16px` body text and `44px` interactive control targets.
2. Primary actions use verb-first labels and avoid RBAC/internal UUID jargon.
3. Keyboard and screen-reader flows preserve deterministic focus order, accessible names, and announcements.
4. Success/refusal/error feedback copy is plain-language and consistently mapped to canonical taxonomy.

## Workflow Step Outputs

- Step 1 preflight completed:
  - Resolved story context from `_bmad-output/implementation-artifacts/ux-r2-accessibility-and-language-hardening.md`.
  - Passed mandatory policy/workflow gates on story branch `codex/story-u-2-connectshyft-accessibility-and-language-hardening`.
  - Loaded framework context from `playwright.config.ts` and existing ConnectShyft ATDD patterns (`ux-r1`, `c-3`, `c-4`).
- Step 2 selected **AI generation** mode (recording not required for this contract-hardening scope).
- Step 3 strategy selected dual-level RED coverage:
  - API contract checks for accessibility metadata, copy language constraints, deterministic a11y metadata, and envelope taxonomy mapping.
  - E2E checks for rendered typography/tap-target constraints, verb-first labels, keyboard/screen-reader flow, and outcome feedback behavior.
- Step 4 outputs saved:
  - `_bmad-output/test-artifacts/atdd-temp/api-ux-r2-2026-02-26T11-40-36Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/e2e-ux-r2-2026-02-26T11-40-36Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/summary-ux-r2-2026-02-26T11-40-36Z.json`
- Step 5 validation completed:
  - All generated tests are RED-phase (`test.skip`).
  - No placeholder assertions detected.
  - Temp artifacts stored under `_bmad-output/test-artifacts/atdd-temp/` and `/tmp/tea-atdd-*.json`.

## Failing Tests Created (RED Phase)

- API: `tests/api/platform/ux-r2-accessibility-and-language-hardening.atdd.api.spec.ts` (4 tests)
- E2E: `tests/e2e/platform/ux-r2-accessibility-and-language-hardening.atdd.spec.ts` (4 tests)

## Data Factories and Fixtures

- Factory: `tests/support/factories/connectShyftStoryUxR2Factory.ts`
- Fixture: `tests/support/fixtures/connectShyftStoryUxR2.fixture.ts`

## Mock Requirements

- No new third-party external service mocks are required for baseline RED-phase generation.
- Story assumes existing ConnectShyft API contracts remain source-of-truth while ux-r2 accessibility and language contracts are implemented.

## Required data-testid Attributes

- `connectshyft-inbox-surface`
- `connectshyft-thread-surface`
- `connectshyft-thread-card-body`
- `connectshyft-thread-card-primary-action`
- `connectshyft-thread-detail-body-copy`
- `connectshyft-add-neighbor-action`
- `connectshyft-add-neighbor-phone`
- `connectshyft-add-neighbor-submit-action`
- `connectshyft-close-thread-action`
- `connectshyft-thread-action-label`
- `connectshyft-live-region-status`
- `connectshyft-feedback-banner`

## Implementation Checklist

- [ ] Enforce accessibility size contracts (`minBodyTextPx >= 16`, `minTapTargetPx >= 44`) for Inbox, Mine, Thread, Add Neighbor, and Close surfaces.
- [ ] Publish API accessibility contract metadata for those same surfaces so UI and tests share deterministic thresholds.
- [ ] Normalize operator-facing copy to verb-first labels and remove RBAC/UUID/internal token leakage.
- [ ] Implement deterministic keyboard tab order and stable accessible names for core controls.
- [ ] Ensure screen-reader announcements and feedback banners map to `success|refusal|error` taxonomy consistently.
- [ ] Remove `test.skip` and make all generated API/E2E tests pass.

## Running Tests

```bash
npx playwright test tests/api/platform/ux-r2-accessibility-and-language-hardening.atdd.api.spec.ts tests/e2e/platform/ux-r2-accessibility-and-language-hardening.atdd.spec.ts --list
```

## Key Risks and Assumptions

- Story key `ux-r2` is not policy-normalized as `<epic>-<story>`; branch/workflow gating required remapping to policy-compatible branch ID `u-2` while preserving canonical story artifact naming.
- API assertions assume explicit accessibility metadata publication for thresholds/focus/accessibility names; these are intentionally RED until implementation extends contracts.
- E2E selectors assume deliberate data-testid rollout for accessibility and feedback surfaces.

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
- `test-priorities-matrix.md`
