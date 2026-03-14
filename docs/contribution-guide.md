# Contribution Guide

## Code Organization Rules
- Backend code in `apps/routeshyft-api/src`.
- Frontend code in `apps/routeshyft-web/src`.
- Route files under `apps/routeshyft-api/src/routes/api/v1`.
- Validators under `apps/routeshyft-api/src/validators`.
- Migrations in `apps/routeshyft-api/src/migrations`.

## Style Expectations
- TypeScript throughout backend and frontend.
- Follow existing style (2-space indentation).
- Keep changes minimal, coherent, and aligned with existing project patterns.

## Testing Expectations
- Backend: run `npm test` in `apps/routeshyft-api/` for server-side changes.
- Frontend: no dedicated runner configured; include manual test notes for UI changes.

## Commit Message Style
- Prefer concise type prefixes: `Fix:`, `Docs:`, `chore:`.
