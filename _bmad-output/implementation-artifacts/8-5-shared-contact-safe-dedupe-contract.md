# Story 8.5: Shared-Contact-Safe Dedupe Contract

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want shared-contact-safe dedupe rules for identity matching,
so that auto-merge behavior avoids identity corruption and escalates ambiguous cases for manual resolution.

## Acceptance Criteria

1. Auto-merge is allowed only for verified, non-shared exact contact-point matches.
2. Shared or unverified contact points never auto-merge identities.
3. Ambiguous matches return deterministic refusal/error code `IDENTITY_MATCH_AMBIGUOUS` with manual-resolution context.
4. Identity dedupe decision paths are audited and test-covered for shared/unverified edge cases.
5. Existing explicit/manual merge workflows remain intact and compatible with the new dedupe contract.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Operator workflows require explicit ambiguity outcomes and manual-resolution guidance.
- Real-User Validation Evidence: Manual validation notes required before closeout
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Identity governance scope, but no role-admin UI path change in this story.

## Tasks / Subtasks

- [x] Define and codify dedupe decision matrix (AC: 1, 2, 3)
  - [x] Implement verified/non-shared auto-merge eligibility rules.
  - [x] Implement explicit ambiguous/no-auto-merge outcomes for shared or unverified points.
- [x] Wire deterministic refusal/error contract (AC: 3)
  - [x] Return `IDENTITY_MATCH_AMBIGUOUS` with actionable metadata for manual handling.
  - [x] Preserve existing manual-merge paths.
- [x] Add observability and audit hooks (AC: 4)
  - [x] Persist audit/event records for dedupe decisions and ambiguous outcomes.
  - [x] Ensure logs avoid leaking sensitive identity data.
- [x] Add automated and manual validation (AC: 4, 5)
  - [x] Add tests for shared/unverified/verified contact-point permutations.
  - [x] Document operator manual test steps for ambiguity resolution flow.

## Dev Notes

### Story Intent

Introduce a safe dedupe contract that supports real-world shared-contact scenarios without unsafe auto-merges.

### Technical Requirements

- Keep dedupe deterministic and idempotent.
- Avoid implicit merge side effects on ambiguous signals.
- Keep existing explicit merge workflow as the authoritative conflict-resolution path.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change C1.
- Respect existing neighbor/shared-phone governance in ConnectShyft implementation.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/b-2-shared-tenant-identity-and-shared-phone-indicators.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/implementation-artifacts/b-4-role-restricted-neighbor-merge-with-irreversible-confirmation.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story 8-5-shared-contact-safe-dedupe-contract`
- `npm run build` (cwd: `apps/routeshyft-api`)
- `npm test` (cwd: `apps/routeshyft-api`)
- `npm run policy:check` (repo root)
- `npx nx run routeshyft-api:lint` (repo root)

### Completion Notes List

- Implemented identity-dedupe decision matrix in ConnectShyft neighbor services with deterministic outcomes for `AUTO_MERGE_ALLOWED`, `NO_AUTO_MERGE`, and `AMBIGUOUS`.
- Added refusal contract support for `IDENTITY_MATCH_AMBIGUOUS` including structured `manualResolution` metadata and candidate neighbor context.
- Added `POST /api/v1/connectshyft/neighbors/identity-match` to evaluate dedupe decisions without changing existing manual merge flow.
- Added identity-match observability side-effects with masked and hashed contact-point fields to avoid raw contact-value exposure in event payloads.
- Preserved existing explicit/manual merge endpoint contract (`/api/v1/connectshyft/neighbors/merge`) and compatible behavior.
- Added automated coverage for verified/non-shared auto-merge eligibility, shared/unverified no-auto-merge behavior, and deterministic ambiguous multi-match refusal paths.
- Updated Jest/TypeScript module resolution config in `apps/routeshyft-api` to keep symlinked lane tests/builds working without local `apps/connectshyft-api/node_modules` symlink workarounds.
- Operator manual validation steps:
  - Call `POST /api/v1/connectshyft/neighbors/identity-match` with a verified, non-shared exact match and verify `CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED`.
  - Call the same endpoint with shared or unverified contact points and verify `CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE`.
  - Seed duplicate exact contact-point matches across multiple neighbors and verify refusal `IDENTITY_MATCH_AMBIGUOUS` with `manualResolution.nextAction=manual-merge` and `mergeEndpoint=/api/v1/connectshyft/neighbors/merge`.

### File List

- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` (modified)
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts` (modified)
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/neighbors.test.ts` (modified)
- `apps/routeshyft-api/src/__tests__/connectshyft.identity-dedupe.test.ts` (added)
- `apps/routeshyft-api/jest.config.js` (modified)
- `apps/routeshyft-api/tsconfig.json` (modified)

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change C1).
- 2026-03-04: Implemented shared-contact-safe dedupe decision matrix, deterministic ambiguous refusal contract, and identity-match API evaluation endpoint.
- 2026-03-04: Added audit/observability payload support for identity dedupe decisions with masked/hash contact-point safety controls.
- 2026-03-04: Added automated tests for shared/unverified/verified/ambiguous dedupe decision paths and updated route/module coverage.
- 2026-03-04: Updated `apps/routeshyft-api` Jest/TypeScript module resolution settings for symlinked ConnectShyft lane compatibility.
