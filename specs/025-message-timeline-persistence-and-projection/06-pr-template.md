# PR 025 — Message Timeline Persistence + Projection

## Summary

Introduces a unified per-thread message timeline derived from canonical events, promotes inbound and outbound SMS to first-class timeline items, and establishes a forward-compatible contract for future voice and voicemail history.

---

## Changes

- Added a canonical-event-derived thread timeline projection as a read model rather than a second source of truth.
- Promoted inbound and outbound SMS into first-class ordered timeline items with stable identity and actor fields.
- Preserved deleted-neighbor timeline visibility for authorized admin/debug review while keeping deleted neighbors and threads out of normal operational UI.
- Enforced tenant-scoped timeline reads so thread history cannot leak across tenants.
- Reserved a forward-compatible contract for voice call lifecycle items and voicemail artifacts.

---

## Why

Operators need a trustworthy thread history that reads like a conversation instead of raw event logs, and the product needs that history model to stay compatible with future voice and voicemail work without introducing direct timeline writes or a competing source of truth.

---

## Testing

- Passed focused regression suites:
  - `npx jest --runInBand src/modules/connectshyft/__tests__/inboundSms.test.ts src/modules/connectshyft/__tests__/canonicalEvents.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts src/modules/connectshyft/__tests__/threadTimeline.test.ts src/routes/api/v1/__tests__/connectshyft.timeline.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- Passed app-local build:
  - `npm run build` from `apps/connectshyft-api`
- Passed local CI parity:
  - `npm run policy:check`
  - `bash scripts/verify-connectshyft-route-ownership.sh`
  - `bash scripts/lint-or-discovery.sh`
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh`
  - `bash scripts/quality-gates.sh`
- Completed local change-detection and burn-in flow against `origin/codex/dev`:
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/test-changed.sh origin/codex/dev`
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/burn-in.sh 3 origin/codex/dev`
  - No changed Playwright specs were detected, so those runs skipped cleanly.

---

## Risks

- Same-timestamp events could render in an unstable order if tie-breaking is applied inconsistently.
- Deleted-neighbor timelines could leak back into standard operational flows if visibility rules drift.
- Cross-tenant thread reads could expose message history if timeline projection bypasses tenant scoping.
- Future voice or voicemail work could drift from the reserved contract if not validated against this projection model.

---

## Rollback

- Revert the timeline projection changes together with any consumer changes that depend on first-class timeline items.
- Restore the prior thread-history read behavior only if canonical event history remains unchanged.
- Re-validate deleted-neighbor visibility rules and tenant scoping after rollback before closing the incident.

---

## Checklist

- [x] Canonical events remain the only source of truth for timeline content
- [x] No direct timeline writes exist outside the canonical event pipeline
- [x] Inbound and outbound SMS appear as first-class ordered timeline items
- [x] Deleted-neighbor timelines remain visible only to authorized admin/debug review
- [x] Standard operational UI excludes deleted neighbors and their threads
- [x] Tenant scoping prevents cross-tenant timeline leakage
- [x] Voice and voicemail contract placeholders remain forward-compatible
