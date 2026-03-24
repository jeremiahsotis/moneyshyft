You are implementing **Checkpoint 5 — Timeline Deduplication and Artifact-First Rendering**.

## Objective
Ensure voicemail appears exactly once in thread timeline using artifact-first rendering.

## Requirements
1. Artifact is primary render source.
2. Bridge fallback used only if artifact missing.
3. Deduplicate using stable key.
4. Artifact replaces fallback.
5. Render direction correctly (inbound/outbound).

## Do not
- change persistence
- change unread logic
- add UI features

## Stop condition
- no duplicate voicemail entries
- artifact-first rendering enforced

## Commit
feat(connectshyft): enforce artifact-first voicemail rendering and timeline deduplication
