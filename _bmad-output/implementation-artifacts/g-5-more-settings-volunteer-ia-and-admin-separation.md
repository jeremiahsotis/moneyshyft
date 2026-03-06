# Story g.5: More/Settings Volunteer IA and Admin Separation

Status: ready-for-dev

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
- Real-User Validation Evidence: N/A - ready-for-dev planning artifact.
- Real-User Validation Result: n/a
- Role-Admin UI Path: `/app/connectshyft/settings/availability`, `/app/connectshyft/settings/numbers`, `/app/connectshyft/settings/escalation` (authorized admin roles only).
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: N/A (this story is access-control related by definition).

## Tasks / Subtasks

- [ ] Rebuild More/Settings IA for volunteer-first navigation (AC: 1, 4)
  - [ ] Promote volunteer actions (Directory, personal settings, sign-out) to top-level IA.
  - [ ] Remove implicit admin-first ordering in primary More surface.
- [ ] Enforce explicit admin separation and role-gating (AC: 2, 3)
  - [ ] Route admin-only configuration to separate admin path and gate by capability/role.
  - [ ] Ensure unauthorized attempts return refusal-style messaging without leaking privileged controls.
- [ ] Align router + nav behavior with role-aware IA (AC: 1, 2, 3)
  - [ ] Keep bottom-nav/route highlighting consistent when admin settings are visited by authorized users.
  - [ ] Ensure volunteer role defaults never land on admin configuration pages.
- [ ] Harden responsive and accessibility behavior (AC: 4)
  - [ ] Maintain readable IA groupings and large tap targets across breakpoints.
  - [ ] Keep plain-language labels and avoid internal RBAC jargon in volunteer-primary copy.

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
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Volunteer IA and admin IA must remain separate by default; do not mix privileged configuration controls into volunteer-primary surfaces.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story g-5-more-settings-volunteer-ia-and-admin-separation`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md`
- `apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `apps/moneyshyft-web/src/router/index.ts`
- `apps/moneyshyft-web/src/components/connectshyft/ConnectShyftPrimaryNav.vue`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cat _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `cat _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-06.md`
- `cat apps/moneyshyft-web/src/views/ConnectShyft/ConnectShyftMoreView.vue`
- `cat apps/moneyshyft-web/src/router/index.ts`
- `rg -n "connectshyft.*settings|moduleGate|requiresTenantAdmin|requiresSystemAdmin" apps/moneyshyft-web/src/router/index.ts`

### Completion Notes List

- Created Story g.5 ready-for-dev context with volunteer-first IA requirements and explicit admin path/role-gating guardrails.

### File List

- _bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md

## Change Log

- 2026-03-06: Created Story g.5 ready-for-dev context document.
