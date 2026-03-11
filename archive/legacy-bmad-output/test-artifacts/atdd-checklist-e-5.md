---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-03'
---

# ATDD Checklist - Epic e, Story 5: Replay-Safe Webhook Receipt Ledger and Retention Controls

**Date:** 2026-03-03
**Author:** Jeremiah
**Primary Test Level:** API
**Generation Mode:** AI generation (no browser recording)
**Story File:** `_bmad-output/implementation-artifacts/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.md`

---

## Story Summary

This story introduces webhook replay protection using a receipt ledger keyed by `(tenant_id, provider, sid, event_type)` and adds retention controls so storage remains bounded. The red-phase tests define expected behavior for first-seen processing, duplicate suppression, retention cleanup, and high-volume duplicate delivery determinism.

**As a** reliability engineer  
**I want** webhook replay protection backed by a receipt ledger with retention controls  
**So that** duplicate provider events are safely ignored and storage remains bounded

---

## Acceptance Criteria

1. Duplicate webhook delivery for the same `(tenant_id, provider, sid, event_type)` suppresses duplicate domain writes.
2. First-seen receipt insertion allows normal downstream processing and expected domain artifacts.
3. Retention cleanup removes expired rows while preserving active replay-safety guarantees.
4. Under duplicate delivery bursts, dedupe remains deterministic and stays within webhook latency budget expectations.

---

## Failing Tests Created (RED Phase)

### API Tests (4 tests)

**File:** `tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`

- ✅ **[E5-ATDD-API-001][P0]** suppresses duplicate domain writes with unique receipt identity  
  - **Status:** RED (intentionally skipped with `test.skip()` until implementation is complete)
  - **Verifies:** AC1 duplicate detection and suppression semantics.
- ✅ **[E5-ATDD-API-002][P0]** first-seen receipt insertion allows downstream processing  
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC2 first-seen flow emits expected domain side effects.
- ✅ **[E5-ATDD-API-003][P1]** retention cleanup preserves active window while removing expired rows  
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC3 retention policy contract and metrics contract.
- ✅ **[E5-ATDD-API-004][P0]** duplicate burst handling is deterministic within latency budget  
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** AC4 deterministic replay behavior and ingestion budget envelope.

### E2E Tests (2 tests)

**File:** `tests/e2e/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.spec.ts`

- ✅ **[E5-ATDD-E2E-001][P1]** operator timeline shows one inbound artifact with duplicate suppression badge  
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** duplicate bursts do not create operator-visible timeline noise.
- ✅ **[E5-ATDD-E2E-002][P2]** retention controls screen shows active window and cleanup outcomes  
  - **Status:** RED (intentionally skipped with `test.skip()`)
  - **Verifies:** operator UX contract around retention cleanup visibility.

### Component Tests (0 tests)

No component-level tests were generated for this backend-first reliability story.

---

## Data Factories Created

### ConnectShyft Story E5 Factory

**File:** `tests/support/factories/connectShyftStoryE5Factory.ts`

**Exports:**

- `createStoryE5Context(overrides?)` - deterministic story context (tenant/orgUnit/provider/paths/policies)
- `createStoryE5Headers(context, overrides?)` - tenant-scoped header construction for API contract testing

---

## Fixtures Created

### ConnectShyft Story E5 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryE5.fixture.ts`

**Fixtures:**

- `storyE5Context` - shared scenario context
- `storyE5OperatorHeaders` - operator tenancy headers
- `storyE5AdminHeaders` - admin tenancy headers
- `storyE5NumberMappingPayload` - mapped inbound number setup payload
- `storyE5CleanupRequestPayload` - retention cleanup execution payload

---

## Mock Requirements

### Telnyx Inbound Webhook Mock

**Endpoint:** `POST /api/v1/connectshyft/webhooks/inbound`

**Success Response Contract:**

- `ok: true`
- `code: CONNECTSHYFT_WEBHOOK_ACCEPTED`
- `data.replaySafe.duplicate` boolean
- `data.replaySafe.suppressedDomainWrites` boolean

### Receipt Retention Cleanup Mock

**Endpoint:** `POST /api/v1/connectshyft/admin/webhook-receipts/cleanup`

**Success Response Contract:**

- `ok: true`
- `code: CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_APPLIED`
- `data.policyWindowDays`
- `data.expiredRowsRemoved`
- `data.activeWindowProtected`

### Receipt Metrics Mock

**Endpoint:** `GET /api/v1/connectshyft/admin/webhook-receipts/metrics`

**Success Response Contract:**

- `ok: true`
- `code: CONNECTSHYFT_WEBHOOK_RECEIPT_METRICS_LOADED`
- `data.retentionWindowDays`
- `data.totalRows`
- `data.oldestRetainedAt`

---

## Required `data-testid` Attributes

### Thread Timeline Surface

- `connectshyft-thread-timeline` - timeline container on thread detail page
- `connectshyft-event-row-inbound-webhook` - single inbound event row after duplicate burst
- `connectshyft-replay-safe-duplicate-badge` - duplicate suppression status indicator
- `connectshyft-receipt-ledger-key-chip` - displays dedupe key basis

### Retention Controls Surface

- `connectshyft-retention-window-days` - current retention policy window value
- `connectshyft-receipt-cleanup-run-result` - cleanup execution outcome summary
- `connectshyft-replay-safety-window-status` - active-window protection status

---

## Implementation Checklist

### Test: [E5-ATDD-API-001][P0]

**File:** `tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`

- [ ] Add receipt ledger persistence with unique constraint `(tenant_id, provider, sid, event_type)`.
- [ ] Treat unique violation as duplicate replay path (non-fatal).
- [ ] Suppress lifecycle/canonical/outbox writes for duplicate events.
- [ ] Return deterministic replay-safe envelope metadata (`duplicate`, `suppressedDomainWrites`, `dedupeKey`).
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E5-ATDD-API-002][P0]

**File:** `tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`

- [ ] Gate downstream processing on successful first-seen receipt insertion.
- [ ] Ensure expected domain side effects execute for first-seen events.
- [ ] Preserve deterministic pipeline order: verify -> dedupe -> route -> writes.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E5-ATDD-API-003][P1]

**File:** `tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`

- [ ] Implement cleanup job for expired receipt rows (180-day baseline).
- [ ] Guarantee active window receipts are retained.
- [ ] Expose cleanup and metrics contract endpoints (or equivalent service hooks).
- [ ] Emit cleanup observability metrics.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E5-ATDD-API-004][P0]

**File:** `tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`

- [ ] Validate dedupe determinism under duplicate burst concurrency.
- [ ] Ensure exactly one first-seen processing path per duplicate burst.
- [ ] Keep ingestion latency within locked webhook budget.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E5-ATDD-E2E-001][P1]

**File:** `tests/e2e/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.spec.ts`

- [ ] Render replay-safe duplicate suppression status in timeline UI.
- [ ] Ensure duplicate events do not create extra timeline rows.
- [ ] Add required `data-testid` attributes for deterministic selectors.
- [ ] Remove `test.skip()` and run targeted test.

### Test: [E5-ATDD-E2E-002][P2]

**File:** `tests/e2e/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.spec.ts`

- [ ] Build retention controls screen for operators/admins.
- [ ] Surface current policy window and latest cleanup result.
- [ ] Avoid showing expired rows once cleanup is applied.
- [ ] Add required `data-testid` attributes for deterministic selectors.
- [ ] Remove `test.skip()` and run targeted test.

---

## Running Tests

```bash
# Run story-specific API + E2E files
npx playwright test tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts tests/e2e/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.spec.ts

# Run only API story file
npx playwright test tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts

# Run only E2E story file in headed mode
npx playwright test --headed tests/e2e/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.spec.ts
```

---

## Validation Notes

- Mandatory policy gate passed after branch auto-remediation.
- Branch workflow guard passed for ATDD workflow and story lane.
- All generated tests use `test.skip()` for red-phase readiness.
- No CLI browser session was opened during this run.
- No temporary artifact was written outside approved ATDD paths.

---

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

---

## Next Steps

1. Implement receipt-ledger dedupe write path and retention cleanup service contracts.
2. Remove `test.skip()` per scenario as implementation lands.
3. Run targeted story tests and move from red to green.
4. Continue with dev-story implementation workflow.
