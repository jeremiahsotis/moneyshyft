# UX-R1 Reviewer Checklist (AC1-AC4)

Story: `ux-r1-mobile-first-inbox-mine-thread-redesign.md`  
Status Target: `review`

## AC1 - Persistent Primary Navigation (`Inbox`, `Mine`, `More`)

- [ ] On `/app/connectshyft/inbox`, confirm bottom nav is visible with:
  - `connectshyft-bottom-nav`
  - `connectshyft-bottom-nav-inbox`
  - `connectshyft-bottom-nav-mine`
  - `connectshyft-bottom-nav-more`
- [ ] Switch Inbox -> Mine -> Inbox from bottom nav and verify route transitions:
  - `/app/connectshyft/inbox`
  - `/app/connectshyft/mine`
- [ ] Confirm no hidden fourth primary tab selector exists:
  - `connectshyft-bottom-nav-hidden-primary-tab` count = `0`

## AC2 - Inbox/Mine Large-Card Readability + Touch Targets

- [ ] On Inbox and Mine surfaces, verify card body selector exists:
  - `connectshyft-thread-card-body`
- [ ] Verify computed card body text size is at least `16px`.
- [ ] Verify primary action selector exists:
  - `connectshyft-thread-card-primary-action`
- [ ] Verify primary action min-height is at least `44px`.
- [ ] Verify urgency language remains plain-language (`Needs attention soon` / `Needs urgent attention`).
- [ ] Verify voicemail indicator remains prominent where applicable:
  - `connectshyft-voicemail-indicator-<threadId>`

## AC3 - Thread Header Context + State-Explicit Action Sets

- [ ] On thread detail, verify header context selectors are visible:
  - `connectshyft-thread-header-neighbor-context`
  - `connectshyft-thread-header-conference-context`
- [ ] Verify action matrix by state:
  - `UNCLAIMED` -> `Call`, `Text`, `Claim`
  - `CLAIMED` -> `Call`, `Text`, `Close`
  - `CLOSED` -> `Call`, `Send Message`
- [ ] Verify `connectshyft-thread-actions` is visible and contains only allowed actions for each state.

## AC4 - Responsive Discoverability Across Mobile/Tablet/Desktop

- [ ] Validate thread detail in three viewport presets:
  - Mobile `390x844`
  - Tablet `834x1112`
  - Desktop `1280x800`
- [ ] For each viewport, verify:
  - Neighbor context selector visible.
  - Conference context selector visible.
  - Voicemail indicator visible when thread includes voicemail.
  - Thread action group visible and actionable.
- [ ] Confirm no hidden policy path selector is present:
  - `connectshyft-hidden-policy-path` count = `0`

## Evidence Commands

- `npm run test:e2e -- tests/e2e/platform/ux-r1-mobile-first-inbox-mine-thread-redesign.spec.ts`
- `npm run test:e2e -- tests/e2e/platform/c-3-inbox-and-thread-detail-read-contracts.spec.ts tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.spec.ts`
- `cd frontend && npm run build`
- `cd src && npm run build`
- `cd src && npm test`
