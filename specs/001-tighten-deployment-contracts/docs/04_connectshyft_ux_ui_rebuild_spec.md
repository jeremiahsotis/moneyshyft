# ConnectShyft UX/UI Rebuild Spec

## Best-practice recommendation

Rebuild ConnectShyft from the approved mobile-first interaction model, using a dedicated module shell plus reusable pane/card primitives.

Do not keep patching the current generic admin-card pages.

## Repo-specific diagnosis

The current UI still looks wrong for structural reasons, not styling reasons.

### Routing drift

Current router wiring still points:

- `/app/connectshyft/mine` to `ConnectShyftInboxView.vue`
- `/app/connectshyft/settings` to `ConnectShyftMoreView.vue`

That is already enough to produce behavior that feels half-finished.

### View-shell drift

Current ConnectShyft views are still built as centered content cards using wrappers like:

- `max-w-4xl`
- `max-w-3xl`

That is not the approved product posture.

### Information architecture drift

Current inbox and thread pages still elevate things like:

- capability status
- raw number mapping identifiers
- shared identity context blocks
- internal refusal strings

The approved product puts the conversation and next action first.

## Approved target behavior

## Mobile is the source layout

Desktop is not a different design language.

Desktop is the mobile interaction model expanded into panes.

## Inbox

### Mobile

- top summary
- search
- thread list
- bottom nav

### Tablet

- list + detail split

### Desktop

Three panes:

1. queue rail
2. timeline pane
3. neighbor snapshot rail

## Thread detail

### Mobile

- thread header
- conversation timeline
- voicemail card
- action row

### Desktop

Two panes:

1. main conversation pane
2. neighbor snapshot rail

## More

Keep simple.

It can stay card-based, but it must inherit the same shell, spacing, typography, and bottom-nav behavior.

## Information hierarchy rules

## Keep visible

- neighbor name
- conference name
- claim/assignment summary
- urgency
- voicemail presence
- preference pills
- next steps
- clear actions: `Call`, `Text`, `Close`, `Add Neighbor`

## Move to snapshot rail or contextual pills

- contact details
- callback window notes
- texting preference
- multiple-number hint
- address

## Remove from primary operator workflow

- raw UUIDs
- raw `cs-inbound-*` and `cs-outbound-*` identifiers
- provider leg IDs
- transport language
- orgUnit scope refusal strings as dominant content
- admin availability and webhook capability blocks on inbox

## Required components

Create or refactor toward these components:

- `ConnectShyftShell.vue`
- `ConnectShyftQueuePane.vue`
- `ConnectShyftThreadCard.vue`
- `ConnectShyftTimelinePane.vue`
- `ConnectShyftMessageBubble.vue`
- `ConnectShyftVoicemailCard.vue`
- `ConnectShyftNeighborSnapshot.vue`
- `ConnectShyftActionRow.vue`
- `ConnectShyftScopeGate.vue`

These may initially live under a ConnectShyft folder, but they must be built from reusable primitives where possible.

## Shell rules

### Rule 1: one module shell

Inbox, thread, directory, and more must share one shell contract.

Do not keep separate page wrappers that each reinvent padding, nav, and breakpoint behavior.

### Rule 2: scope before shell content

If orgUnit context is required, the app must resolve or refuse that state before mounting the normal inbox content.

Do not render the inbox and then dump the refusal message inside it.

### Rule 3: same emotional language across breakpoints

The approved prototype uses:

- rounded surfaces
- soft cards
- pill metadata
- calm spacing
- conversation-first layout

Do not switch to a harsher desktop admin table language at larger breakpoints.

## Data contract rules for UI

## Inbox contract

Inbox should consume one joined operator-facing contract that gives it:

- thread queue items
- selected thread summary or open thread detail
- neighbor snapshot summary
- action availability

Do not render separate unrelated cards just because separate endpoints exist.

## Thread detail contract

Thread detail should receive:

- thread summary
- timeline items
- voicemail cards or artifacts
- action contract
- neighbor snapshot summary

## More contract

More should receive only volunteer-facing settings and tool entry data.

Admin settings belong behind explicit admin entry points, not mixed into core volunteer UX.

## Patch strategy

### Step 1: fix route/view drift first

Immediately correct route targets so the right views load.

### Step 2: introduce shell and pane primitives

Do not start by editing every old page in place.

### Step 3: rebuild inbox and thread from prototype rules

These are the core product surfaces.

### Step 4: refit more and directory into the same shell language

### Step 5: remove obsolete sections and stale operator copy

Delete the old capability/status-heavy layout once the new shell is live.

## Acceptance criteria

- inbox on desktop is list + timeline + snapshot
- thread detail on desktop is timeline + snapshot
- mobile remains fully operable without hidden critical actions
- raw telecom/routing identifiers are removed from primary content
- `Mine` is not just inbox wearing a different title
- `More` does not feel like a fallback admin page
- missing orgUnit context never appears as the dominant body content of the inbox

## Counterpoint

A pixel-perfect copy of the prototype without component discipline would still be a mistake.

The target is not just visual match.

The target is visual match plus reusable shell structure, so ProgramShyft, CaseShyft, and later shared UI work get easier instead of harder.
