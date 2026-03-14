# ConnectShyft Repo Findings and Patch Targets

## Best-practice recommendation

Use these findings as the implementation boundary map. They explain why ConnectShyft is still off-track even though parts of Epic G were marked complete.

## Finding 1: active router wiring is still wrong

In `apps/moneyshyft-web/src/router/index.ts`:

- `/app/connectshyft/mine` loads `ConnectShyftInboxView.vue`
- `/app/connectshyft/settings` loads `ConnectShyftMoreView.vue`

That means at least part of the shipped ConnectShyft frontend still relies on route aliases that flatten distinct workflows into reused views.

## Patch target

- correct route-to-view mapping first
- verify whether `moneyshyft-web` or `connectshyft-web` is the active shell for production ConnectShyft access
- eliminate any duplicate frontend source of truth if one app is stale and one is active

## Finding 2: current view architecture is generic-page-shell based

Current ConnectShyft views still rely on centered boxed layouts with wrappers like:

- `mx-auto max-w-4xl ...`
- `mx-auto max-w-3xl ...`

That layout pattern is consistent with general admin pages, not a live communications workspace.

## Patch target

Replace view-local wrappers with:

- one ConnectShyft shell
- pane-based workspace layout
- bottom-nav aware mobile shell
- reusable card, pill, and action primitives

## Finding 3: inbox still surfaces backend/admin concepts as primary content

Current inbox structure promotes:

- capability status cards
- raw last inbound and preferred outbound identifiers
- shared identity context blocks
- large action footer attached to the page shell rather than the selected thread workflow

## Patch target

Move these out of the primary operator workspace:

- capability and admin availability surfaces go to explicit settings/admin routes
- raw identifiers go to debug/admin-only views
- shared identity context becomes a compact hint or snapshot detail, not a main inbox block

## Finding 4: thread detail is still document-style, not conversation-style

Current thread detail remains a stacked page with metadata and actions instead of a timeline-first pane with contextual right rail.

## Patch target

Thread detail must become:

- main timeline pane
- voicemail card inline with the conversation
- right-side neighbor snapshot rail on desktop
- compact mobile-first action row

## Finding 5: provider adapter is policy-aware but still functionally stubbed

`apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts` already enforces:

- bridge-only outbound call transport
- manual-only redial policy
- Telnyx webhook signature validation path

But dispatch methods still synthesize generic provider results instead of making real Telnyx API calls.

## Patch target

Replace synthetic dispatch with:

- real SMS adapter call
- real operator-leg voice call creation
- real provider response mapping
- real provider IDs persisted into correlation mappings

## Finding 6: provider naming debt is still present

Current number-mapping code and migrations still use Twilio-named fields like:

- `twilioNumberE164`
- `twilio_number_e164`
- `isValidTwilioE164`

That debt is now actively harmful because the actual provider direction is Telnyx.

## Patch target

- stop creating new Twilio-named code
- introduce provider-neutral naming in service and route layers
- plan a staged migration or alias strategy for existing persistence names

## Finding 7: neighbor phone persistence exists, operator phone persistence does not

ConnectShyft already has dedicated neighbor phone persistence patterns.

That means the missing operator phone model is a real architectural hole, not a matter of preference.

## Patch target

Add a user-phone identity table and shared phone normalization service instead of hacking callback numbers into thread state or user profile blobs.

## Finding 8: UX drift likely came from "feature complete" logic without shell replacement

Epic completion on isolated views or contracts does not guarantee the product shell changed.

Based on the current screenshots and code structure, that is likely what happened:

- some story-level work completed
- the old shell and routing model remained
- resulting UI still renders the wrong mental model

## Patch target

Treat shell replacement and route cleanup as first-class implementation tasks, not polish.

## Recommended execution order

1. confirm active frontend app and route ownership
2. fix route/view drift
3. add operator phone identity + normalization
4. implement real Telnyx outbound adapter behavior
5. implement durable bridge session orchestration
6. complete audit/idempotency/replay safety
7. rebuild inbox/thread/more against the approved shell
8. remove stale Twilio naming and obsolete UI sections

## Refusal list for developer

Refuse these shortcuts:

- adding `users.phone_e164` and calling it done
- patching CSS only
- exposing E.164 in normal forms
- adding new Twilio-named fields
- dialing the neighbor first
- automatic redial
- leaving `Mine` as a reused inbox view
- leaving admin availability cards as the main inbox content

## Done check

The remediation is not done until code, routes, data contracts, and UI all point to the same mental model:

ConnectShyft is a messaging-first, conversation-centered volunteer workspace with real outbound comms, not a capability dashboard with telecom strings taped onto it.
