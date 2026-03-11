# Story g.2: Inbox and Mine Surface Rebuild

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a frontline volunteer,
I want Inbox and Mine to feel like calm messaging queues,
so that I can triage quickly without parsing system internals.

## Acceptance Criteria

1. Given Inbox or Mine is rendered, when thread rows are displayed, then each row is a card-level tap target with human-readable summary, preview, timestamp, and context pills.
2. Given volunteer-primary queue surfaces are rendered, when content is mapped from backend contracts, then raw state chips, priority integers, number IDs, and webhook/system metadata are not primary UI copy.
3. Given queue ordering is evaluated, when records are returned, then ordering remains deterministic and maps to human urgency language; queue search remains persistent in Inbox and Mine.
4. Given responsive behavior is exercised, when users move between queue and thread, then mobile opens thread full-screen, tablet defaults to split queue/thread, and desktop supports three-column workflow.
5. Given voicemail events are present, when queue cards are rendered, then claimed-thread voicemail remains in Mine and indicators are visible without ownership churn.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Queue triage is workflow-critical; interface must preserve deterministic behavior while removing backend-centric cognitive load.
- Real-User Validation Evidence: 2026-03-06 product-owner assumption confirmation plus automate execution (`G2-AUTO-E2E-205`) verifying Inbox `Send Message`/`Make Call` propagate selected target phone and message payload through dispatch endpoints.
- Real-User Validation Result: pass (dispatch propagation and queue ownership semantics verified in automated operator flow).
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story addresses volunteer queue UX and does not introduce role-admin management features.

## Tasks / Subtasks

- [x] Rebuild Inbox and Mine queue layouts on shared primitives from g.1 (AC: 1, 4)
  - [x] Replace current mixed card/chip rendering with conversation-card rows and consistent summary metadata placement.
  - [x] Implement responsive interaction model for mobile full-screen thread, tablet split view, and desktop three-column behavior.
- [x] Implement display-safe queue contract mapping (AC: 2)
  - [x] Ensure volunteer surfaces use friendly urgency and context fields only.
  - [x] Remove primary exposure of raw thread id, number id, priority rank, and backend metadata labels.
- [x] Preserve deterministic ordering and persistent search behavior (AC: 3)
  - [x] Keep server-driven ordering contract and map to plain-language urgency pills.
  - [x] Persist query state between Inbox/Mine navigation and refresh actions.
- [x] Lock voicemail indicator behavior for queue ownership semantics (AC: 5)
  - [x] Keep claimed voicemail threads in Mine with visible voicemail indicators.
  - [x] Ensure voicemail events do not force Mine-owned cards back to Inbox.

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.2.
- FR alignment: FR-CS-005, FR-CS-014.
- Depends on `g-1-design-tokens-and-shared-conversation-primitives`.

### Architecture Compliance

- Maintain deterministic inbox ordering contract from architecture and existing read-model policies.
- Keep volunteer display contract separate from raw operational truth.
- Preserve canonical thread states and do not alter lifecycle semantics in queue rendering.

### Library / Framework Requirements

- Use Vue composition patterns currently used in ConnectShyft views.
- Keep token and action-copy wiring through `uiContracts.ts`.
- Reuse `readContracts.ts` mapping layer; do not bypass it with direct envelope reads in templates.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`
  - `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
  - `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`
- Add new queue primitives under `apps/moneyshyft-web/src/components/connectshyft/` as needed.

### Testing Requirements

- Add/extend e2e tests for Inbox/Mine rendering and navigation behavior by breakpoint.
- Add regression assertions that volunteer-primary queue cards do not render forbidden internal-field tokens.
- Validate voicemail indicator behavior for claimed vs unclaimed queue placement.

### Previous Story Intelligence

- `ux-r1` and `ux-r3` delivered mobile-first and voicemail behavior improvements but user testing still reported operations-heavy queue presentation.
- Existing `ConnectShyftInboxView.vue` currently exposes internal identifiers and technical chips as first-order content.

### Git Intelligence Summary

- Current queue implementation already has availability, capability, and refusal patterns that should remain intact.
- Refactor should focus on presentational composition and adapter output, not capability enforcement logic.

### Latest Technical Information

- Frontend stack in workspace remains:
  - Vue 3.5.13
  - Tailwind 3.4.1
  - Vite 5.0.11

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.2)
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep volunteer IA aligned with bottom-nav posture (`Inbox`, `Mine`, `More`) and avoid reintroducing operations-first table framing.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-2-inbox-and-mine-surface-rebuild`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`

## Senior Developer Review (AI)

- 2026-03-06: Resolved 5 review findings and moved prior no-op inbox/thread controls to executable behavior.
- Open question resolved:
  - Question: Should Inbox-level `Claim Thread` / `Take Over Thread` remain available?
  - Answer: No. Removed those Inbox-level controls and kept lifecycle ownership actions scoped to the selected thread surface.
- Applied follow-up behavior changes requested during review remediation:
  - Inbox `Send Message` now opens a neighbor phone selector limited to `prefersTexting=YES`, then ensures thread + dispatches outbound message.
  - Inbox `Make Call` now opens a workflow with dialpad input plus neighbor search/selection, then ensures thread + dispatches outbound call.
  - Thread panel actions/composer now call real lifecycle/outbound endpoints instead of no-op handlers.
  - Queue cards now consume backend `display.preview` (instead of duplicating summary).
  - Added automate E2E behavior checks for send/call workflows and aligned A.1 escalation-off expectations with removed Inbox claim/takeover controls.
- Open-assumption remediation completed:
  - Mine queue now enforces strict actor-owned semantics: `/inbox?bucket=mine` refuses when actor context is missing, and read-model filtering fails closed for missing actor context.
  - Claimed threads are excluded from Inbox for non-owners, so claimed work remains isolated to the claimant's Mine queue.
  - Inbox outbound message/call workflows now propagate selected `targetPhone` (and message `body`) from UI payloads through route handlers into provider adapter dispatch calls.
  - Provider dispatch responses include deterministic `dispatchContext` metadata for `targetPhone` and message-body presence, with regression coverage asserting payload semantics end-to-end.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run build` (apps/moneyshyft-web) (pass)
- `npm run build` (apps/moneyshyft-api) (pass)
- `npm test -- --runInBand src/modules/connectshyft/__tests__/readContracts.test.ts` (apps/moneyshyft-api) (pass)
- `npm test -- --runInBand src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` (apps/moneyshyft-api) (pass)
- `npm test -- --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts` (apps/moneyshyft-api) (pass)
- `npm test -- --runInBand src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` (apps/moneyshyft-api) (pass)
- `npm run test:e2e -- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts` (pass)
- `npm run test:e2e -- tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts` (pass)
- `npm run branch:ensure-workflow -- --workflow dev-story --story g-2-inbox-and-mine-surface-rebuild` (pass)
- `npm run story:status:check` (pass)

### Completion Notes List

- Rebuilt queue cards around a full-card tap target contract with summary, preview, timestamp, urgency/context pills, voicemail indicators, and accessible action hooks.
- Refactored Inbox/Mine surface layout to support mobile full-screen thread, tablet split queue/thread, and desktop three-column queue/thread/context panels with deterministic responsive markers.
- Implemented persistent queue search state synchronized to route query params across Inbox/Mine navigation and reload, while preserving deterministic server-driven row ordering.
- Hardened display-safe read-model presentation by mapping urgency to human labels and keeping internal identifiers/metadata out of volunteer-primary queue copy.
- Added executable g.2 automate coverage (`G2-AUTO-E2E-201..204`) and resolved cross-story regressions by restoring inline thread action/composer primitives and mobile DOM visibility semantics.
- Removed Inbox-level claim/takeover controls and replaced them with Inbox-level `Send Message` and `Make Call` workflows aligned to neighbor selection.
- Implemented Inbox modal workflows for outbound messaging/calling with neighbor targeting, dialpad input, and endpoint-backed dispatch behavior.
- Extended frontend/backend contracts for `display.preview` and neighbor `prefersTexting` so UI behavior follows backend-owned display and opt-in semantics.
- Added behavior assertions for G.2 outbound controls (`G2-AUTO-E2E-205`) and updated A.1 escalation-off expectations to match the new Inbox action surface.
- Propagated `targetPhone` + `body` from Inbox action UX through API route policies into provider dispatch adapters so SMS/call actions execute against selected neighbor numbers.
- Hardened Mine ownership isolation by refusing mine-bucket reads without actor context, fail-closing read-model mine filtering when actor identity is absent, and removing claimed threads from non-owner Inbox queues.
- Expanded backend/e2e assertions to validate dispatch payload semantics (`targetPhone`, `body`) and actor-context refusal behavior.
- Removed serial execution constraints from g.2 automate suites and kept per-test setup deterministic for parallel-safe runs.
- Split oversized provider-registry Jest suites into focused case modules plus shared helpers so each spec remains <=300 lines.
- Replaced runtime option-count branching in g.2 E2E outbound workflow test with deterministic neighbor-response fixture shaping.
- Added additional malformed actor-context API variants (space-only permutations) and validated deterministic refusal envelopes.
- Replaced direct test-local `process.env` mutation in provider-registry signature guardrails with scoped env override helpers.
- Synchronized sprint/story status metadata by aligning ConnectShyft sprint status for g.2 to `review`.

### File List

- _bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- _bmad-output/test-artifacts/test-review.md
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.dispatch-policy.test.ts
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.resolution.test.ts
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.signature.test.ts
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.shared.ts
- apps/moneyshyft-api/src/modules/connectshyft/__tests__/readContracts.test.ts
- apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts
- apps/moneyshyft-api/src/modules/connectshyft/providerRegistry.ts
- apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts
- apps/moneyshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-resolution.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-correlation-refusals.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.webhook-replay-signature.test.ts
- apps/moneyshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts
- apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue
- apps/moneyshyft-web/src/features/connectshyft/neighbors.ts
- apps/moneyshyft-web/src/features/connectshyft/readContracts.ts
- apps/moneyshyft-web/src/features/connectshyft/threads.ts
- apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.spec.ts
- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.shared.ts
- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.queue-layout.cases.ts
- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.automate.dispatch-and-ownership.cases.ts
- tests/e2e/platform/g-2-inbox-and-mine-surface-rebuild.atdd.spec.ts
- tests/e2e/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.spec.ts
- tests/api/platform/g-2-inbox-and-mine-surface-rebuild.automate.api.spec.ts
- tests/api/platform/g-2-inbox-and-mine-surface-rebuild.atdd.api.spec.ts
- tests/helpers/connectShyftStoryG2.ts
- tests/support/factories/connectShyftStoryG2Factory.ts
- tests/support/fixtures/connectShyftStoryG2.fixture.ts
- apps/admin-api/node_modules
- apps/connectshyft-api/node_modules
- apps/connectshyft-web/node_modules
- apps/moneyshyft-api/node_modules
- apps/moneyshyft-web/node_modules

## Change Log

- 2026-03-06: Created Story g.2 ready-for-dev context document.
- 2026-03-06: Implemented g.2 Inbox/Mine surface rebuild with queue-card tap targets, responsive queue-thread layouts, persistent queue search, display-safe urgency mapping, and voicemail ownership semantics.
- 2026-03-06: Added g.2 automate E2E suite and validated regression parity across g.1, ux-r1, c.1, and g.2 platform specs.
- 2026-03-06: Resolved 5 review findings by removing Inbox claim/takeover controls, wiring inbox/thread outbound + lifecycle actions to real endpoints, adopting backend `display.preview`, and expanding E2E behavior assertions.
- 2026-03-06: Reconciled story/git discrepancies by synchronizing debug evidence, file list, and senior-review remediation notes with branch-tracked changes.
- 2026-03-06: Enforced actor-owned Mine queue semantics, propagated `targetPhone`/message payload through dispatch adapters, and added route/provider/e2e assertions to prevent dispatch regression.
- 2026-03-06: Resolved g.2 test quality follow-ups by removing serial suite mode, splitting oversized specs into focused modules, adding scoped env overrides, expanding malformed actor-context coverage, and reconciling story metadata with branch file state.
- 2026-03-06: Resolved sprint/story status mismatch by aligning `sprint-status-connectshyft.yaml` for g.2 to `review` and re-running status sync enforcement.
