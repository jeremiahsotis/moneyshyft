# ConnectShyft UI Lane-Convergence Remediation Contract

## Purpose

This document locks the remediation scope required to correct the ConnectShyft frontend rendering failure, stop frontend lane drift, and restore the intended ConnectShyft interaction model without damaging People Core Domain plans, future reusable UI component work, or upcoming ProgramShyft and CaseShyft modules.

This is a remediation contract, not an open-ended redesign brief.

## Executive diagnosis

ConnectShyft production is served from `apps/connectshyft-web`, but a substantial portion of Epic G ConnectShyft UI implementation work, component primitives, and test/runtime assumptions drifted into `apps/moneyshyft-web`. As a result, the deployed ConnectShyft app is still rendering the older single-column operator/debug surfaces instead of the intended queue-first, conversation-centered layout.

The rendering problem is therefore not a CSS tweak problem. It is a lane-authority failure.

## Root cause summary

### Root cause 1: production authority and implementation authority diverged
Production and deployment contracts consistently map `connect.shyftunity.com` to `apps/connectshyft-web/dist`, including:

- `architecture/contracts/two_part_brief.md`
- `architecture/contracts/developer_execution_packet.md`
- `architecture/contracts/production_runbook.md`
- `nginx/host-managed-subdomains.example.conf`
- `architecture/contracts/nginx/shyftunity-admin-money-connect.conf`

Example deployment mapping present in repo:

- `architecture/contracts/developer_execution_packet.md`
- `architecture/contracts/nginx/shyftunity-admin-money-connect.conf`

Both point ConnectShyft deployment to:

- `/home/jeremiahotis/projects/shyftunity/apps/connectshyft-web/dist`

That means `apps/connectshyft-web` is the only valid frontend authority for ConnectShyft production.

### Root cause 2: Epic G implementation artifacts targeted the wrong app
Epic G implementation artifacts repeatedly targeted `apps/moneyshyft-web` for ConnectShyft work, including:

- `_bmad-output/implementation-artifacts/g-2-inbox-and-mine-surface-rebuild.md`
- `_bmad-output/implementation-artifacts/g-3-thread-detail-conversation-first-rebuild.md`
- `_bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md`
- `_bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md`
- `_bmad-output/implementation-artifacts/g-6-volunteer-contract-boundary-and-regression-hardening.md`

Those artifacts reference files such as:

- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`

That is incompatible with the deployment contract.

### Root cause 3: the advanced ConnectShyft UI primitives exist in the wrong lane
The repo contains queue/search/component primitives in `apps/moneyshyft-web` that are absent from `apps/connectshyft-web`, including:

- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftQueueCard.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftThreadActionBar.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftComposer.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftThreadHeader.vue`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftVoicemailCard.vue`
- `apps/moneyshyft-web/src/features/connectshyft/readContracts.ts`
- `apps/moneyshyft-web/src/features/connectshyft/uiContracts.ts`

These support the newer queue-driven surfaces and action model. They are not present as the governing implementation inside `apps/connectshyft-web`.

### Root cause 4: the deployed app still renders the older page architecture
The live authority app, `apps/connectshyft-web`, still renders the older structure.

Observed in `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`:

- capability status cards dominate the screen
- maintenance and admin-like context appear in the main volunteer surface
- queue-first desktop shell is absent
- shared identity context is embedded as a broad panel rather than supporting the workflow
- bottom action strip is bolted onto a largely metadata-driven layout

Observed in `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`:

- page title remains `ConnectShyft Thread Detail`
- outer shell remains `max-w-3xl` single-column
- thread header prioritizes thread ID, state chips, and routing metadata
- raw inbound and outbound line metadata sit in the main reading flow
- no canonical desktop three-column shell exists
- no durable right-rail neighbor snapshot exists
- main conversation is not the dominant object on screen

This matches the current screenshots and does not match the provided goal prototype.

### Root cause 5: test/runtime tooling still reinforces the wrong lane
`scripts/run-playwright-with-preflight.sh` still resolves the frontend app using `apps/moneyshyft-web` as the Playwright startup target. That makes test confidence unreliable because the test harness is biased toward the wrong frontend lane while production serves a different app.

### Root cause 6: acceptance safety net is incomplete
The ConnectShyft UX acceptance net is not strict enough to block this drift. The result is that work could be declared complete while the deployed app remained structurally wrong.

## Locked decisions

The following decisions are now locked for remediation.

1. `apps/connectshyft-web` is the only authoritative frontend for ConnectShyft.
2. `apps/moneyshyft-web` may be used only as a migration source for ConnectShyft UI, not as an active implementation target.
3. No new ConnectShyft UI work may land in `apps/moneyshyft-web`.
4. All ConnectShyft UI tests, previews, and local runtime scripts must target `apps/connectshyft-web`.
5. The ConnectShyft UI must converge on the provided queue-first, conversation-centered, mobile-first interaction model shown in the supplied goal HTML and screenshots.
6. Remediation must not fork phone identity logic in a way that conflicts with future People Core Domain extraction.
7. Remediation must not create ad hoc visual primitives that make shared UI component extraction harder later.

## Scope

### In scope

- lane-authority correction
- migration or port of valid ConnectShyft UI primitives from `apps/moneyshyft-web` to `apps/connectshyft-web`
- correction of route and navigation behavior in `apps/connectshyft-web`
- correction of Inbox, Mine, Thread Detail, and More surfaces in `apps/connectshyft-web`
- update of test/runtime scripts so ConnectShyft tests boot the correct frontend
- CI guardrails that prevent reintroduction of lane drift
- acceptance criteria that compare delivered UI to the goal layouts and IA

### Out of scope

- redesign of ConnectShyft product strategy
- rewrite of the global component library for all modules
- broad monorepo frontend replatforming
- People Core Domain extraction itself
- ProgramShyft or CaseShyft implementation work
- speculative visual polish beyond matching the defined interaction contract

## Required migration order

### Phase 1: stop the drift

1. Treat `apps/connectshyft-web` as the only active ConnectShyft UI target.
2. Update all ConnectShyft-facing implementation docs and dev notes so new work references `apps/connectshyft-web`.
3. Update Playwright preflight and related local test harnesses so ConnectShyft boots `apps/connectshyft-web`.
4. Add CI checks that fail if ConnectShyft view/component files are modified under `apps/moneyshyft-web`.

### Phase 2: converge the component and view layer

Migrate or port, in this order, from `apps/moneyshyft-web` into `apps/connectshyft-web` only where the component aligns with the goal prototype and future reuse direction:

1. UI contract/constants layer
   - `readContracts.ts`
   - `uiContracts.ts`
2. core ConnectShyft primitives
   - primary nav
   - queue card
   - thread header
   - message bubble
   - voicemail card
   - composer
   - action bar
3. queue-first Inbox and Mine surfaces
4. conversation-first Thread Detail surface with right rail
5. volunteer-first More IA with admin-only settings separation
6. any required directory or neighbor surfaces only insofar as they are needed to support the intended ConnectShyft navigation model

### Phase 3: enforce and verify

1. unskip or harden ConnectShyft UX tests so the wrong layout fails CI
2. require screenshot-based or structural assertions for Inbox, Thread Detail, and More
3. fail CI when ConnectShyft frontend runtime scripts point at `apps/moneyshyft-web`
4. fail CI when ConnectShyft production routes are altered away from `apps/connectshyft-web` without an explicit architecture decision

## Required file targets

### Files that must be treated as authoritative targets

- `apps/connectshyft-web/src/router/index.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- `apps/connectshyft-web/src/components/connectshyft/*` if created during remediation
- `apps/connectshyft-web/src/features/connectshyft/*` if created during remediation
- `scripts/run-playwright-with-preflight.sh`
- ConnectShyft-specific Playwright or acceptance test files that assert layout and routing behavior

### Files that may be used as migration source only

- `apps/moneyshyft-web/src/views/ConnectShyft/*`
- `apps/moneyshyft-web/src/components/connectshyft/*`
- `apps/moneyshyft-web/src/features/connectshyft/*`

### Files that must be updated to remove future ambiguity

- Epic G and related implementation artifacts that currently direct ConnectShyft UI work into `apps/moneyshyft-web`
- any developer runbooks or issue templates that mention the wrong frontend lane for ConnectShyft

## UI contract to restore

### General

The ConnectShyft UX is mobile-first but must enhance into the supplied desktop shell when viewport allows. The goal desktop screenshots are not optional inspiration. They are the target contract.

### Inbox and Mine

Inbox and Mine must render as a queue-first work surface, not an admin dashboard.

Required characteristics:

- queue is the primary object
- search is visible and useful
- thread cards are human-readable and action-oriented
- metadata is compressed into context, not foregrounded as debugging content
- bottom nav remains stable and predictable
- desktop enhancement may split queue, active conversation, and snapshot rails where appropriate
- volunteer action affordances must feel native to the queue workflow

Not acceptable:

- capability status dominating the page
- large policy/debug framing above queue work
- forcing operators to parse internal line identifiers before acting

### Thread Detail

Thread Detail must be conversation-first.

Required characteristics:

- main conversation occupies the center of attention
- right rail holds neighbor snapshot and next-step support data
- conference and ownership context remain visible but compressed
- routing internals do not dominate the page
- actions are anchored to the conversation workflow
- voicemail support is integrated into the conversation surface
- desktop shell must match the supplied goal direction: queue, conversation, snapshot

Not acceptable:

- thread ID as headline object
- raw line metadata interrupting the main reading flow
- metadata chips carrying more visual weight than the actual interaction
- single-column fallback layout on desktop where a multi-column shell is expected

### More

More must be volunteer-first and policy-safe, with admin settings separated appropriately.

Required characteristics:

- volunteer-facing tools first
- secondary tools and settings scoped cleanly
- admin-only settings isolated from volunteer IA
- no feeling of generic leftover settings page

## Architectural constraints

### People Core Domain compatibility

Any phone identity or contact-display support introduced during UI remediation must not create a ConnectShyft-only schema or formatting path that will later conflict with People Core Domain.

Rule:

- any shared phone normalization or display helper introduced now should sit in a neutral shared path, not embedded as a ConnectShyft-only one-off if it is intended to survive into People Core Domain.

### Reusable UI component roadmap compatibility

Do not solve this by hardcoding massive page-specific markup with no reusable seams.

Rule:

- prefer extracting reusable ConnectShyft-scoped primitives in `apps/connectshyft-web/src/components/connectshyft/` that can later inform broader reusable component work
- do not prematurely move everything to a global shared UI library during this remediation

### Monorepo lane clarity

This remediation must reduce ambiguity, not preserve it.

Rule:

- a developer should be able to answer “where does ConnectShyft frontend truth live?” with one answer only: `apps/connectshyft-web`

## Acceptance criteria

### A. lane authority

1. ConnectShyft production, local dev, and automated UI tests all point at `apps/connectshyft-web`.
2. There are no active ConnectShyft implementation instructions directing frontend work to `apps/moneyshyft-web`.
3. CI fails if ConnectShyft UI files are newly changed under `apps/moneyshyft-web`.

### B. Inbox and Mine

1. Desktop Inbox visually resolves to the queue-first interaction model rather than the capability-dashboard model.
2. Search, queue cards, and conversation-opening actions are present and usable.
3. The screen no longer foregrounds capability cards as the main content block.
4. The visual hierarchy matches the supplied goal direction: work queue first, not system status first.

### C. Thread Detail

1. Desktop Thread Detail renders a conversation-first surface.
2. The main conversation is visually dominant.
3. The right rail displays neighbor snapshot and supporting context without leaking routing internals into the main timeline.
4. Metadata such as raw CS number IDs are either compressed, moved, or visually subordinated.
5. The desktop surface no longer presents as a single-column debug page.

### D. More

1. More reads as a volunteer-first secondary tools area.
2. Admin-only settings remain separated and capability-gated.
3. The surface matches the intended information architecture rather than a generic leftovers page.

### E. regression protection

1. Playwright or equivalent automated checks fail if the desktop ConnectShyft surfaces regress back to the old layout structure.
2. The wrong frontend target in preflight or runtime scripts fails validation.

## CI guardrails

Implement all of the following.

### Guardrail 1: lane modification guard
Fail CI if any of the following are modified for ConnectShyft work without an explicit override label or architecture approval:

- `apps/moneyshyft-web/src/views/ConnectShyft/*`
- `apps/moneyshyft-web/src/components/connectshyft/*`
- `apps/moneyshyft-web/src/features/connectshyft/*`

### Guardrail 2: runtime target guard
Fail CI if `scripts/run-playwright-with-preflight.sh` or related ConnectShyft runtime scripts resolve the frontend app to `apps/moneyshyft-web`.

### Guardrail 3: route authority guard
Fail CI if ConnectShyft frontend route work is introduced outside `apps/connectshyft-web`.

### Guardrail 4: screenshot or structural layout assertions
Require automated checks that assert, at minimum:

- desktop Inbox has queue/search surface
- desktop Thread Detail has conversation area and right rail
- More has volunteer-first tool cards and admin separation

## Definition of done

This remediation is done only when all of the following are true:

1. The live authority frontend for ConnectShyft is unambiguous.
2. The intended ConnectShyft desktop UI is rendered from `apps/connectshyft-web`.
3. Test/runtime tooling points to the same frontend lane production uses.
4. CI guardrails prevent future drift back into `apps/moneyshyft-web`.
5. The delivered UI matches the supplied goal direction closely enough that a side-by-side comparison clearly shows the old operator/debug layout has been replaced.

## Explicit non-negotiables for the developer

- Do not patch CSS in `apps/connectshyft-web` and call this fixed while the architecture split remains.
- Do not continue implementing ConnectShyft UI in `apps/moneyshyft-web`.
- Do not preserve duplicate frontend truth for ConnectShyft after remediation.
- Do not bury this under “future cleanup.” This is a current architecture defect.

## Suggested implementation checklist

1. correct preflight and test target
2. create or port ConnectShyft component primitives into `apps/connectshyft-web`
3. rebuild Inbox and Mine in `apps/connectshyft-web`
4. rebuild Thread Detail in `apps/connectshyft-web`
5. rebuild More IA in `apps/connectshyft-web`
6. add CI drift guards
7. run acceptance tests and visual comparison against supplied goal screenshots

## One-sentence developer brief

ConnectShyft production serves `apps/connectshyft-web`, but Epic G UI work and test/runtime assumptions drifted into `apps/moneyshyft-web`, so remediation must converge all ConnectShyft frontend authority, implementation, and automated validation back into `apps/connectshyft-web` and restore the queue-first conversation shell defined by the supplied goal prototype.
