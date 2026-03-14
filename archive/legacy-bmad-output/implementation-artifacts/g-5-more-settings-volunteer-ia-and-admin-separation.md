# Story g.5: More/Settings Volunteer IA and Admin Separation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a volunteer,
I want More/Settings to focus on volunteer tools,
so that operational/admin configuration does not distract from communication work.

## Acceptance Criteria

1. Given volunteer users open More/Settings, when IA options are rendered, then primary options are volunteer-facing (`Directory`, `Settings`, notification/display preferences, `Sign Out`).
2. Given admin controls exist (availability, number mappings, escalation configuration), when volunteer users browse More/Settings, then admin controls are role-gated or routed to explicit admin paths outside primary volunteer IA.
3. Given role and scope context changes, when navigation state is refreshed, then admin pathways are consistently shown only to authorized roles and denied paths return refusal-style guidance.
4. Given mobile/tablet/desktop breakpoints are used, when More/Settings surfaces render, then volunteer-first IA remains clear and stable without mixed admin clutter.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: IA and role-gating are usability and safety controls; volunteers must not be routed into privileged admin surfaces.
- Real-User Validation Evidence: 2026-03-07 ATDD validation run (`npm run test:e2e -- tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`) confirmed volunteer and admin route behavior, refusal guidance, keyboard traversal, and responsive IA rendering.
- Real-User Validation Result: pass
- Role-Admin UI Path: `/app/connectshyft/settings/availability`, `/app/connectshyft/settings/numbers`, `/app/connectshyft/settings/escalation` (authorized admin roles only).
- Role-Admin UI Path Verified: yes (validated by `G5-ATDD-E2E-003`, `G5-ATDD-E2E-004`, `G5-ATDD-API-004`, and `G5-ATDD-API-005`).
- Access-Control Exemption Rationale: N/A (this story is access-control related by definition).

## Tasks / Subtasks

- [x] Rebuild More/Settings IA for volunteer-first navigation (AC: 1, 4)
  - [x] Promote volunteer actions (Directory, personal settings, sign-out) to top-level IA.
  - [x] Remove implicit admin-first ordering in primary More surface.
- [x] Enforce explicit admin separation and role-gating (AC: 2, 3)
  - [x] Route admin-only configuration to separate admin path and gate by capability/role.
  - [x] Ensure unauthorized attempts return refusal-style messaging without leaking privileged controls.
- [x] Align router + nav behavior with role-aware IA (AC: 1, 2, 3)
  - [x] Keep bottom-nav/route highlighting consistent when admin settings are visited by authorized users.
  - [x] Ensure volunteer role defaults never land on admin configuration pages.
- [x] Harden responsive and accessibility behavior (AC: 4)
  - [x] Maintain readable IA groupings and large tap targets across breakpoints.
  - [x] Keep plain-language labels and avoid internal RBAC jargon in volunteer-primary copy.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Align volunteer Settings card destination with ConnectShyft IA path (`/app/connectshyft/settings`) to prevent MoneyShyft-route divergence for ConnectShyft-only users. [apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue]
- [x] [AI-Review][MEDIUM] Strip transient refusal query keys (`settingsRefusal`, `settingsRefusedPath`) from bottom-nav targets to avoid stale refusal context bleed across unrelated views. [apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue]
- [x] [AI-Review][MEDIUM] Expand Story g.5 E2E coverage to assert keyboard traversal and screen-reader label contracts for volunteer More/Settings primary actions. [tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts]
- [x] [AI-Review][HIGH] Record guardrail evidence/results for critical + access-control closure checks and verify role-admin path evidence links. [_bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md]

## Dev Notes

### Technical Requirements

- Tracking ID: CS-S7.5.
- FR alignment: FR-CS-001, FR-CS-002, FR-CS-003.
- Depends on `g-2-inbox-and-mine-surface-rebuild`.

### Architecture Compliance

- Keep tenant/orgUnit scope enforcement and capability checks server-side and router-enforced.
- Preserve explicit admin path separation to prevent accidental volunteer access to provisioning/config controls.
- Maintain refusal envelope behavior for unauthorized access attempts.

### Library / Framework Requirements

- Reuse route meta guards and access store checks in router and connected views.
- Keep copy sanitization and accessibility locks from `uiContracts.ts`.
- Use existing ConnectShyft navigation component patterns for consistency.

### File Structure Requirements

- Primary files:
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
  - `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`
  - `apps/moneyshyft-web/src/router/index.ts`
  - `apps/moneyshyft-web/src/stores/access.ts`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftAvailabilityView.vue`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNumberMappingsView.vue`
  - `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftEscalationSettingsView.vue`

### Testing Requirements

- Add role-matrix navigation tests for volunteer vs admin visibility and path access.
- Validate refusal behavior for unauthorized deep links to admin settings routes.
- Validate responsive IA layout and keyboard/screen-reader navigation across More/Settings options.

### Previous Story Intelligence

- Existing More view currently links directly to admin-heavy settings, creating IA drift from volunteer-first product posture.
- Sprint change proposal (2026-03-06) explicitly requires volunteer/admin IA separation for CS-E7 closure.

### Git Intelligence Summary

- Router already has module gating and admin meta guard patterns that should be reused.
- Existing bottom-nav active-state logic already treats `/app/connectshyft/settings` as More; extend this behavior with clearer role separation.

### Latest Technical Information

- Existing frontend route guard architecture in this workspace is sufficient; story is a contract and IA restructuring task rather than dependency migration.

### Project Context Reference

- `_bmad-output/project-context.md`
- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic g / Story g.5)
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Volunteer IA and admin IA must remain separate by default; do not mix privileged configuration controls into volunteer-primary surfaces.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-5-more-settings-volunteer-ia-and-admin-separation`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `apps/moneyshyft-web/src/router/index.ts`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `cat _bmad-output/planning-artifacts/sprint-change-proposal-connectshyft-2026-03-06.md`
- `cat apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `cat apps/moneyshyft-web/src/router/index.ts`
- `rg -n "connectshyft.*settings|moduleGate|requiresTenantAdmin|requiresSystemAdmin" apps/moneyshyft-web/src/router/index.ts`
- `npm run branch:ensure-workflow -- --workflow dev-story --story g-5-more-settings-volunteer-ia-and-admin-separation`
- `npm run test:e2e -- tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`
- `npm run test`

### Completion Notes List

- Implemented volunteer-first More/Settings IA with explicit volunteer options (`Directory`, `Settings`, notification/display preference stubs, `Sign Out`) and removed admin-first ordering from the primary surface.
- Added explicit admin-path separation and role/capability gating in router and backend for settings navigation/availability, with refusal-style guidance redirects for unauthorized admin path attempts.
- Added role-aware test hooks and navigation state markers (`connectshyft-primary-nav-more-active`, admin context chip IDs, settings refusal guidance ID, responsive layout IDs) across More and admin settings views.
- Enabled and passed Story g.5 ATDD API/E2E tests and full repository regression suite (`npm run test`).
- Fixed review findings by routing Settings to ConnectShyft IA, stripping transient refusal query keys from primary nav links, adding keyboard/screen-reader regression coverage, and recording guardrail validation evidence.

### File List

- apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts
- apps/moneyshyft-web/src/features/connectshyft/settingsAccess.ts
- apps/moneyshyft-web/src/router/index.ts
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue
- apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftAvailabilityView.vue
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftNumberMappingsView.vue
- apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftEscalationSettingsView.vue
- tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts
- tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts
- _bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md

## Change Log

- 2026-03-06: Created Story g.5 ready-for-dev context document.
- 2026-03-07: Implemented volunteer-first More/Settings IA, admin path separation and refusal guidance, role-aware router/nav behavior, responsive/accessibility hardening, and enabled passing g.5 ATDD API/E2E coverage.
- 2026-03-07: Resolved senior-review findings for Settings path alignment, refusal-query persistence cleanup, keyboard/screen-reader test coverage, and operability guardrail evidence verification.
