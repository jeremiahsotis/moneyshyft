# ConnectShyft Next Unblocked Queue

Generated: 2026-02-26
Focus: Resume lane-b implementation after dependency gate clear

## Immediate Queue

1. `b-3-relationship-gated-neighbor-edits-with-provenance-audit`
   - Status: `in-progress`
   - Gate: cleared (`c-3-inbox-and-thread-detail-read-contracts: done`)
2. `b-4-role-restricted-neighbor-merge-with-irreversible-confirmation`
   - Status: `ready-for-dev`
   - Depends on: `b-3-relationship-gated-neighbor-edits-with-provenance-audit`

## Notes

- Keep `development_status` values constrained to:
  - `backlog`, `ready-for-dev`, `in-progress`, `review`, `done`
- Track temporary blocked states under `blocked_story_registry` in sprint status.
