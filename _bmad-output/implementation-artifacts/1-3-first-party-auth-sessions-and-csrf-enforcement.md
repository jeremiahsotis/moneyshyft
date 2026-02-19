# Story 1.3: First-Party Auth, Sessions, and CSRF Enforcement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want first-party session rotation and CSRF protection across app/api domains,
so that authentication is resilient and state-changing routes are protected.

## Acceptance Criteria

1. Given a user authenticates, when refresh token rotation occurs, then session records are persisted and revocation is supported.
2. State-changing routes fail without valid CSRF token.

## Tasks / Subtasks

- [ ] Implement acceptance criterion 1 (AC: 1)
  - [ ] Ensure refresh token rotation persists session state with revocation metadata support.
  - [ ] Enforce token invalidation/revocation behavior for compromised or expired sessions.
  - [ ] Maintain secure cookie posture for app/api parent-domain topology.
- [ ] Implement acceptance criterion 2 (AC: 2)
  - [ ] Apply CSRF middleware to all authenticated state-changing routes.
  - [ ] Ensure missing/invalid token paths fail deterministically with standardized refusal/error contract.
  - [ ] Add API coverage for allowed/denied CSRF scenarios.

## Dev Notes

### Story Intent

This story hardens authentication and request integrity guarantees before broader module expansion.

### Technical Requirements

- Session persistence must support refresh rotation and explicit revocation.
- No plaintext sensitive tokens in logs or event payloads.
- CSRF must be enforced for state-changing methods in authenticated contexts.
- Cookie settings must remain secure and environment-aware.

### Architecture Compliance

- Keep auth/session and CSRF concerns in platform/kernel-level middleware and services.
- Preserve shared response envelope behavior for auth failures/refusals.
- Avoid route-by-route bespoke CSRF behavior.

### Library / Framework Requirements

- Use `jsonwebtoken`, `cookie-parser`, Express middleware chain, and current platform auth utilities.
- Maintain TypeScript strict typing for auth/session context models.

### File Structure Requirements

- Auth/session logic: `src/src/platform/sessions/*` and related platform auth utilities.
- API handlers: `src/src/routes/api/v1/auth.ts` plus impacted protected route files.
- Middleware: `src/src/platform/middleware/*`.
- Tests: existing platform auth/csrf API and E2E suites.

### Testing Requirements

- Positive and negative tests for refresh rotation lifecycle.
- Revocation tests for revoked/stale sessions.
- CSRF-required route tests:
  - missing token -> fail,
  - invalid token -> fail,
  - valid token -> pass.
- Ensure cross-domain cookie+csrf handling is covered in regression tests.

### Previous Story Intelligence

- Build on Story 1.1/1.2 context and entitlement foundations so auth-protected routes also remain tenant-safe.

### Git Intelligence Summary

- Prior hardening work in Epic 0 already established kernel auth/session patterns; extend those utilities rather than duplicating.

### Latest Tech Information

- Backend uses `jsonwebtoken ^9.0.2`; session logic should align with current major semantics.
- No library major upgrades in this story; prioritize secure usage patterns within pinned versions.

### Project Context Reference

- Follow project-context rules on first-party auth hardening, CSRF on state changes, and secure cookie behavior.

### Project Structure Notes

- Keep auth, csrf, and session concerns centralized to preserve consistent enforcement and testability.

### References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/project-context.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/1-2-tenant-and-module-entitlement-administration.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story preparation only; implementation logs pending.

### Completion Notes List

- Story context prepared with auth/session/csrf hardening requirements.

### File List

- _bmad-output/implementation-artifacts/1-3-first-party-auth-sessions-and-csrf-enforcement.md
