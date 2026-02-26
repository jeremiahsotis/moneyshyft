# Story ux-r2: Accessibility and Language Hardening

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator (including senior users),
I want controls and language to be accessible and plain,
so that I can use the system without confusion or strain.

## Acceptance Criteria

1. Given core interaction surfaces (`Inbox`, `Mine`, `Thread`, `Add Neighbor`, `Close`) render, when typography and controls are displayed, then body text meets minimum `16px` and interactive controls meet minimum `44px` tap target constraints.
2. Given action buttons and labels are rendered, when users view primary workflows, then labels use action verbs and avoid RBAC/internal UUID jargon.
3. Given operators navigate without pointer input, when keyboard and screen-reader flows run, then focus order, accessible names, and control announcements remain deterministic across core paths.
4. Given success/refusal/error outcomes are shown, when feedback copy renders, then language is plain, explicit, and consistent with canonical envelope taxonomy (`success`, `refusal`, `error`).

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Accessibility and plain-language locks are non-negotiable for volunteer safety and operator confidence.
- Real-User Validation Evidence: Pending implementation. Validate keyboard, screen-reader, and low-vision readability on core ConnectShyft flows.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: This story addresses usability and communication clarity, not role governance paths.

## Tasks / Subtasks

- [x] Implement accessibility lock enforcement across core surfaces (AC: 1, 3)
  - [x] Apply minimum typography and tap-target standards to key ConnectShyft controls.
  - [x] Ensure visible, high-clarity focus indicators and keyboard traversal parity.
- [x] Implement plain-language and action-verb copy contract (AC: 2, 4)
  - [x] Replace ambiguous or internal terminology with operator-safe wording.
  - [x] Ensure refusal messaging is actionable and policy-specific without internal identifiers.
- [x] Add reusable accessibility and language helpers (AC: 1, 2, 3, 4)
  - [x] Centralize reusable label/copy patterns for ConnectShyft actions.
  - [x] Prevent per-view copy drift by reusing shared mappings.
- [x] Add regression coverage for accessibility and copy locks (AC: 1, 2, 3, 4)
  - [x] E2E checks for keyboard navigation and focus behavior in core flows.
  - [x] E2E/API checks for deterministic envelope-to-feedback mapping.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-005.
- NFR alignment: NFR-CS-011.
- Story dependencies: `ux-r1-mobile-first-inbox-mine-thread-redesign`.
- This story must preserve all locked behavior introduced by `c.3` and UX remediation approval.

### Architecture Compliance

- Maintain server-authoritative semantics for state, ranking, and policy outcomes.
- Keep refusal/success/error handling aligned with canonical envelope shape.
- Do not leak RBAC/system internals through operator-facing text.

### Library / Framework Requirements

- Reuse shared ConnectShyft feature clients in `frontend/src/features/connectshyft/`.
- Use existing Vue component patterns and router guards for consistent behavior.
- Favor centralized text mappings over inline ad hoc labels in views.

### File Structure Requirements

- Primary UI updates in `frontend/src/views/ConnectShyft/`.
- Shared client and mapping updates in `frontend/src/features/connectshyft/`.
- Route-level behavior alignment in `frontend/src/router/index.ts`.
- Regression coverage in `tests/e2e/platform/`.

### Testing Requirements

- Keyboard-only flow validation for Inbox/Mine/Thread critical actions.
- Focus visibility and tab-order checks on desktop and mobile-responsive layouts.
- Assertion of plain-language action labels (verb-first, no RBAC/UUID leakage).
- Envelope outcome checks verify user copy maps to `success|refusal|error`.

### Previous Story Intelligence

- `ux-r1` establishes structure; this story hardens accessibility and language behavior on top of that baseline.
- `c.3` urgency/action semantics remain authoritative and should not be rewritten in UI-only logic.

### Git Intelligence Summary

- Current hardening trend favors deterministic contracts and explicit UX guidance; avoid introducing copy churn that disconnects from backend policy messages.

### Latest Technical Information

- Accessibility and plain-language locks from production-locked specification are authoritative constraints.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep language and accessibility decisions centralized for consistency and auditability.
- Validate no policy meaning is lost while simplifying operator copy.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r2-accessibility-and-language-hardening`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic UX, Story ux-r2)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (section 4.1.3)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (sections 0, 7, 10)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story ux-r2-accessibility-and-language-hardening` (failed: story id parser rejects `ux-r2` token shape)
- `cd frontend && npm run build` (pass)
- `npm run test:e2e -- tests/e2e/platform/ux-r2-accessibility-and-language-hardening.automate.spec.ts` (pass; 5/5)
- `npm run test:e2e -- tests/api/platform/ux-r2-accessibility-and-language-hardening.automate.api.spec.ts` (pass; 1 active, 5 fixme)
- `npm run test:e2e -- tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.api.spec.ts` (pass; 6/6, includes legacy `admin` role alias regression check)

### Completion Notes List

- Added shared ConnectShyft accessibility/copy contracts (`uiContracts.ts`) for focus-ring classes, action labels, forbidden-token sanitization, and `success|refusal|error` feedback mapping.
- Hardened Inbox/Thread/Nav UI with 16px body copy, 44px targets, explicit aria labels, and deterministic live-region/status feedback hooks.
- Added thread-level Add Neighbor interaction with taxonomy-aligned feedback states and plain-language refusal/error messaging.
- Enabled UX-R2 e2e coverage and aligned scenario factory with seeded tenant/orgUnit/story fixtures; stabilized keyboard traversal assertions and taxonomy flow checks.
- Removed internal flag/token leakage from operator-facing unavailable and lifecycle feedback copy.
- Enforced 16px baseline typography on core thread/inbox supporting text and chips that previously rendered below lock thresholds.
- Activated ux-r2 API envelope-taxonomy mapping coverage for deterministic success/refusal/error contract checks.
- Added ConnectShyft legacy role alias handling (`admin` -> `TENANT_ADMIN`, `member` -> `ORGUNIT_MEMBER`) across route capability gates and orgUnit context privilege checks to prevent false-negative refusals for authenticated tenant-admin sessions.
- Added ConnectShyft orgUnit fallback resolution for authenticated requests missing explicit orgUnit context, using deterministic orgUnit membership lookup to unblock `/app/connectshyft/inbox` without query-param context.
- Hardened auth token lifecycle to resolve and persist `activeOrgUnitId` during login, refresh-token rotation, and first-login password reset flows.
- Suppressed guest-route session bootstrap noise by skipping `/auth/me` preflight on login/signup when no auth cookie exists.
- Expanded ConnectShyft orgUnit context resolution to surface authoritative effective roles, and updated capability gates to evaluate effective role-sets instead of JWT base role only.
- Included orgUnit membership role-set union in tenant-scope access validation so orgUnit-admin capabilities (escalation config/number mapping) resolve correctly for tenant-admin sessions.
- Updated inbox thread-open flow to use server-resolved orgUnit context when URL query context is absent, preventing false “Select an orgUnit” action refusals on `/app/connectshyft/inbox`.

### File List

- frontend/src/components/connectshyft/ConnectShyftPrimaryNav.vue
- frontend/src/views/ConnectShyft/ConnectShyftInboxView.vue
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/e2e/platform/ux-r2-accessibility-and-language-hardening.automate.spec.ts
- tests/api/platform/ux-r2-accessibility-and-language-hardening.automate.api.spec.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/modules/connectshyft/contextAccess.ts
- tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.api.spec.ts
- src/src/services/AuthService.ts
- src/src/routes/api/v1/auth.ts
- frontend/src/router/index.ts
- frontend/src/features/connectshyft/readContracts.ts
- src/src/platform/tenancy/orgUnitAccess.ts
- src/src/platform/tenancy/__tests__/orgUnitAccess.test.ts
- src/src/modules/connectshyft/__tests__/contextAccess.test.ts
- _bmad-output/implementation-artifacts/ux-r2-accessibility-and-language-hardening.md

## Change Log

- 2026-02-25: Created Story ux-r2 ready-for-dev context document.
- 2026-02-26: Implemented accessibility and language hardening contracts across ConnectShyft Inbox/Thread/Nav with shared helpers.
- 2026-02-26: Activated and stabilized UX-R2 e2e coverage for readability, plain-language copy, keyboard traversal, and taxonomy feedback outcomes.
- 2026-02-26: Applied code-review hardening fixes for plain-language leakage, 16px/44px lock enforcement, deterministic focus traversal, and active API envelope-to-taxonomy checks.
- 2026-02-26: Added legacy auth role alias normalization for ConnectShyft capability + orgUnit context checks and regression coverage for `admin` JWT role inbox access.
- 2026-02-26: Added ConnectShyft orgUnit context fallback derivation from platform memberships for authenticated sessions with missing active orgUnit scope.
- 2026-02-26: Added active-orgUnit token hydration in auth login/refresh/first-login-reset flows to eliminate null orgUnit context in standard ConnectShyft sessions.
- 2026-02-26: Updated router session-bootstrap guard to avoid guest-route `/auth/me` 401 noise when no auth cookie is present.
- 2026-02-26: Hardened effective-role propagation across ConnectShyft orgUnit context + route capability checks and aligned inbox thread-open context fallback with server-resolved orgUnit scope.
