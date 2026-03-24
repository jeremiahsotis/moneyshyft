You are implementing **Checkpoint 6 — Notification + Unread/Seen/Reviewed Behavior**.

## Objective
Implement correct inbound vs outbound voicemail notification and acknowledgment behavior.

## Requirements
1. Add seen_at_utc and reviewed_at_utc to voicemail artifact.
2. Inbound voicemail:
   - triggers notification
   - starts unread
3. Outbound voicemail:
   - never triggers notification
   - always marked seen/reviewed
4. Thread open marks inbound voicemail as seen.
5. Add markVoicemailReviewed service or fallback behavior.
6. Ensure notification is idempotent.

## Do not
- redesign notification system
- modify UI components
- change persistence model
- change webhook handling

## Stop condition
- inbound voicemail triggers one notification
- outbound voicemail never unread
- thread open marks seen correctly
- no duplicate notifications from replay events

## Commit
feat(connectshyft): implement voicemail notification and acknowledgment behavior
