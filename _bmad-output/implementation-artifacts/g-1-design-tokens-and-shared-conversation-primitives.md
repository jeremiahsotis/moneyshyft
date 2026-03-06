# Story g.1: Design Tokens and Shared Conversation Primitives

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontend engineer,
I want a single token system and reusable conversation primitives,
so that ConnectShyft surfaces share one visual language across breakpoints without duplicating UI logic.

## Acceptance Criteria

1. Given the ConnectShyft UX rebuild starts, when foundation components are implemented, then design tokens are defined for color, type, spacing, radius, shadows, and breakpoints.
2. Given volunteer-facing surfaces consume shared primitives, when Inbox, Mine, and Thread are rendered, then queue cards, pills, thread headers, message bubbles, voicemail cards, composer, and thread action bar come from reusable primitives instead of per-view one-off markup.
3. Given volunteer-facing screens render operational data, when presentation contracts are applied, then raw internal fields (IDs, raw priority integers, raw routing metadata) are not shown as primary UI content.
4. Given responsive behavior is exercised, when mobile/tablet/desktop layouts are rendered, then tokenized spacing/typography scales consistently and touch-target constraints remain enforced.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Foundation primitives must keep volunteer-facing communication work scannable without exposing backend internals.
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story focuses on reusable UI foundation and display contract safety, not role administration.

## Tasks / Subtasks

- [x] Create ConnectShyft token contract and export surface (AC: 1)
  - [x] Define color, typography, spacing, radius, shadow, and breakpoint scales used by volunteer surfaces.
  - [x] Add token usage guidance in feature-level comments/docs to avoid ad hoc values.
- [x] Build reusable conversation primitives (AC: 2)
  - [x] Implement primitives for queue card, urgency/context pills, thread header, message bubble, voicemail card, composer, and action bar.
  - [x] Ensure primitives expose deterministic test ids and accessibility hooks.
- [x] Enforce display-safe rendering contracts (AC: 3)
  - [x] Route volunteer-primary copy through `uiContracts` sanitization helpers.
  - [x] Replace direct raw-field rendering in Inbox/Thread with display-safe mapped fields.
- [x] Validate responsive and accessibility baseline through primitives (AC: 4)
  - [x] Confirm min tap-target and min body text rules remain centralized and consumed.
  - [x] Add regression checks for mobile/tablet/desktop primitive behavior.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.1.
- NFR alignment: NFR-CS-011 (interaction performance/usability baseline and implementation-testable UX constraints).
- Foundation contract must support downstream stories `g-2` through `g-6`.

### Architecture Compliance

- Keep canonical lifecycle semantics (`UNCLAIMED | CLAIMED | CLOSED`) intact; story changes are presentation-layer only.
- Maintain frontend-backend contract separation: display-safe presentation adapters for volunteer UI.
- Preserve module boundaries and existing `/api/v1/connectshyft/*` route contracts.

### Library / Framework Requirements

- Vue 3.5 + TypeScript strict typing for primitive props and emitted events.
- Tailwind utility usage must flow from shared token constants and reusable classes.
- Reuse existing `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts` safety utilities for forbidden copy/internal token suppression.

### File Structure Requirements

- Add/extend primitives under `apps/moneyshyft-web/src/components/connectshyft/`.
- Keep display-contract mapping under `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts` and `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`.
- Refactor view-level composition only in:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

### Testing Requirements

- Add/extend front-end regression specs for primitive composition and forbidden-field suppression behavior.
- Validate keyboard focus, aria labels, and touch-target constraints for reusable components.
- Validate responsive rendering behavior at mobile/tablet/desktop breakpoints.

### Previous Story Intelligence

- `ux-r1` through `ux-r4` are marked done but user testing on 2026-03-06 found persistent operations-heavy UI drift.
- Current Inbox/Thread views still expose internal technical metadata in primary surface copy.

### Git Intelligence Summary

- Existing implementation already includes display-safety helpers (`sanitizeConnectShyftOperatorCopy`) and action contract utilities, which should be extended rather than replaced.
- Current views include raw metadata chips/labels (`threadId`, number IDs, priority rank) that this story must abstract away.

### Latest Technical Information

- Use current workspace stack from `_bmad-output/project-context.md`:
  - Vue 3.5.13
  - Vite 5.0.11
  - Tailwind 3.4.1
  - TypeScript strict mode

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.1)
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Preserve route-level wiring and keep new UI primitives within existing ConnectShyft feature boundaries.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-1-design-tokens-and-shared-conversation-primitives`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (pass)
- `cat _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml` (pass)
- `rg -n "design token|contract boundary|volunteer" _bmad-output/planning-artifacts/*` (pass)
- `cat apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts` (pass)
- `cat apps/moneyshyft-web/src/features/connectshyft/readContracts.ts` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story g-1-design-tokens-and-shared-conversation-primitives` (pass)
- `npm run build --prefix apps/moneyshyft-web` (pass)
- `npm run test:e2e -- tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts` (pass)
- `npm test` (fail: non-story pre-existing suite failures)
- `npm run branch:ensure-workflow -- --workflow dev-story --story _bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md` (pass)
- `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts --list` (pass)
- `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts --max-failures=1` (blocked: ECONNREFUSED 127.0.0.1:3000)

### Completion Notes List

- Implemented shared ConnectShyft token contract in `connectShyftTokens.ts` and wired required CSS variables/breakpoints in `main.css` and `uiContracts.ts`.
- Added reusable conversation primitives (pill, queue card, thread header, message bubble, voicemail card, composer, thread action bar) and refactored Inbox/Thread detail views to consume them.
- Extended read contract mapping with display-safe conversation fields and routed volunteer-primary copy through sanitization-aware display adapters.
- Removed raw internal priority/thread identifiers from volunteer-primary surfaces (`priorityRank` badge and thread-id chip).
- Expanded `uiContracts` forbidden-copy token list to cover raw priority/routing/thread identifier patterns used by this story lane.
- Tightened g.1 ATDD e2e coverage to assert no raw internal thread ids/rank chips render and to validate keyboard focus plus aria-label hooks.
- Converted g.1 API ATDD suite from RED-phase `test.skip` placeholders to executable contract checks with stable IDs (`G1-ATDD-API-001..004`).
- Removed serial mode from g.1 automate API/E2E suites to restore parallel execution behavior.
- Refactored duplicated g.1 E2E helper logic into `tests/helpers/connectShyftStoryG1.ts` and reduced ATDD E2E file size to 217 lines (under TEA 300-line target).
- Removed fallback masking in ATDD E2E primitive assertions so missing queue/thread primitives fail explicitly.
- Tightened automate API display-safe copy checks to assert every item has operator-primary copy before suppression validation (no skip-through branch).
- Hardened test JWT bootstrap in `tests/support/factories/tenantRepositoryFactory.ts` to provide test fallback secrets when env secrets are absent.
- Re-ran g.1 validation after fixes:
  - `npm run build --prefix apps/moneyshyft-web` ✅
  - `npm run test:e2e -- tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts` ✅ (4/4)
- Current local validation for latest g.1 test updates:
  - `npm run branch:ensure-workflow -- --workflow dev-story --story _bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md` ✅
  - `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts --list` ✅ (8 tests discovered)
  - `npx playwright test tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts --max-failures=1` ⚠️ blocked locally by `ECONNREFUSED 127.0.0.1:3000` (API service not running)
  - `npx playwright test tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts --max-failures=1` ⚠️ blocked locally by `ERR_CONNECTION_REFUSED http://localhost:5174/login` (web app not running)
- Full monorepo `npm test` currently fails outside this story’s changed surface:
  - `moneyshyft-api:test`: `src/__tests__/app-entrypoint-kernel.test.ts` (tenant context expectation mismatch), `src/modules/connectshyft/__tests__/neighbors.test.ts` (`listIdentityBoundaryNeighborsByPhoneValue` missing)
  - `connectshyft-api:test`: `src/modules/connectshyft/__tests__/neighbors.test.ts`
  - `admin-api:test`: `jest: command not found`
  - `e2e:test`: multiple pre-existing failures in non-g.1 suites.

### File List

- .gitignore
- apps/moneyshyft-web/src/assets/main.css
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftComposer.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftMessageBubble.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPill.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftThreadActionBar.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftThreadHeader.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftVoicemailCard.vue
- apps/moneyshyft-web/src/components/connectshyft/connectShyftTokens.ts
- apps/moneyshyft-web/src/features/connectshyft/readContracts.ts
- apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.api.spec.ts
- tests/api/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.api.spec.ts
- tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.atdd.spec.ts
- tests/e2e/platform/g-1-design-tokens-and-shared-conversation-primitives.automate.spec.ts
- tests/helpers/connectShyftStoryG1.ts
- tests/support/factories/tenantRepositoryFactory.ts
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- _bmad-output/implementation-artifacts/g-1-design-tokens-and-shared-conversation-primitives.md

## Senior Developer Review (AI)

Date: 2026-03-06

- Re-ran adversarial review and fixed all previously reported HIGH/MEDIUM story-level issues:
  - raw priority integer removed from queue card primary UI
  - raw thread id chip removed from thread header primary UI
  - forbidden-copy sanitization contract expanded for story-specific internal metadata leakage patterns
  - ATDD assertions strengthened for metadata suppression and accessibility hooks
- Follow-up quality pass resolved g.1 test architecture findings:
  - removed API `test.skip` coverage gaps for AC1-AC4
  - removed unnecessary serial mode from automate suites
  - eliminated primitive-coverage masking fallback branches in ATDD E2E tests
  - extracted shared g.1 E2E helpers and reduced overlong ATDD file
  - tightened per-item operator-copy assertions in automate API tests
- Git/story discrepancy from prior clean-working-tree snapshot was resolved by applying and validating concrete code/test deltas in this review pass.

## Change Log

- 2026-03-06: Created Story g.1 ready-for-dev context document.
- 2026-03-06: Implemented CS-S7.1 token contract, shared conversation primitives, display-safe read mapping, and story-specific regression tests; story advanced to review.
- 2026-03-06: Resolved g.1 code-review findings by removing raw internal metadata from volunteer-primary UI, expanding copy-safety guards, tightening ATDD accessibility/suppression assertions, and adding symlink-safe node_modules ignore coverage.
- 2026-03-06: Resolved TEA review findings by unskipping/rebuilding g.1 ATDD API coverage, removing automate serial mode, refactoring g.1 E2E helpers, eliminating fallback-masked primitive assertions, and tightening display-safe API test checks.
