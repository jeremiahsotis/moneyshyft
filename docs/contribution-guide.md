# Contribution Guide

## Code Organization Rules
- Backend code in `src/src`.
- Frontend code in `frontend/src`.
- Route files under `src/src/routes/api/v1`.
- Validators under `src/src/validators`.
- Migrations in `src/src/migrations`.

## Style Expectations
- TypeScript throughout backend and frontend.
- Follow existing style (2-space indentation).
- Keep changes minimal, coherent, and aligned with existing project patterns.

## Testing Expectations
- Backend: run `npm test` in `src/` for server-side changes.
- Frontend: no dedicated runner configured; include manual test notes for UI changes.

## Commit Message Style
- Prefer concise type prefixes: `Fix:`, `Docs:`, `chore:`.
