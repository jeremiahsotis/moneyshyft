You are implementing **Checkpoint 3 — Webhook Idempotency and Replay Safety at the Provider Boundary** for ConnectShyft.

Read and follow the attached checkpoint spec exactly. Do not redesign architecture. Do not expand scope. This is a hardening slice for the existing webhook boundary.

## Objective
Finalize provider-boundary webhook handling so duplicate, replayed, delayed, and out-of-order provider events cannot corrupt ConnectShyft telephony runtime or voicemail artifact state.

## Required files
- apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
- apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
- apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
- apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
- apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts

Include exact schema/migration files for `cs_webhook_receipts` only if required to persist missing receipt fields.

## Hard requirements
1. Lock `cs_webhook_receipts` as the first replay/idempotency barrier before domain mutation.
2. Persist a stable provider event identity, payload hash, receipt status, timestamps, and failure info.
3. Process webhook events in this order:
   - validate request
   - extract stable event identity
   - compute/store payload hash
   - acquire/create receipt
   - decide duplicate/replay behavior
   - stop if already processed duplicate
   - delegate to domain handler if first-time or recoverable retry
   - finalize receipt status
4. Duplicate processed events must be side-effect free.
5. Failed receipts may be retried safely.
6. Out-of-order events must not regress BridgeSession or duplicate voicemail artifacts.
7. Keep route handlers thin. No inline ad hoc domain mutation logic in route handlers.
8. Add/update tests for duplicate replay, failed-retry recovery, invalid signature rejection, and out-of-order event safety.

## Do not do
- no SIP work
- no provider redesign
- no BridgeSession redesign
- no voicemail model redesign
- no UI changes
- no live-call retry redesign
- no resolver/CaseShyft work

## Verification requirements
Before stopping, run and verify:
- `rg "cs_webhook_receipts|webhook_receipts|processing_status|ignored_duplicate|payload_hash" apps/connectshyft-api`
- `rg "handleProviderEvent|processWebhook|processTelnyx|validate.*signature|signature.*validate" apps/connectshyft-api/src/routes/api/v1/connectshyft.ts apps/connectshyft-api/src/modules/connectshyft`
- `rg "insertInto\(['\"]cs_webhook_receipts['\"]\)|updateTable\(['\"]cs_webhook_receipts['\"]\)|ignored_duplicate|processed_at" apps/connectshyft-api`

## Stop condition
Stop only when:
- every telephony/voicemail provider webhook crosses the receipt/idempotency barrier before domain mutation
- already-processed duplicates are side-effect free
- failed receipts can be retried safely
- out-of-order events cannot corrupt runtime or voicemail artifact state
- route handlers are thin and delegate domain work
- receipt records are audit-capable

## Commit boundary
Use exactly this commit message:
`feat(connectshyft): harden provider webhook idempotency and replay safety`

Work surgically. Preserve existing architecture. Do not drift beyond the checkpoint spec.
