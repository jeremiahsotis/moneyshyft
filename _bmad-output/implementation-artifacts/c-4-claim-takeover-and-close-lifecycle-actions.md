# Story c.4: Claim, Takeover, and Close Lifecycle Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit operator,
I want claim/takeover/close actions to enforce canonical transitions and ownership governance,
so that lifecycle actions remain predictable and auditable.

## Acceptance Criteria

1. Given an authorized lifecycle action request (`claim`, `takeover`, `close`), when transition rules execute, then only valid canonical state transitions are allowed and ownership changes are enforced by policy.
2. Given successful lifecycle transitions, when side effects persist, then audit/outbox records include actor, orgUnit, prior state, and new state.
3. Given a thread is `CLOSED`, when outbound call tap or outbound message tap is initiated, then the same thread reopens as `UNCLAIMED` (no new thread creation), emits `thread_reopened_by_user`, and applies locked escalation/inactivity reset behavior.
4. Given a thread is `CLOSED`, when inbound voice or fallback intake events arrive, then the thread does not auto-reopen and fallback routing/timeline behavior follows locked rules.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Lifecycle actions are operator-critical and must present explicit action-state feedback without silent transition failure.
- Real-User Validation Evidence: Automated operator-flow validation completed with `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts`, `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts`, and `npm run test:e2e -- tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.spec.ts` covering claim/takeover/close lifecycle actions, closed-thread reopen behavior, inbound closed-thread fallback routing, and refusal contracts.
- Real-User Validation Result: pass
- Role-Admin UI Path: Assign roles/memberships via `/app/tenant/settings/admins`, then verify lifecycle action availability and refusal behavior from `/app/connectshyft/inbox` and thread detail for claim/takeover/close.
- Role-Admin UI Path Verified: yes
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [x] Implement canonical claim/takeover/close transitions (AC: 1, 2)
  - [x] Enforce transition matrix and ownership policy in service layer.
  - [x] Refuse invalid transitions with deterministic refusal envelopes.
- [x] Implement lifecycle audit/outbox side effects (AC: 2)
  - [x] Emit transition audit/outbox events with actor and orgUnit provenance.
  - [x] Ensure mutation + outbox writes are transactionally coupled.
- [x] Implement `CLOSED` outbound reopen semantics (AC: 3)
  - [x] Reopen same thread id as `UNCLAIMED` before outbound execution.
  - [x] Emit `thread_reopened_by_user` and reset escalation/inactivity fields per locked behavior.
- [x] Enforce inbound-to-closed no-auto-reopen rules (AC: 4)
  - [x] Keep inbound voice/fallback handling from auto-reopening closed threads.
  - [x] Ensure timeline/audit events are still captured for fallback outcomes.
- [x] Add lifecycle and policy matrix coverage (AC: 1, 2, 3, 4)
  - [x] API tests for valid/invalid transition matrix and ownership gating.
  - [x] API tests for reopen-on-outbound + no-reopen-on-inbound behavior.
  - [x] E2E tests for state-specific action behavior and operator messaging.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-013, FR-CS-015.
- FR traceability note: FR-CS-024 ownership remains in Epic d Story d.3; c.4 must preserve lifecycle transition metadata required by downstream audit/outbox integration.
- NFR alignment: NFR-CS-004, NFR-CS-010.
- Story dependencies: `c.2`, `c.3`.
- Locked behavior priority: follow approved cross-epic UX remediation semantics for closed-thread outbound reopen behavior.

### Architecture Compliance

- Canonical lifecycle states and transitions must remain explicit and auditable.
- Keep policy checks at endpoint and service boundaries.
- Where historical architecture text conflicts with approved hardening (closed-thread outbound behavior), follow the approved sprint change proposal and Epic C story lock.

### Library / Framework Requirements

- Reuse capability policy helpers and existing ConnectShyft transition service patterns.
- Reuse transaction wrapper + outbox mutation patterns.
- Reuse shared refusal envelope helpers; avoid endpoint-local response contracts.

### File Structure Requirements

- Lifecycle routes in `src/src/routes/api/v1/connectshyft.ts`.
- Transition logic in `src/src/modules/connectshyft/`.
- Inbound/fallback interaction updates where webhook and routing services touch closed-thread logic.
- Tests in `tests/api/platform/` and `tests/e2e/platform/`.

### Testing Requirements

- Transition matrix tests for claim/takeover/close validity and permission-gated behavior.
- Capability matrix tests for role outcomes on claim/takeover/close (`TENANT_VIEWER` refused; `ORGUNIT_MEMBER` claim/close allowed; `ORGUNIT_ADMIN` claim/takeover/close allowed; tenant-privileged takeover path preserved).
- Reopen tests for `POST /threads/:id/call` and `POST /threads/:id/messages` from `CLOSED` state.
- Negative tests ensuring inbound voice/fallback does not reopen `CLOSED`.
- Audit/outbox verification for all successful state transitions.

### Previous Story Intelligence

- `c.3` read/action contracts must remain aligned with lifecycle state behavior introduced here.
- Downstream outbound stories (`d.1`, `d.2`, `d.4`) depend on these transitions and reopen semantics.

### Git Intelligence Summary

- Existing governance stories reinforce deterministic refusal behavior and auditable transitions; this story must not introduce silent state mutation paths.

### Latest Technical Information

- Use locked UX behavior and sprint change proposal as authoritative for closed-thread action semantics.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md`

### Story Completion Status

- Lifecycle action implementation completed, review findings remediated, and story moved to done.

### Project Structure Notes

- Keep lifecycle transitions centralized to avoid drift between API routes and webhook side effects.
- Explicitly encode and test reopened-thread semantics before outbound execution.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-4-claim-takeover-and-close-lifecycle-actions`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.4)
- `_bmad-output/planning-artifacts/connectshyft-sprint-change-proposal-2026-02-24.md` (section 4.1.2 hardening)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (canonical lifecycle, audit/outbox, endpoint map)
- `_bmad-output/planning-artifacts/UX - UI Redesign/connectshyft-implementation-locked-production-specification.normalized.md` (closed-state action semantics)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-013, FR-CS-015)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story c-4-claim-takeover-and-close-lifecycle-actions`
- `cd src && npm test -- src/modules/connectshyft/__tests__/threads.test.ts` (pass)
- `cd src && npm run build` (pass)
- `cd frontend && npm run build` (pass)
- `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts` (initial run failed due UUID cast on synthetic IDs; fixed)
- `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts` (pass, 12/12)
- `npm run test:e2e -- tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.spec.ts tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.spec.ts` (pass, 10/10)
- `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts` (pass, 9/9)
- `npm run test:e2e -- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts` (pass, 5/5)
- `npm run test:e2e -- tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.spec.ts` (pass, 7/7)

### Completion Notes List

- Added ConnectShyft lifecycle policy evaluation in service layer with canonical `claim`, `takeover`, `close` matrix enforcement and ownership gating.
- Extended backend thread contracts and synthetic read seed data for c.4 with claimed owner metadata and lifecycle state context used by API and UI tests.
- Implemented lifecycle endpoints and state transitions in ConnectShyft API routes:
  - `POST /threads/:threadId/claim`
  - `POST /threads/:threadId/takeover`
  - `POST /threads/:threadId/close`
  - `POST /threads/:threadId/call`
  - `POST /threads/:threadId/messages`
  - `POST /webhooks/inbound`
- Added closed-thread outbound reopen semantics (`thread_reopened_by_user`) and locked inbound behavior that preserves `CLOSED` state for voice/fallback events.
- Updated Thread Detail frontend to render lifecycle-aware controls, deterministic refusal messaging, close confirmation modal, and reopened-thread feedback chips/toast.
- Enabled and expanded c.4 API and E2E automation suites (ATDD + automate), and added direct unit coverage for lifecycle policy decisions.
- Resolved all six c.4 review findings: reopened stage reset to `0` (route/UI/store), DB lifecycle transition stage reset parity, transactional coupling for transition+event persistence when DB scope is eligible, deterministic not-found refusal for unknown threads, closed-thread inbound voice/fallback fallback routing behavior, and expanded automate API/E2E regression coverage.
- Reconciled story tracking metadata with implementation state by marking c.4 as `done` and syncing sprint status.

### File List

- _bmad-output/implementation-artifacts/c-4-claim-takeover-and-close-lifecycle-actions.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/threads.ts
- src/src/modules/connectshyft/__tests__/threads.test.ts
- src/src/routes/api/v1/connectshyft.ts
- frontend/src/features/connectshyft/readContracts.ts
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.api.spec.ts
- tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.api.spec.ts
- tests/e2e/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.spec.ts
- tests/e2e/platform/b-2-shared-tenant-identity-and-shared-phone-indicators.spec.ts
- tests/e2e/platform/c-3-inbox-and-thread-detail-read-contracts.spec.ts
- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.api.spec.ts
- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts
- tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.atdd.spec.ts
- tests/e2e/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.spec.ts
- tests/support/factories/connectShyftStoryA1Factory.ts
- tests/support/factories/connectShyftStoryA2Factory.ts
- tests/support/factories/connectShyftStoryC4Factory.ts
- tests/support/helpers/connectShyftDbActor.ts
- tests/support/fixtures/connectShyftStoryC4.fixture.ts

## Change Log

- 2026-02-24: Created Story c.4 ready-for-dev context document.
- 2026-02-25: Implemented c.4 lifecycle actions and policy enforcement across backend and thread-detail UI, enabled c.4 API/E2E suites, and moved story status to review.
- 2026-02-25: Completed c.4 review remediation (6 findings), validated updated API/E2E coverage, and advanced story status to done.
