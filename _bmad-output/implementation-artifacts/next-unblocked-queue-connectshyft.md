# ConnectShyft Next Unblocked Queue

Generated: 2026-02-26
Focus: Close b-3 review and unlock b-4 start

## Immediate Queue

1. `b-3-relationship-gated-neighbor-edits-with-provenance-audit`
   - Status: `review`
   - Next action: final closeout transition to `done`
2. `b-4-role-restricted-neighbor-merge-with-irreversible-confirmation`
   - Status: `ready-for-dev`
   - Dependency status: `b-3-relationship-gated-neighbor-edits-with-provenance-audit: review` (start only after `done`)

## Notes

- Keep `development_status` values constrained to:
  - `backlog`, `ready-for-dev`, `in-progress`, `review`, `done`
- Track temporary blocked states under `blocked_story_registry` in sprint status.
