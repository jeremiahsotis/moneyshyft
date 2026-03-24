You are implementing **Checkpoint 4 — Transcription Completion and Artifact-Backed Thread Inputs** for ConnectShyft.

Follow the checkpoint spec exactly. This is a completion slice, not a redesign.

## Objective
Complete voicemail transcription end-to-end and ensure thread rendering reads from the persisted voicemail artifact.

## Required files
- voicemails.ts
- callLifecycle.ts
- inboundVoice.ts
- threadTimeline.ts
- connectshyft.ts

## Requirements
1. Persist transcription fields on voicemail artifact.
2. Request transcription when recording completes.
3. Handle transcription callbacks with one idempotent update path.
4. Prevent duplicate or regressive transcription updates.
5. Ensure playback does not depend on transcription.
6. Ensure thread reads recording + transcript from artifact.
7. Support inbound and outbound voicemail.

## Do not
- redesign state machine
- change persistence model
- implement UI behavior
- add SIP or retry logic

## Verification
Run:
- rg transcription_status
- rg handleVoicemailTranscription
- rg recording_url threadTimeline

## Stop condition
- transcription fully wired end-to-end
- artifact is source of truth
- duplicate callbacks safe
- playback works without transcript

## Commit
feat(connectshyft): complete voicemail transcription flow and artifact-backed rendering inputs
