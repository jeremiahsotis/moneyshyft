# Story e.4: Transcription Webhook Attachment to Voicemail Records

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator reviewing voice communication,
I want transcription callbacks to attach text to the correct voicemail record,
so that voice content is searchable and actionable in-thread.

## Acceptance Criteria

1. Given a valid voicemail transcription callback, when callback processing executes, then transcript text is attached to the correct voicemail artifact using deterministic correlation metadata.
2. Given transcript attachment succeeds, when thread timeline data is queried, then transcript availability is reflected consistently in voicemail artifact views.
3. Given missing or invalid voicemail correlation identifiers, when callback processing runs, then the handler refuses deterministically and makes no orphaned transcript updates.
4. Given duplicate transcription callback deliveries for the same event identity, when processing executes, then idempotent replay checks prevent duplicate timeline mutations.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Transcript attachment correctness is directly user-facing in thread review workflows and must never drift from voicemail identity.
- Real-User Validation Evidence: Pending implementation. Validate transcript attach/update behavior for success, missing-correlation refusal, and duplicate callback suppression.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story handles callback correlation and artifact updates only.

## Tasks / Subtasks

- [x] Implement transcription callback canonical handling path (AC: 1)
  - [x] Parse provider callback payload and normalize canonical transcription event identity.
  - [x] Resolve voicemail correlation keys from persisted mapping data.
- [x] Implement deterministic transcript attachment logic (AC: 1, 2)
  - [x] Persist transcript content against correct voicemail artifact.
  - [x] Expose transcript availability in thread artifact contract outputs.
- [x] Implement missing/invalid-correlation refusal path (AC: 3)
  - [x] Return deterministic refusal without orphan writes.
  - [x] Record audit metadata for callback diagnosis.
- [x] Add idempotency and regression coverage (AC: 4)
  - [x] Duplicate callback tests proving no duplicate timeline mutations.
  - [x] Contract tests validating refusal semantics on unresolved correlation.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-020.
- Related constraints: FR-CS-019, FR-CS-021, FR-CS-021a.
- Story dependencies:
  - `e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`
  - `f-1-provider-adapter-interface-and-provider-registry`
  - `f-2-canonical-comms-event-model-and-event-store`

### Architecture Compliance

- Keep callback processing behind verified ingress and replay-safe dedupe.
- Preserve deterministic voicemail correlation with no orphan transcript writes.
- Maintain canonical envelope/refusal semantics for invalid correlation inputs.

### Library / Framework Requirements

- Reuse provider adapter callback translation and canonical event modules.
- Reuse voicemail artifact repositories and thread read contract serializers.
- Avoid callback-specific one-off write paths that bypass standard mutation wrappers.

### File Structure Requirements

- Callback route handling in `src/src/routes/api/v1/connectshyft.ts`.
- Voicemail/transcript domain logic in `src/src/modules/connectshyft/`.
- Persistence and query modules in ConnectShyft schema/repository paths.
- Tests in `tests/api/platform/` and `src/src/modules/connectshyft/__tests__/`.

### Testing Requirements

- Validate correct transcript attachment for valid correlated callbacks.
- Validate missing/invalid correlation refuses and does not mutate voicemail records.
- Validate duplicate callbacks are replay-safe and idempotent.
- Validate transcript visibility in thread detail/inbox read contracts where applicable.

### Previous Story Intelligence

- `e.3` establishes voicemail artifact creation and correlation metadata prerequisites.
- `ux-r3` depends on voicemail/transcript continuity and should remain behaviorally consistent.

### Git Intelligence Summary

- Recent stories require deterministic refusal outcomes and auditable mutation boundaries; apply same discipline here.

### Latest Technical Information

- Treat current provider abstraction and canonical-event artifacts as authoritative for callback handling behavior.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep transcription attachment and dedupe inside transaction-safe mutation pathways.
- Ensure callback handlers do not create new voicemail artifacts when correlation is missing.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-4-transcription-webhook-attachment-to-voicemail-records`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.4)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-020)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (webhook pipeline, receipt dedupe, voicemail artifacts)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1.5)
- `provider_adapter.md`
- `openapi.yaml`
- `event_schema.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n -i "epic\\s*e|e-4-" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `rg -n "FR-CS-020|FR-CS-021a" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `rg -n "voicemail-transcription|dedupe|receipt" _bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `npm run branch:ensure-workflow -- --workflow dev-story --story e-4-transcription-webhook-attachment-to-voicemail-records.md`
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/inboundVoice.test.ts`
- `npm run test:e2e -- tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts`
- `cd src && npm run build`
- `npm run test:e2e -- tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.automate.api.spec.ts`
- `npm run test:e2e -- tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts --workers=1`
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/inboundVoice.test.ts src/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts src/src/migrations/__tests__/connectShyftWebhookReceiptProcessingStateMigration.test.ts`
- `npm run test:e2e -- tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.spec.ts`

### Completion Notes List

- Created implementation-ready Story e.4 context document with deterministic callback correlation and replay-safe transcript attachment guardrails.
- Implemented dedicated transcription-callback handling in inbound webhook flow with deterministic callback correlation parsing, persisted voicemail-artifact correlation checks, transcript attachment canonical event persistence, and explicit duplicate-suppression response contracts.
- Thread detail now returns `voicemailArtifacts` projection derived from canonical timeline and exposes timeline-level `metadata` for transcription-attached events so transcript availability is reflected in artifact views.
- Added E4 unit coverage for callback event detection/parsing/payload composition and enabled E4 ATDD API core + replay/guards suites (all passing).
- Hardened transcription callback idempotency with receipt processing states (`RECEIVED|APPLIED|FAILED_RETRYABLE|FAILED_TERMINAL`) so only applied callbacks are duplicate-suppressed and retryable failures can safely replay.
- Enforced transcription callback `providerEventId` as required for deterministic replay handling and wired correlation checks to match persisted callback correlation event identity.
- Removed callback-correlation dependence on timeline windowing by using unbounded canonical-event existence checks (DB path) for persisted voicemail correlation validation.

### File List

- _bmad-output/implementation-artifacts/e-4-transcription-webhook-attachment-to-voicemail-records.md
- _bmad-output/test-artifacts/test-review.md
- src/src/modules/connectshyft/inboundVoice.ts
- src/src/modules/connectshyft/__tests__/inboundVoice.test.ts
- src/src/modules/connectshyft/providerCorrelationMappings.ts
- src/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/migrations/20260303153000_add_connectshyft_webhook_receipt_processing_state.ts
- src/src/migrations/__tests__/connectShyftWebhookReceiptProcessingStateMigration.test.ts
- tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.core.cases.ts
- tests/api/platform/e-4-transcription-webhook-attachment-to-voicemail-records.atdd.api.replay-and-guards.cases.ts

## Change Log

- 2026-03-03: Created Story e.4 ready-for-dev context document.
- 2026-03-03: Implemented transcription callback attachment/refusal/idempotency flow, added voicemail artifact transcript projection in thread detail, and enabled E4 ATDD coverage.
- 2026-03-03: Fixed adversarial-review findings by adding retry-safe receipt-state idempotency, strict transcription provider-event identity requirements, unbounded persisted-correlation validation, and expanded E4 guard/replay test coverage.
