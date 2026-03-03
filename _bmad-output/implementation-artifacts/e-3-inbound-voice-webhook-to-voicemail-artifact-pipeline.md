# Story e.3: Inbound Voice Webhook to Voicemail Artifact Pipeline

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a communication responder,
I want inbound voice events to create voicemail artifacts tied to the active thread,
so that voice interactions are visible in the same operational timeline.

## Acceptance Criteria

1. Given a valid inbound voice webhook, when processing completes, then a voicemail artifact is created and linked to the correct active thread for resolved `(tenant_id, org_unit_id, neighbor_id)` context.
2. Given active-thread state-specific routing rules apply, when inbound voice is processed, then behavior follows locked policy: no active thread routes to intake fallback, `UNCLAIMED` routes voicemail-only, and `CLAIMED` follows orgUnit-configured mode.
3. Given voicemail artifact creation succeeds, when pipeline completion runs, then a transcription request is queued with correlation metadata needed for later callback attachment.
4. Given voicemail-only inbound events occur, when lifecycle and escalation fields are evaluated, then escalation/inactivity reset behavior remains unchanged unless explicitly required by locked lifecycle rules.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Voice routing and voicemail continuity must remain explicit so operators can trust Mine/Inbox behavior and follow-up sequencing.
- Real-User Validation Evidence: `bash scripts/run-playwright-with-preflight.sh tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts` on 2026-03-03 passed all 5 ATDD API scenarios covering state-driven routing, voicemail artifact continuity, and transcription correlation metadata.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story focuses on voice ingestion and artifact continuity, not role administration.

## Tasks / Subtasks

- [x] Implement inbound voice canonical event handling path (AC: 1)
  - [x] Translate provider voice webhook payload into canonical voicemail-oriented domain event.
  - [x] Resolve neighbor/context before routing decision and artifact write.
- [x] Implement locked state-driven voice routing behavior (AC: 2)
  - [x] Enforce intake fallback for no-active-thread cases.
  - [x] Enforce voicemail-only for `UNCLAIMED` and configured behavior for `CLAIMED`.
- [x] Implement voicemail artifact + transcription enqueue continuity (AC: 1, 3)
  - [x] Persist voicemail artifact with deterministic correlation keys.
  - [x] Queue transcription request metadata for callback attachment path.
- [x] Add lifecycle and regression test coverage (AC: 2, 3, 4)
  - [x] Validate state matrix behavior (`no thread`, `UNCLAIMED`, `CLAIMED`, `CLOSED`).
  - [x] Validate no unintended escalation/inactivity reset on voicemail-only inbound events.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-019.
- Related constraints: FR-CS-011, FR-CS-013, FR-CS-021, FR-CS-021a.
- Story dependencies:
  - `e-1-verified-webhook-ingress-and-deterministic-context-routing`
  - `c-2-thread-ensure-endpoint-with-conflict-safe-idempotency`
  - `f-1-provider-adapter-interface-and-provider-registry`
  - `f-2-canonical-comms-event-model-and-event-store`

### Architecture Compliance

- Apply AD-09 inbound voice routing policy exactly.
- Preserve deterministic audit/timeline event writes for fallback and routing decisions.
- Keep replay-safe + signature-verified webhook preconditions from ingress pipeline.

### Library / Framework Requirements

- Reuse provider adapter mapping and canonical event translation paths.
- Reuse ConnectShyft thread/lifecycle modules for state-aware routing decisions.
- Reuse event/outbox integration patterns for voicemail/transcription enqueue writes.

### File Structure Requirements

- Voice webhook handling in `src/src/routes/api/v1/connectshyft.ts`.
- Voicemail/transcription orchestration in `src/src/modules/connectshyft/`.
- Persistence models/tables under ConnectShyft schema modules and migrations.
- Tests in `tests/api/platform/` and module-level suites under `src/src/modules/connectshyft/__tests__/`.

### Testing Requirements

- Validate voice routing matrix by active-thread state.
- Validate voicemail artifact creation and thread linkage.
- Validate transcription request enqueue contains durable correlation metadata.
- Validate voicemail-only inbound does not introduce unintended lifecycle resets.

### Previous Story Intelligence

- `e.1` provides deterministic ingress guards required before this story’s domain behavior.
- `c.3`/`ux-r3` lock voicemail indicator expectations and should remain consistent with this backend behavior.

### Git Intelligence Summary

- Existing lifecycle stories emphasize explicit state transitions; avoid hidden reopen or silent resets from inbound voice paths.

### Latest Technical Information

- Maintain provider-agnostic flow with Telnyx adapter V1 behind Comms Core abstraction.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep fallback routing and voicemail artifact persistence auditable and deterministic.
- Do not allow inbound voice paths to auto-reopen closed threads unless separately authorized by locked contracts.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.3)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-019)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-09, webhook ingestion design)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1.5)
- `provider_adapter.md`
- `openapi.yaml`
- `event_schema.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`
- `npm run build` (in `src/`)
- `npm test` (in `src/`)
- `bash scripts/run-playwright-with-preflight.sh tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts`
- `npm run policy:check`
- `npm run story:status:check -- --story-key e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline`

### Completion Notes List

- Added `src/src/modules/connectshyft/inboundVoice.ts` for canonical inbound voice mapping, state-driven routing, deterministic voicemail artifact shaping, and transcription callback metadata generation.
- Updated `src/src/routes/api/v1/connectshyft.ts` voice webhook handling to resolve neighbor context prior to routing, apply locked routing matrix (`no thread` fallback, `UNCLAIMED` voicemail-only, `CLAIMED` accepted), and emit voicemail/transcription response contracts with unchanged escalation/inactivity reset flags.
- Added module regression coverage in `src/src/modules/connectshyft/__tests__/inboundVoice.test.ts`.
- Activated and stabilized Story e.3 API ATDD suite in `tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts` including claimed-path setup using persisted actor identity from `/api/v1/auth/login`.
- Validated end-to-end story contracts via managed Playwright preflight run: all 5 e.3 API tests passing.
- Revalidated Story e.3 on 2026-03-03 with branch guard, backend build, backend Jest suite, and e.3 ATDD API suite; no additional implementation changes were required.
- `npm run policy:check` and `npm run story:status:check -- --story-key e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline` currently report an existing closeout-transition baseline mismatch (`ready-for-dev -> review`) that predates this revalidation run.

### File List

- _bmad-output/implementation-artifacts/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/inboundVoice.ts
- src/src/modules/connectshyft/__tests__/inboundVoice.test.ts
- src/src/routes/api/v1/connectshyft.ts
- tests/api/platform/e-3-inbound-voice-webhook-to-voicemail-artifact-pipeline.atdd.api.spec.ts

## Change Log

- 2026-03-03: Created Story e.3 ready-for-dev context document.
- 2026-03-03: Implemented inbound voice voicemail artifact + transcription pipeline with locked state routing and API/module regression coverage.
- 2026-03-03: Revalidated Story e.3 execution evidence (build, Jest, and ATDD API) with no new code changes.
