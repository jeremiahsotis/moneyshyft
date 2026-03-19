# PR 025 — Testing Obligations

## Unit Tests

- Canonical inbound SMS events project to first-class inbound timeline items with the required identity, actor, channel, and body fields.
- Canonical outbound SMS events project to first-class outbound timeline items with the required identity, actor, channel, and body fields.
- Stable ordering sorts by `occurred_at_utc` first and canonical event identifier second when timestamps match.
- Projection leaves optional `provider_metadata` and future `delivery_status` absent when canonical data is missing instead of failing or inventing values.
- Projection returns an empty history when no timeline-eligible canonical events exist.
- Sample future voice-started, voice-connected, voice-ended, and voicemail canonical events satisfy the reserved contract shape without changing SMS ordering rules.

## Integration Tests

### Thread Timeline Reads

- A thread with mixed inbound and outbound SMS canonical events returns one unified oldest-to-newest timeline.
- A thread with identical event timestamps returns a deterministic stable order using canonical event identifiers.
- A thread with provider metadata exposes that data only through the optional metadata field.
- A thread with no eligible canonical events returns an empty timeline rather than invented message items.

### Deleted-Neighbor Handling

- A thread linked to a soft-deleted neighbor remains queryable in authorized admin/debug review and still renders its timeline.
- Standard operational thread lists, searches, and detail-opening flows exclude soft-deleted neighbors and their threads entirely.
- Deleted-neighbor review does not reactivate the neighbor or alter deleted-state history.

### Tenant Isolation

- A timeline request scoped to one tenant never returns thread existence or timeline items owned by another tenant.
- Cross-tenant canonical events never appear in the current tenant's projected thread timeline.

### Backend Consumer Contract

- The timeline endpoint returns items in oldest-to-newest order so consuming clients can render the newest returned item last without re-sorting.
- The response envelope always surfaces `neighbor_deleted`, `neighbor_deleted_at_utc`, and `limit_applied` separately from individual items.

## Regression Tests

- Existing inbound SMS canonical event creation still produces timeline-eligible SMS artifacts.
- Existing outbound SMS canonical event creation still produces timeline-eligible SMS artifacts.
- Existing tenant-scope enforcement still blocks cross-tenant reads.
- Existing deleted-neighbor protections from the prior soft-delete feature remain intact.
- Existing raw canonical event retrieval remains available as the rollback path.

## Local Verification Notes

- Passed focused regression command:
  - `npx jest --runInBand src/modules/connectshyft/__tests__/inboundSms.test.ts src/modules/connectshyft/__tests__/canonicalEvents.test.ts src/modules/connectshyft/__tests__/readContracts.test.ts src/modules/connectshyft/__tests__/threadTimeline.test.ts src/routes/api/v1/__tests__/connectshyft.timeline.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts`
- Passed app-local build:
  - `npm run build` from `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api`
- Passed local CI parity commands:
  - `npm run policy:check`
  - `bash scripts/verify-connectshyft-route-ownership.sh`
  - `bash scripts/lint-or-discovery.sh`
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh`
  - `bash scripts/quality-gates.sh`
- Local Playwright change-detection runs completed cleanly with no changed spec files relative to `origin/codex/dev`:
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/test-changed.sh origin/codex/dev`
  - `bash scripts/ci-run-playwright-stack.sh bash scripts/burn-in.sh 3 origin/codex/dev`
