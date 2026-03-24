You are implementing **Checkpoint 2 — Voicemail Artifact Persistence, Idempotency, and Transcription Persistence** for ConnectShyft.

Read and follow the attached checkpoint spec exactly. Do not redesign architecture. Do not expand scope. This is a completion-and-hardening slice, not a fresh voicemail implementation.

## Objective
Finalize voicemail as a single durable artifact with idempotent creation, stable provider-event correlation, completed transcription persistence, and artifact-compatible thread rendering inputs.

## Required files
- apps/connectshyft-api/src/modules/connectshyft/voicemails.ts
- apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts
- apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts
- apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
- apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts
- apps/connectshyft-api/src/modules/connectshyft/inboundVoice.ts

Include exact migration/schema files only if needed to persist missing voicemail transcription fields.

## Hard requirements
1. Lock Voicemail as the persistence truth for recording + transcription data.
2. Add or finalize one central `upsertVoicemailArtifact(input)` service path.
3. Route both inbound and outbound voicemail persistence through that single path.
4. Use correlation priority:
   - provider_recording_id
   - provider_event_id
   - bridge_session_id + provider_leg_id + direction
   - recording_url as last fallback
5. Persist transcription on the voicemail artifact itself.
6. Persist explicit voicemail direction (`inbound` or `outbound`) on the artifact.
7. Keep webhook handlers thin. No ad hoc voicemail row creation in route handlers.
8. Ensure timeline projection can consume persisted voicemail artifact fields for transcript, direction, and recording status.
9. Add/update tests for idempotent artifact creation, transcription correlation, replay safety, and inbound/outbound direction handling.

## Do not do
- no SIP work
- no retry redesign
- no unread/seen/reviewed UI changes
- no dashboard/queue voicemail UI
- no resolver/rebind redesign
- no AI voicemail features

## Verification requirements
Before stopping, run and verify:
- `rg "insert into cs_voicemails|insertInto\(['\"]cs_voicemails['\"]\)|createVoicemail|upsertVoicemailArtifact" apps/connectshyft-api`
- `rg "transcription_status|transcription_text|transcription_provider" apps/connectshyft-api`
- `rg "provider_event_id|provider_recording_id|provider_leg_id|recording_url" apps/connectshyft-api/src/modules/connectshyft/voicemails.ts`

## Stop condition
Stop only when:
- there is one voicemail artifact create/update path
- duplicate/replayed provider events cannot create second voicemail artifacts
- transcription persists on the artifact
- inbound and outbound voicemail share the same artifact model
- timeline projection can read artifact-backed voicemail fields needed for later artifact-first rendering

## Commit boundary
Use exactly this commit message:
`feat(connectshyft): lock voicemail artifact persistence and transcription correlation`

Work surgically. Preserve existing architecture. Do not drift beyond the checkpoint spec.
